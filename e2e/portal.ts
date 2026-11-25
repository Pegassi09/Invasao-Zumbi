import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { chromium, expect, type Browser } from '@playwright/test';
import { client, collections, ready } from '../lib/db';
import { previewImport, confirmImport } from '../lib/import-service';
import { parseFile } from '../lib/importer';
import { hashPassword } from '../lib/security';
import { blankStore } from '../lib/model';

async function main() {
  const uri = process.env.TEST_MONGODB_URI;
  if (!uri || !process.env.PLANILHA_ORIGINAL)
    throw Error('Informe TEST_MONGODB_URI (réplica local) e PLANILHA_ORIGINAL.');
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\//.test(uri))
    throw Error('Use uma réplica de testes no computador local.');
  const database = 'zumbi_qa_' + randomUUID().replaceAll('-', '');
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = database;
  const email = 'teste@exemplo.invalid',
    password = randomBytes(24).toString('hex');
  const net = createServer();
  net.listen(0, '127.0.0.1');
  await once(net, 'listening');
  const addr = net.address();
  if (!addr || typeof addr === 'string') throw Error();
  const port = addr.port;
  await new Promise<void>((r) => net.close(() => r()));
  const base = 'http://127.0.0.1:' + port;
  process.env.SITE_URL = base;
  let server: ChildProcess | undefined, browser: Browser | undefined;
  try {
    await ready();
    const c = await collections();
    const bytes = await readFile(process.env.PLANILHA_ORIGINAL),
      rows = await parseFile(bytes, 'evento.xlsx');
    const privateLabel = rows
      .flatMap((r) => Object.values(r.raw))
      .map((v) => v.match(/\b\d{11}\b$/)?.[0])
      .find(Boolean);
    const p = await previewImport(rows, 'evento.xlsx', email);
    assert.equal(p.summary.linhas, 110);
    assert.equal(await c.stores.countDocuments(), 0);
    await confirmImport(p.id, email);
    await confirmImport(p.id, email);
    const rep = await previewImport(rows, 'evento.xlsx', email);
    await confirmImport(rep.id, email);
    assert.equal(await c.stores.countDocuments(), 50);
    assert.equal(await c.offers.countDocuments(), 92);
    assert.equal(await c.offers.countDocuments({ active: true }), 90);
    assert.equal(await c.stores.countDocuments({ lat: { $ne: null } }), 46);
    const slice = await c.stores.findOne({ name: 'Ótica Fralli' });
    assert.ok(slice);
    await c.admins.insertOne({
      _id: randomUUID(),
      email,
      password: await hashPassword(password),
      active: true,
      role: 'admin',
    });
    server = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)],
      { env: { ...process.env, NODE_ENV: 'production' }, stdio: 'pipe' },
    );
    let err = '';
    server.stderr?.on('data', (s) => (err += s));
    server.stdout?.resume();
    let started = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base + '/icon.svg')).ok) {
          started = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 120));
    }
    assert.ok(started, err);
    browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 920 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await expect(page.getByRole('heading', { name: 'Radar de ofertas.' })).toBeVisible();
    for (const t of ['Maiores descontos', 'Especiais', 'Recentes', 'Destaques'])
      await page.getByRole('button', { name: t, exact: true }).click();
    await page.getByRole('textbox', { name: 'Pesquisar estabelecimentos' }).fill('fralli');
    await page.getByRole('textbox', { name: 'Pesquisar estabelecimentos' }).press('Enter');
    await expect(page.locator('.card')).toHaveCount(1);
    await page.getByRole('button', { name: 'Salvar nos favoritos' }).click();
    await page.getByRole('link', { name: /Favoritos, 1 lojas/ }).click();
    await expect(page.locator('.card')).toHaveCount(1);
    await page.getByRole('link', { name: 'Ver ofertas', exact: true }).click();
    await expect(page.locator('.detailed')).toHaveCount(6);
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
    assert.match(
      (await page.getByRole('link', { name: 'Traçar rota' }).getAttribute('href')) || '',
      /google.com\/maps\/dir/,
    );
    await page.getByRole('button', { name: 'Compartilhar', exact: true }).first().click();
    await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa.me/);
    await page.getByRole('button', { name: 'Copiar link' }).click();
    await expect(page.getByText('Link copiado.')).toBeVisible();
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.locator('.detailed .textlink').first().click();
    await expect(page.locator('.offerpage')).toBeVisible();
    await page.goto(base + '/lojas');
    await page.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Óticas' });
    await page.getByLabel('Desconto', { exact: true }).selectOption('70%');
    await page.getByLabel('Ordenar').selectOption('desc');
    assert.ok((await page.locator('.card').count()) > 0);
    await page.getByLabel('Pesquisa').fill('qzzqzz');
    await expect(page.getByText('Nenhum resultado encontrado')).toBeVisible();
    await page.goto(base + '/mapa');
    await page.locator('.leaflet-marker-icon').first().waitFor();
    assert.ok((await page.locator('.leaflet-marker-icon').count()) >= 40);
    await page.getByLabel('Pesquisar no mapa').fill('Fralli');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
    await page.locator('.leaflet-marker-icon').click();
    await expect(page.locator('.leaflet-popup')).toContainText('Fralli');
    await page.getByRole('button', { name: 'Ampliar mapa' }).click();
    await expect(page.locator('.expanded')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByLabel('Pesquisar no mapa').fill('M FREIRE');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
    await expect(page.locator('.maplist')).toContainText('Localização a confirmar');
    const mosaic = await page.locator('img.leaflet-tile-loaded').count();
    console.log('Mapa com ' + mosaic + ' mosaicos ativos na última consulta.');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.locator('nav').getByRole('link', { name: 'Mapa' }).click();
    await page.locator('.tilemap').waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const sitemap = await (await fetch(base + '/sitemap.xml')).text(),
      urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.equal(urls.length, 145);
    for (let i = 0; i < urls.length; i += 6)
      await Promise.all(
        urls.slice(i, i + 6).map(async (url) => {
          const r = await fetch(url);
          assert.equal(r.status, 200, url);
          const html = await r.text();
          assert.match(html, /<h1/);
          assert.ok(
            !html.includes('Contato comercial público') &&
              (!privateLabel || !html.includes(privateLabel)),
          );
        }),
      );
    assert.equal((await fetch(base + '/lojas/nao-existe')).status, 404);
    assert.equal((await fetch(base + '/api/admin/dados')).status, 401);
    assert.equal((await fetch(base + '/api/passaporte')).status, 404);
    assert.match(await (await fetch(base + '/robots.txt')).text(), /Disallow: \/admin/);
    console.log(
      'Todas as 145 URLs do sitemap, navegação, filtros, mapas, detalhes, favoritos e compartilhamento conferidos.',
    );
    await page.goto(base + '/admin');
    await page.waitForURL('**/admin/entrar');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByText('Ofertas disponíveis', { exact: true })).toBeVisible();
    const api = ctx.request;
    const post = (path: string, data: unknown) =>
      api.post(base + '/api/admin/' + path, { headers: { Origin: base }, data });
    const foreign = await api.post(base + '/api/admin/salvar', {
      headers: { Origin: 'https://example.invalid' },
      data: {},
    });
    assert.equal(foreign.status(), 403);
    const bad = await post('salvar', {
      op: 'save',
      entity: 'store',
      value: { ...blankStore(), name: 'Teste', lat: 200 },
    });
    assert.equal(bad.status(), 422);
    await page.getByRole('button', { name: 'Categorias', exact: true }).click();
    await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Categoria QA');
    await page.getByRole('button', { name: 'Salvar cadastro' }).click();
    await expect(page.getByRole('button', { name: /Categoria QA/ })).toBeVisible();
    const category = await c.categories.findOne({ name: 'Categoria QA' });
    assert.ok(category);
    await page.getByRole('button', { name: 'Lojas', exact: true }).click();
    await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Unidade QA');
    await page.getByLabel('Categoria', { exact: true }).selectOption(category._id);
    await page.getByLabel('Endereço completo').fill('Endereço QA');
    await page
      .getByLabel('Logotipo ou foto', { exact: false })
      .setInputFiles('public/arte/hero-mobile.webp');
    await expect(page.getByText('Imagem enviada. Salve o cadastro.')).toBeVisible();
    await page.getByRole('button', { name: 'Salvar cadastro' }).click();
    await expect(page.getByRole('button', { name: /Unidade QA.*Editar/ })).toBeVisible();
    const stored = await c.stores.findOne({ name: 'Unidade QA' });
    assert.ok(stored);
    assert.equal((await api.get(base + stored.image)).headers()['content-type'], 'image/webp');
    await page.getByRole('button', { name: 'Promoções', exact: true }).click();
    await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
    await page.getByLabel('Loja', { exact: true }).selectOption(stored._id);
    await page.getByLabel('Oferta / desconto').fill('Oferta QA');
    await page.getByLabel('Condições de utilização').fill('Condição QA');
    await page.getByRole('button', { name: 'Salvar cadastro' }).click();
    await expect(page.getByRole('button', { name: /Oferta QA/ })).toBeVisible();
    const offre = await c.offers.findOne({ storeId: stored._id });
    assert.ok(offre);
    await page.getByRole('button', { name: /Oferta QA/ }).click();
    await page.getByLabel('Oferta / desconto').fill('Condição atualizada QA');
    await page.getByRole('button', { name: 'Salvar cadastro' }).click();
    await expect(page.getByRole('button', { name: /Condição atualizada QA/ })).toBeVisible();
    await page.getByRole('button', { name: /Condição atualizada QA/ }).click();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(page.getByText('Alteração salva.')).toBeVisible();
    assert.equal(await c.offers.countDocuments({ _id: offre._id }), 0);
    await page.getByRole('button', { name: 'Importações', exact: true }).click();
    await page
      .getByLabel('Arquivo XLSX ou CSV')
      .setInputFiles({
        name: 'lote.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('Empresa;Endereço;Desconto\nUnidade QA;Endereço QA;12%'),
      });
    await page.getByRole('button', { name: 'Gerar prévia' }).click();
    await page.getByRole('button', { name: 'Confirmar importação' }).waitFor();
    assert.equal(await c.offers.countDocuments({ storeId: stored._id }), 0);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Confirmar importação' }).click();
    await expect(page.getByText('0 lojas criadas e 1 promoções acrescentadas.')).toBeVisible();
    const updatedRows = await parseFile(
      Buffer.from('Empresa;Endereço;Desconto\nUnidade QA;Endereço QA;13%'),
      'lote.csv',
    );
    const changed = await previewImport(updatedRows, 'lote.csv', email);
    await assert.rejects(() => confirmImport(changed.id, email), /Escolha/);
    await confirmImport(changed.id, email, 'substituir');
    assert.equal(await c.offers.countDocuments({ storeId: stored._id, active: true }), 1);
    assert.equal(
      await c.offers.countDocuments({ storeId: stored._id, title: '12%', active: false }),
      1,
    );
    const stale = await previewImport(updatedRows, 'lote.csv', email);
    const newcat = await post('salvar', {
      op: 'save',
      entity: 'category',
      value: { name: 'Nova categoria QA' },
    });
    assert.ok(newcat.ok());
    await assert.rejects(() => confirmImport(stale.id, email), /catálogo mudou/);
    const r = await post('passaporte', { op: 'enable', enabled: true, confirmed: true });
    assert.ok(r.ok());
    const token = await (
      await post('passaporte', { op: 'issue', store: stored._id, present: true })
    ).json();
    const stamp = () =>
      api.post(base + '/api/passaporte', { headers: { Origin: base }, data: { code: token.code } });
    assert.ok((await stamp()).ok());
    assert.equal((await stamp()).status(), 422);
    assert.equal((await (await api.get(base + '/api/passaporte')).json()).visited.length, 1);
    await page.goto(base + '/passaporte');
    await expect(page.getByText('1 de 51 lojas visitadas')).toBeVisible();
    await post('passaporte', { op: 'enable', enabled: false, confirmed: true });
    const badFile = await api.post(base + '/api/admin/importar?nome=ruim.xlsx', {
      headers: { Origin: base },
      data: Buffer.from('arquivo ilegível'),
    });
    assert.equal(badFile.status(), 422);
    const img = await api.post(base + '/api/admin/imagem', {
      headers: { Origin: base },
      data: Buffer.from('conteúdo inválido'),
    });
    assert.equal(img.status(), 422);
    assert.equal(
      (
        await post('salvar', {
          op: 'delete',
          entity: 'store',
          id: stored._id,
          version: stored.updated,
        })
      ).status(),
      400,
    );
    assert.ok(
      (
        await post('salvar', {
          op: 'delete',
          entity: 'store',
          id: stored._id,
          version: stored.updated,
          confirmed: true,
        })
      ).ok(),
    );
    assert.equal(await c.offers.countDocuments({ storeId: stored._id }), 0);
    assert.ok(
      (
        await post('salvar', {
          op: 'delete',
          entity: 'category',
          id: category._id,
          confirmed: true,
        })
      ).ok(),
    );
    assert.ok((await c.audits.countDocuments()) > 10);
    assert.ok(await c.usage.findOne({ kind: 'loja' }));
    assert.ok(await c.usage.findOne({ kind: 'compartilhamento' }));
    await post('sair', {});
    assert.equal((await api.get(base + '/api/admin/dados')).status(), 401);
    for (let i = 0; i < 12; i++) await post('entrar', { email, password: 'senha-inválida' });
    assert.equal((await post('entrar', { email, password: 'senha-inválida' })).status(), 429);
    assert.deepEqual(errors, []);
    console.log(
      'Painel, importações, concorrência, arquivos, autenticação, permissões, estatísticas e passaporte conferidos.',
    );
  } finally {
    await browser?.close();
    if (server && server.exitCode === null) {
      const closed = once(server, 'exit');
      server.kill();
      await closed;
    }
    const connection = await client();
    await connection.db(database).dropDatabase();
    await connection.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
