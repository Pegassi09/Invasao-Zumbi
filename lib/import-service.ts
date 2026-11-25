import { randomUUID, createHash } from 'node:crypto';
import type { AnyBulkWriteOperation } from 'mongodb';
import { collections, transaction, ready, audit, type Rec } from './db';
import { normalize, slugify, blankStore, type Store, type Offer } from './model';
import type { ImportRow } from './importer';
import { Problem } from './security';
import locationData from './locations.json';
type Point = { name: string; address: string; lat: number; lng: number; source: string };
const points: Point[] = locationData;
type Prior = { key: string; storeId: string };
const offerKey = (
  id: string,
  o: { title: string; conditions: string; start?: string; end?: string },
) => fingerprint(id, o.title.trim(), o.conditions.trim(), o.start || '', o.end || '');
const fingerprint = (...parts: string[]) =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex');
function editorialCategory(r: ImportRow) {
  if (r.category) return r.category;
  const s = normalize(r.name + ' ' + r.offers.map((o) => o.title + ' ' + o.conditions).join(' '));
  if (/otica|optica|armacoes|lentes/.test(s)) return 'Óticas';
  if (/calcados/.test(s)) return 'Calçados';
  if (/relojoaria|joias|folheados|personalizad/.test(s)) return 'Acessórios e presentes';
  if (/confeccoes|moda|blusa|camiseta|fitness|conjuntos|intima/.test(s)) return 'Moda';
  if (/cosmeticos/.test(s)) return 'Beleza';
  if (/cama|amigurumi|colchoes|tecidos|porta retrato/.test(s)) return 'Casa e decoração';
  return '';
}
function displayAddress(r: ImportRow) {
  if (!r.address && normalize(r.name) === 'tecie' && normalize(r.sheet).includes('galdino'))
    return 'Rua Coronel Galdino de Almeida, 334–356';
  return r.address;
}
export type LinePlan = {
  row: ImportRow;
  action: 'nova' | 'existente' | 'repetida' | 'revisão' | 'histórico';
  key: string;
  matched: string;
  issues: string[];
};
export function planRows(rows: ImportRow[], stores: Store[], prior: Prior[] = []): LinePlan[] {
  const seen = new Set<string>(),
    seenStores = new Set<string>();
  return rows.map((sourceRow) => {
    const row = sourceRow;
    const address = displayAddress(row);
    const key = fingerprint(normalize(row.name), normalize(address)),
      ident = key + fingerprint(row.discount, row.notes, JSON.stringify(row.offers));
    const aliases = new Set(prior.filter((p) => p.key === key).map((p) => p.storeId));
    const matches = stores.filter(
      (s) =>
        aliases.has(s._id) ||
        (normalize(s.name) === normalize(row.name) && normalize(s.address) === normalize(address)),
    );
    const ambiguous =
      !address && stores.some((s) => normalize(row.name) === normalize(s.name) && s.address);
    const issues = [...row.issues];
    let action: LinePlan['action'] = 'nova';
    if (row.hidden || row.declined) action = 'histórico';
    else if (
      !row.name ||
      matches.length > 1 ||
      ambiguous ||
      row.issues.some((x) => /fórmula|cabeçalho não reconhecido/i.test(x))
    )
      action = 'revisão';
    else if (seen.has(ident)) action = 'repetida';
    else if (matches.length || seenStores.has(key)) action = 'existente';
    if (action === 'nova' || action === 'existente') {
      seen.add(ident);
      seenStores.add(key);
    }
    if (rows.some((other) => other !== row && normalize(other.name) === normalize(row.name)))
      issues.push('Nome repetido no arquivo. Conferir versões históricas e filiais.');
    if (ambiguous || matches.length > 1)
      issues.push('Possível filial. Conferir identidade antes de publicar.');
    if (
      stores.some(
        (s) =>
          normalize(s.name) === normalize(row.name) && normalize(s.address) !== normalize(address),
      )
    )
      issues.push('Nome também cadastrado em outro endereço.');
    return { row, action, key, matched: matches.length === 1 ? matches[0]._id : '', issues };
  });
}
export function summarize(plan: LinePlan[]) {
  const selected = plan.filter((p) => ['nova', 'existente'].includes(p.action));
  return {
    linhas: plan.length,
    lojas: new Set(selected.map((p) => p.key)).size,
    promocoes: selected.reduce((n, p) => n + p.row.offers.length, 0),
    novas: plan.filter((p) => p.action === 'nova').length,
    existentes: plan.filter((p) => p.action === 'existente').length,
    repetidas: plan.filter((p) => p.action === 'repetida').length,
    possiveisDuplicidades: plan.filter((p) =>
      p.issues.some((x) => x.startsWith('Nome repetido') || x.startsWith('Possível filial')),
    ).length,
    historico: plan.filter((p) => p.action === 'histórico').length,
    revisao: plan.filter((p) => p.action === 'revisão' || p.issues.length).length,
  };
}
export async function previewImport(rows: ImportRow[], file: string, who: string) {
  if (!rows.length) throw new Problem(422, 'A planilha não contém registros.');
  if (Buffer.byteLength(JSON.stringify(rows)) > 8_000_000)
    throw new Problem(413, 'Divida a planilha em arquivos menores.');
  return transaction(async (session) => {
    const c = await collections(),
      revision = (await c.meta.findOne({ _id: 'catalog' }, { session }))!.revision;
    const prior = await c.lines
      .find({ storeId: { $exists: true } }, { projection: { _id: 0, key: 1, storeId: 1 }, session })
      .toArray();
    const plan = planRows(
        rows,
        await c.stores.find({}, { session }).toArray(),
        prior as unknown as Prior[],
      ),
      summary = summarize(plan),
      id = randomUUID();
    const incoming = new Map<string, Set<string>>();
    for (const line of plan.filter(
      (p) => p.action === 'existente' && p.matched && p.row.offers.length,
    )) {
      const ids = incoming.get(line.matched) || new Set<string>();
      for (const offer of line.row.offers) ids.add(offerKey(line.matched, offer));
      incoming.set(line.matched, ids);
    }
    const replaced: { id: string; store: string; title: string }[] = [];
    const importedOffers = await c.offers
      .find({ storeId: { $in: [...incoming.keys()] }, importKey: { $exists: true } }, { session })
      .toArray();
    for (const [storeId, keys] of incoming) {
      const previous = importedOffers.filter((o) => o.storeId === storeId);
      if (![...keys].some((k) => !previous.some((o) => o.importKey === k))) continue;
      for (const o of previous)
        if (o.active && o.updated === o.created && !keys.has(o.importKey!))
          replaced.push({
            id: o._id,
            store: plan.find((p) => p.matched === storeId)!.row.name,
            title: o.title,
          });
    }
    await c.imports.insertOne(
      {
        _id: id,
        status: 'prévia',
        file,
        who,
        at: new Date().toISOString(),
        revision,
        summary,
        replaced,
      },
      { session },
    );
    await c.lines.insertMany(
      plan.map((p, i) => ({ _id: randomUUID(), batch: id, order: i, ...p })),
      { session },
    );
    return { id, summary };
  });
}
function confirmedFields(r: ImportRow) {
  const byLabel = new Map(Object.entries(r.raw).map(([k, v]) => [normalize(k), v.trim()]));
  const fields: Record<string, string> = {};
  for (const [label, key] of [
    ['descricao da loja', 'description'],
    ['horario de funcionamento', 'hours'],
    ['telefone publico', 'phone'],
    ['whatsapp comercial publico', 'whatsapp'],
  ]) {
    const v = byLabel.get(label);
    if (!v) continue;
    if ((key === 'phone' || key === 'whatsapp') && !/^\+?[\d ()-]{8,24}$/.test(v)) continue;
    fields[key] = v.slice(0, key === 'description' ? 3000 : 240);
  }
  return fields;
}
function storeFromRow(r: ImportRow, id: string, category: string, at: string): Store {
  const point = points.find(
    (x) => normalize(x.name) === normalize(r.name) && x.address.trim() === r.address.trim(),
  );
  return {
    ...blankStore(),
    _id: id,
    slug: (slugify(r.name) || 'loja') + '-' + id.slice(0, 8),
    name: r.name,
    address: displayAddress(r),
    ...confirmedFields(r),
    category,
    created: at,
    updated: at,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    locationSource: point?.source || '',
    featured: /^(otica fralli|dul pe calcados|viccium moda|rt cosmeticos)$/.test(normalize(r.name)),
  };
}
export async function confirmImport(
  id: string,
  who: string,
  policy?: 'acrescentar' | 'substituir',
) {
  await ready();
  return transaction(async (session) => {
    const c = await collections(),
      batch = await c.imports.findOne({ _id: id }, { session });
    if (!batch) throw new Problem(404, 'Importação não encontrada.');
    if (batch.status === 'concluída') return batch.result;
    if (batch.status !== 'prévia') throw new Problem(409, 'Importação indisponível.');
    if (batch.replaced?.length && !policy)
      throw new Problem(409, 'Escolha como tratar as ofertas anteriores na prévia.');
    const locked = await c.meta.updateOne(
      { _id: 'catalog', revision: batch.revision },
      { $inc: { revision: 1 } },
      { session },
    );
    if (!locked.modifiedCount)
      throw new Problem(409, 'O catálogo mudou. Gere uma nova prévia antes de confirmar.');
    const lines = await c.lines.find({ batch: id }, { session }).sort({ order: 1 }).toArray(),
      existing = new Map<string, string>(),
      at = new Date().toISOString();
    const storeWrites: AnyBulkWriteOperation<Store>[] = [];
    const offerWrites: AnyBulkWriteOperation<Offer>[] = [];
    const lineWrites: AnyBulkWriteOperation<Rec>[] = [];
    const known = await c.categories.find({}, { session }).toArray();
    const categoryIds = new Map(known.map((k) => [normalize(k.name), k._id]));
    const newCategories: { _id: string; name: string }[] = [];
    for (const line of lines) {
      const p = line as unknown as LinePlan;
      if (p.action !== 'nova' && p.action !== 'existente') continue;
      const r = p.row,
        categoryName = editorialCategory(r);
      let category = categoryIds.get(normalize(categoryName)) || '';
      if (categoryName && !category) {
        category = randomUUID();
        categoryIds.set(normalize(categoryName), category);
        newCategories.push({ _id: category, name: categoryName });
      }
      let storeId = p.matched || existing.get(p.key);
      if (!storeId) {
        storeId = randomUUID();
        existing.set(p.key, storeId);
        storeWrites.push({ insertOne: { document: storeFromRow(r, storeId, category, at) } });
      } else {
        const fields = { ...confirmedFields(r), ...(r.category ? { category } : {}) };
        for (const [key, value] of Object.entries(fields))
          storeWrites.push({
            updateOne: {
              filter: { _id: storeId, [key]: '' },
              update: { $set: { [key]: value, updated: at } },
            },
          });
      }
      for (const o of r.offers) {
        const importKey = offerKey(storeId, o);
        const document: Offer = {
          _id: randomUUID(),
          storeId,
          importKey,
          title: o.title,
          conditions: o.conditions,
          start: o.start || '',
          end: o.end || '',
          active: !o.review,
          featured:
            !o.review && /^(viccium moda|priscila nunes|optica exata)$/.test(normalize(r.name)),
          created: at,
          updated: at,
        };
        offerWrites.push({
          updateOne: {
            filter: { storeId, importKey },
            update: { $setOnInsert: document },
            upsert: true,
          },
        });
      }
      lineWrites.push({ updateOne: { filter: { _id: line._id }, update: { $set: { storeId } } } });
    }
    if (newCategories.length) await c.categories.insertMany(newCategories, { session });
    if (storeWrites.length) await c.stores.bulkWrite(storeWrites, { session });
    const added = offerWrites.length
      ? (await c.offers.bulkWrite(offerWrites, { session })).upsertedCount
      : 0;
    if (lineWrites.length) await c.lines.bulkWrite(lineWrites, { session });
    let archived = 0;
    if (policy === 'substituir' && batch.replaced?.length) {
      const result = await c.offers.updateMany(
        { _id: { $in: batch.replaced.map((p: { id: string }) => p.id) } },
        { $set: { active: false, updated: at } },
        { session },
      );
      archived = result.modifiedCount;
    }
    const result = {
      promocoesDesativadas: archived,
      lojasCriadas: existing.size,
      promocoesCriadas: added,
      linhasPreservadas: lines.length,
    };
    await c.imports.updateOne(
      { _id: id },
      { $set: { status: 'concluída', confirmed: at, result } },
      { session },
    );
    await audit('Confirmou importação', who, id, session);
    return result;
  });
}
