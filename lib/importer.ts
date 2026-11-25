import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';
import { inflateRawSync } from 'node:zlib';

export interface ImportOffer {
  title: string;
  conditions: string;
  review?: boolean;
  start?: string;
  end?: string;
}

export interface ImportRow {
  sheet: string;
  line: number;
  hidden: boolean;
  raw: Record<string, string>;
  name: string;
  address: string;
  category: string;
  phone: string;
  discount: string;
  notes: string;
  offers: ImportOffer[];
  issues: string[];
  declined: boolean;
}

const MAX_FILE = 3 * 1024 * 1024;
const MAX_XML = 16 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_COLS = 80;
const MAX_CELL = 12000;
type SourceRow = {
  number: number;
  cells: string[];
  issues: string[];
  hidden?: boolean;
  formulas?: Record<string, string>;
};
type Field = keyof typeof aliases;

const aliases = {
  name: [
    'empresa',
    'loja',
    'nome',
    'nome da loja',
    'estabelecimento',
    'nome fantasia',
    'razao social',
  ],
  address: ['endereco', 'enderco', 'endereco completo', 'logradouro'],
  category: ['categoria', 'categoria comercial', 'segmento'],
  phone: ['whatss', 'whatsapp', 'whats', 'telefone', 'fone', 'celular'],
  discount: [
    'desconto',
    'percentual',
    'oferta',
    'promocao',
    'titulo da oferta',
    'titulo da promocao',
  ],
  notes: ['obs', 'observacao', 'observacoes', 'descricao da promocao', 'descricao da oferta'],
  terms: ['condicoes', 'condicao', 'condicoes de utilizacao', 'condicoes da oferta', 'regulamento'],
  start: ['data de inicio', 'data inicio', 'inicio', 'validade inicial'],
  end: ['data de termino', 'data fim', 'fim', 'termino', 'validade final'],
};

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[.\s_]+/g, ' ')
    .trim();
const lines = (s: string) =>
  s
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean);
const joined = (...s: string[]) => s.filter(Boolean).join('\n');
const commercial = (s: string) =>
  /\d\s*%|r\$|\d[.,]\d\d\b|\bpague\b|\bbrinde\b|\bupgrade\b/i.test(s);

function offerList(discount: string, notes: string, issues: string[]): ImportOffer[] {
  const make = (title: string, conditions = ''): ImportOffer => ({
    title: title.trim(),
    conditions: conditions.trim(),
  });
  const parts = lines(notes);
  const rates = discount
    .split(/\r?\n|\s+e\s+(?=\d+(?:[.,]\d+)?\s*%)|,\s*(?=e nas demais peças)/i)
    .map((t) => t.replace(/^e (?=nas demais peças)/i, '').trim())
    .filter(Boolean);

  // A headline "Até N%" introducing a table of brands is a maximum, not an extra sale.
  if (
    /^ate\s+\d+%/i.test(fold(discount)) &&
    parts.length > 1 &&
    parts.every((p) => /^\d+%\s/.test(p))
  ) {
    return parts.map((p) => make(p));
  }
  if (rates.length > 1) {
    if (parts.length === rates.length && rates.every((r) => /^\d+(?:[.,]\d+)?\s*%$/.test(r))) {
      return rates.map((rate, i) => make(rate, parts[i]));
    }
    return rates.map((rate) => make(rate, notes));
  }
  if (discount && /^Conjuntos?\s/i.test(notes) && parts.some((p) => /^Planos\b/i.test(p))) {
    const products = parts.filter((p) => /^Conjuntos?\s/i.test(p));
    const terms = parts.filter((p) => !products.includes(p)).join('\n');
    const offers = products.map((p) => {
      // "0846,99" and "1456,99" have no boundary between size and price.
      if (/\bao\s+\d{4,}[,.]/i.test(p)) {
        issues.push('Preço e numeração aparecem juntos. Confirmar a oferta “' + p + '”.');
        return { ...make(p, terms), review: true };
      }
      return make(p, terms);
    });
    return [make(discount, terms), ...offers];
  }
  if (discount) {
    const offer = make(discount, notes);
    if (/^\d+(?:[.,]\d+)?$/.test(discount)) {
      issues.push('Desconto numérico sem unidade. Confirmar se é percentual, valor ou preço.');
      offer.review = true;
    }
    return [offer];
  }
  if (
    !notes ||
    /^(vai participar|nao (?:tem|vai|quer)|aguardando|a confirmar|pendente)/.test(fold(notes))
  )
    return [];
  if (/^semi joias$/i.test(parts[0]) && parts.some((p) => /^óptica\s/i.test(p))) {
    let section = parts[0];
    return parts.slice(1).map((p) => {
      if (/^óptica\s/i.test(p)) section = p.split(' ')[0];
      return make(p, section);
    });
  }
  if (/\)\s*Produtos Masculinos/i.test(notes)) {
    const [women, men] = notes.split(/(?<=\))\s*Produtos Masculinos/i);
    return [make(women), ...lines(men).map((p) => make(p, 'Produtos Masculinos'))];
  }
  if (/\n\s*De R\$/i.test(notes) && /\n\s*Por R\$/i.test(notes)) {
    return notes
      .split(/\r?\n\s*\r?\n/)
      .filter((s) => s.trim())
      .map((block) => {
        const [title, ...prices] = lines(block);
        return make(title, prices.join('\n'));
      });
  }
  const pieces = notes
    .split(/\r?\n|\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const items: ImportOffer[] = [];
  let heading = '';
  if (
    pieces.some((p) => p.endsWith(':')) &&
    pieces.every((p) => p.endsWith(':') || commercial(p))
  ) {
    for (const p of pieces) {
      if (p.endsWith(':')) heading = p.slice(0, -1);
      else items.push(make(p, heading));
    }
  } else if (pieces.every(commercial)) {
    for (const p of pieces) items.push(make(p));
  } else if (commercial(notes)) {
    items.push(make(notes));
  } else {
    issues.push('Observação sem oferta comercial identificável.');
  }
  const seen = new Set<string>();
  return items.filter((offer) => {
    const key = fold(offer.title) + '\n' + fold(offer.conditions);
    if (seen.has(key)) {
      issues.push('Oferta idêntica repetida na mesma linha. Uma ocorrência comercial foi mantida.');
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isoDate(input: string): string | null {
  const pt = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
  const iso = pt ? [pt[3], pt[2], pt[1]].join('-') : input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(iso + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

function interpret(sheet: string, sheetHidden: boolean, rows: SourceRow[]): ImportRow[] {
  const header = rows.find((row) => row.cells.some((value) => aliases.name.includes(fold(value))));
  const labels = header?.cells.map((v) => v.trim()) ?? [];
  const fields = new Map<Field, number>();
  for (const field of Object.keys(aliases) as Field[]) {
    const idx = labels.findIndex((v) => aliases[field].includes(fold(v)));
    if (idx !== -1) fields.set(field, idx);
  }
  return rows
    .filter((row) => row !== header)
    .map((row) => {
      const raw: Record<string, string> = Object.create(null);
      row.cells.forEach((v, i) => {
        const originalKey = labels[i] || 'Coluna ' + (i + 1);
        let key = originalKey,
          copy = 2;
        while (Object.hasOwn(raw, key)) key = originalKey + ' [' + copy++ + ']';
        raw[key] = v;
      });
      for (const [address, formula] of Object.entries(row.formulas ?? {})) {
        let key = 'Fórmula ' + address;
        while (Object.hasOwn(raw, key)) key += ' (origem)';
        raw[key] = formula;
      }
      const beforeHeader = header && row.number < header.number;
      const field = (key: Field) =>
        beforeHeader ? '' : (row.cells[fields.get(key) ?? -1] ?? '').trim();
      const issues = [...row.issues];
      // Historical worksheets contain contact names and even a taxpayer identifier in a trade name.
      // Those values stay in the private source record. Only the cleaned trade name is publishable.
      const name = field('name')
        .replace(/\b(?:\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})\b/g, '')
        .trim();
      const hidden = sheetHidden || Boolean(row.hidden);
      const address = field('address'),
        category = field('category'),
        phone = field('phone');
      const discount = field('discount'),
        notes = field('notes');
      if (!header) issues.push('Cabeçalho de empresa não identificado. Conferir as colunas.');
      if (beforeHeader)
        issues.push('Conteúdo anterior ao cabeçalho. Conferir o registro original.');
      if (!name) issues.push('Nome ausente. Conferir a linha original.');
      if (name !== field('name')) issues.push('Identificador pessoal removido do nome público.');
      if (!address) issues.push('Endereço ausente.');
      else if (address.includes('*') || /\bbox\b/i.test(address) || !/\d/.test(address))
        issues.push('Endereço incompleto ou com anotação. Confirmar localização.');
      if (!category) issues.push('Categoria não informada.');
      if (!phone) issues.push('Telefone não informado.');
      if (hidden)
        issues.push('Origem oculta na planilha. Conferir participação e possíveis duplicidades.');
      const declined = /nao (?:tem i(?:nteresse|neteresse)|vai participar|quer participar)/.test(
        fold(notes + ' ' + discount),
      );
      if (declined) issues.push('Recusa de participação registrada.');
      const offers = declined ? [] : offerList(discount, notes, issues);
      if (!offers.length && !declined) issues.push('Sem promoção confirmada.');
      const start = isoDate(field('start')),
        end = isoDate(field('end'));
      const invalidDate = Boolean(
        (field('start') && !start) || (field('end') && !end) || (start && end && start > end),
      );
      if (invalidDate) issues.push('Período inválido. Conferir datas antes de publicar.');
      for (const offer of offers) {
        offer.conditions = joined(offer.conditions, field('terms'));
        if (start) offer.start = start;
        if (end) offer.end = end;
        if (invalidDate || row.issues.length) offer.review = true;
      }
      return {
        sheet,
        line: row.number,
        hidden,
        raw,
        name,
        address,
        category,
        phone,
        discount,
        notes,
        offers,
        issues,
        declined,
      };
    });
}

function checkCell(text: string): string {
  if (text.length > MAX_CELL) throw new Error('Uma célula excede o limite de 12 mil caracteres.');
  return text;
}

function cellText(cell: ExcelJS.Cell, issues: string[]): string {
  if (cell.isMerged && cell.master.address !== cell.address) return '';
  const value = cell.value;
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    if (cell.numFmt?.includes('%'))
      return (
        Number((value * 100).toFixed(10)).toLocaleString('pt-BR', {
          maximumFractionDigits: 10,
          useGrouping: false,
        }) + '%'
      );
    return String(value);
  }
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('hyperlink' in value) return value.text || value.hyperlink;
    if ('formula' in value || 'sharedFormula' in value) {
      issues.push(
        'Célula ' + cell.address + ' contém fórmula. Conferir o valor calculado na origem.',
      );
      return typeof value.result === 'string' || typeof value.result === 'number'
        ? String(value.result)
        : '';
    }
    issues.push('Valor de célula não reconhecido em ' + cell.address + '.');
    return cell.text || '';
  }
  return String(value);
}

// Validate sizes against the actual inflated data before giving the archive to a workbook parser.
// Only ordinary single-volume XLSX/ZIP archives are supported. No archive is extracted to disk.
function checkXlsx(bytes: Buffer) {
  const at = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const fail = () => {
    throw new Error('Arquivo XLSX inválido ou fora dos limites de importação.');
  };
  if (at < 0 || at + 22 > bytes.length || bytes.readUInt16LE(at + 4) || bytes.readUInt16LE(at + 6))
    return fail();
  const total = bytes.readUInt16LE(at + 10);
  if (total > 1000 || total === 0 || bytes.readUInt16LE(at + 8) !== total) return fail();
  let offset = bytes.readUInt32LE(at + 16);
  const startCentral = offset;
  let expanded = 0;
  const paths = new Set<string>();
  for (let i = 0; i < total; i++) {
    if (offset + 46 > at || bytes.readUInt32LE(offset) !== 0x02014b50) return fail();
    const method = bytes.readUInt16LE(offset + 10),
      size = bytes.readUInt32LE(offset + 20);
    const expected = bytes.readUInt32LE(offset + 24),
      pathLength = bytes.readUInt16LE(offset + 28);
    const next =
      offset + 46 + pathLength + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
    const local = bytes.readUInt32LE(offset + 42);
    if (next > at || local + 30 > startCentral || bytes.readUInt32LE(local) !== 0x04034b50)
      return fail();
    const path = bytes.toString('utf8', offset + 46, offset + 46 + pathLength);
    if (paths.has(path) || path.includes('..') || path.includes('\\') || path.startsWith('/'))
      return fail();
    paths.add(path);
    const dataOffset = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    if (
      dataOffset + size > startCentral ||
      bytes.readUInt16LE(offset + 8) & 1 ||
      expanded + expected > MAX_XML
    )
      return fail();
    const input = bytes.subarray(dataOffset, dataOffset + size);
    const decoded =
      method === 8
        ? inflateRawSync(input, { maxOutputLength: Math.max(1, expected) })
        : method === 0
          ? input
          : null;
    if (
      !decoded ||
      decoded.length !== expected ||
      ((path.endsWith('.xml') || path.endsWith('.rels')) &&
        /<!DOCTYPE|<!ENTITY/i.test(decoded.toString('utf8')))
    )
      return fail();
    expanded += expected;
    offset = next;
  }
  if (offset !== at || !paths.has('xl/workbook.xml')) return fail();
}

function csvRows(bytes: Buffer): SourceRow[] {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const separators = [';', ',', '\t'].sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length,
  );
  const rows: SourceRow[] = [];
  let number = 1;
  parseCsv(text, {
    delimiter: separators[0],
    bom: true,
    relax_column_count: true,
    max_record_size: 100000,
    on_record(record: string[], context) {
      if (record.length > MAX_COLS) throw new Error('Limite de 80 colunas por importação.');
      const cells = record.map(checkCell);
      if (cells.some((s) => s.trim())) rows.push({ cells, number, issues: [] });
      if (rows.length > MAX_ROWS + 1) throw new Error('Limite de 5 mil linhas por importação.');
      number = context.lines + 1;
      return null;
    },
  });
  return rows;
}

export async function parseFile(bytes: Buffer, filename: string): Promise<ImportRow[]> {
  if (!bytes.length || bytes.length > MAX_FILE)
    throw new Error('Envie um arquivo de até 3 MB com conteúdo.');
  if (/\.csv$/i.test(filename)) return interpret('CSV', false, csvRows(bytes));
  if (!/\.xlsx$/i.test(filename)) throw new Error('Os formatos aceitos são XLSX e CSV em UTF-8.');
  checkXlsx(bytes);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes as unknown as Parameters<typeof book.xlsx.load>[0]);
  if (book.worksheets.length > 40) throw new Error('Limite de 40 abas por importação.');
  const out: ImportRow[] = [];
  for (const ws of book.worksheets) {
    const rows: SourceRow[] = [];
    ws.eachRow((row) => {
      const source: SourceRow = { number: row.number, cells: [], issues: [], hidden: row.hidden };
      row.eachCell((cell) => {
        if (typeof cell.col !== 'number' || cell.col > MAX_COLS)
          throw new Error('Limite de 80 colunas por importação.');
        while (source.cells.length < cell.col - 1) source.cells.push('');
        source.cells[cell.col - 1] = checkCell(cellText(cell, source.issues));
        if (cell.type === ExcelJS.ValueType.Formula && cell.formula) {
          source.formulas ??= {};
          source.formulas[cell.address] = checkCell(cell.formula);
        }
      });
      if (source.cells.some((t) => t.trim()) || source.issues.length) rows.push(source);
      if (out.length + rows.length > MAX_ROWS + 1)
        throw new Error('Limite de 5 mil registros por importação.');
    });
    out.push(...interpret(ws.name, ws.state === 'hidden' || ws.state === 'veryHidden', rows));
  }
  return out;
}
