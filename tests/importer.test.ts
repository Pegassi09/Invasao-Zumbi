import { test } from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { parseFile } from '../lib/importer';

const csv = (s: string) => parseFile(Buffer.from(s), 'arquivo.csv');

test('CSV mantém texto, fontes multilinha, cabeçalhos extras e períodos', async () => {
  const rows = await csv(
    '\uFEFFEmpresa;Oferta;Condições;Data de início;Fim;Coluna livre\r\nUnidade;20%;"Peças selecionadas\nEnquanto durarem";27/11/2026;2026-11-28;conferido\r\n\r\nOutra;15%;À vista;31/02/2026;;externo',
  );
  assert.deepEqual(
    rows.map((r) => r.line),
    [2, 5],
  );
  assert.deepEqual(rows[0].offers, [
    {
      title: '20%',
      conditions: 'Peças selecionadas\nEnquanto durarem',
      start: '2026-11-27',
      end: '2026-11-28',
    },
  ]);
  assert.equal(rows[0].raw['Coluna livre'], 'conferido');
  assert.equal(rows[1].offers[0].review, true);
});

test('XLSX conserva abas e linhas ocultas, percentuais e células mescladas', async () => {
  const book = new ExcelJS.Workbook();
  const source = book.addWorksheet('Original');
  source.addRow(['Empresa', 'Desconto', 'Obs']);
  source.addRow(['Unidade', 0.25, 'Em armações']);
  source.getCell('B2').numFmt = '0%';
  source.getRow(2).hidden = true;
  const hidden = book.addWorksheet('Contatos', { state: 'hidden' });
  hidden.addRow(['Empresa', 'Desconto', 'Obs']);
  hidden.addRow(['Outra', 'Compre 3 pague 2']);
  hidden.mergeCells('B2:C2');
  const rows = await parseFile(Buffer.from(await book.xlsx.writeBuffer()), 'dados.xlsx');
  assert.deepEqual(
    rows.map((r) => [r.sheet, r.line, r.hidden, r.offers]),
    [
      ['Original', 2, true, [{ title: '25%', conditions: 'Em armações' }]],
      ['Contatos', 2, true, [{ title: 'Compre 3 pague 2', conditions: '' }]],
    ],
  );
});

test('dados faltantes, numeração duvidosa e recusas ficam registrados', async () => {
  const rows = await csv(
    'Empresa,Desconto,Obs\n,0.12,Confirmar unidade\nLoja,,Não tem ineteresse\nLoja B,,Vai participar',
  );
  assert.ok(rows[0].issues.some((i) => i.includes('Nome ausente')));
  assert.equal(rows[0].offers[0].review, true);
  assert.equal(rows[1].declined, true);
  assert.equal(rows[1].offers.length, 0);
  assert.equal(rows[2].offers.length, 0);
});

test('arquivo em formato diferente e arquivo vazio são rejeitados', async () => {
  await assert.rejects(parseFile(Buffer.from('Planilha'), 'origem.pdf'));
  await assert.rejects(parseFile(Buffer.from('Planilha'), 'origem.xlsx'));
  await assert.rejects(parseFile(Buffer.alloc(0), 'origem.csv'));
});

const original = process.env.PLANILHA_ORIGINAL;
test('conciliação da planilha original de novembro de 2026', { skip: !original }, async () => {
  const rows = await parseFile(await readFile(original!), 'base.xlsx');
  const commercialSnapshot = rows.map((r) => [
    r.sheet,
    r.line,
    r.hidden,
    r.name,
    r.address,
    r.discount,
    r.notes,
    r.offers,
    r.declined,
  ]);
  assert.equal(
    createHash('sha256').update(JSON.stringify(commercialSnapshot)).digest('hex'),
    '28f70e419ba89b879a5aab08e0cd3d2f5d2067505df162ac4dfca1bad425216b',
  );
  assert.equal(rows.length, 110);
  const visible = rows.filter((r) => !r.hidden);
  assert.equal(visible.length, 50);
  assert.equal(new Set(rows.map((r) => r.sheet)).size, 10);
  assert.equal(rows.filter((r) => r.declined).length, 6);
  assert.equal(rows.flatMap((r) => r.offers).length, 150);
  assert.equal(visible.flatMap((r) => r.offers).length, 92);
  assert.equal(visible.flatMap((r) => r.offers.filter((o) => !o.review)).length, 90);
  assert.equal(visible.filter((r) => r.phone === '').length, 6);
  assert.ok(visible.every((r) => r.category === ''));
  const pick = (n: string) => visible.find((r) => r.name === n)!;
  assert.equal(pick('Tecie').address, '');
  assert.equal(pick('Lojas Cem').offers.length, 0);
  assert.equal(pick('Ótica Fralli').offers.length, 6);
  assert.equal(pick('Viccium Moda').offers.length, 4);
  assert.equal(pick('Nuage').offers.length, 4);
  assert.equal(pick('OPTICA SAO CARLOS').offers.length, 4);
  assert.deepEqual(
    pick('Optica Feres').offers.map((o) => o.title),
    ['Armações de 239,00 por 99,00', 'Lentes até 4 graus 99,00'],
  );
  assert.equal(pick('Censura Livre').offers.filter((o) => o.review).length, 2);
  assert.deepEqual(
    pick('OTICA SAO BENTO').offers.map((o) => [o.title, o.conditions]),
    [
      ['60%', 'Óculos solares selecionados de R$ 250,00 por R$ 99,90.'],
      ['50%', 'Armações selecionadas de R$ 250,00 por R$ 125,00.'],
    ],
  );
  assert.equal(pick('PRISCILA NUNES').offers[0].conditions, 'De R$99,90\nPor R$49,90');
  assert.ok(pick('Frequência Masculina').issues.some((i) => i.includes('idêntica')));
  assert.deepEqual(
    pick('CASA ONO')
      .offers.slice(-3)
      .map((o) => o.conditions),
    Array(3).fill('Toalhas Bella e Artesanalle'),
  );
  assert.equal(visible.filter((r) => r.name === 'CIRANDINHA CALCADOS').length, 2);
  assert.equal(pick('Cantinho Indiano').address, 'RUA QUATRO DE ABRIL 387 LJ 2');
  assert.ok(rows.every((r) => !/\b\d{11}\b/.test(r.name)));
  assert.equal(new Set(rows.map((r) => r.sheet + '|' + r.line)).size, rows.length);
});
