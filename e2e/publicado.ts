import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

async function main() {
  const base = process.env.PORTAL_URL;
  if (!base?.startsWith('https://'))
    throw Error('Informe PORTAL_URL com a origem HTTPS do portal publicado.');
  const url = (path: string) => new URL(path, base).href;
  const sitemap = await fetch(url('/sitemap.xml'));
  assert.equal(sitemap.status, 200);
  const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]),
  );
  assert.ok(urls.some((u) => u.pathname.startsWith('/lojas/')));
  assert.ok(urls.some((u) => u.pathname.startsWith('/ofertas/')));
  for (let i = 0; i < urls.length; i += 4) {
    await Promise.all(
      urls.slice(i, i + 4).map(async (u) => {
        assert.equal(u.origin, new URL(base).origin);
        const r = await fetch(u);
        assert.equal(r.status, 200, u.pathname);
        const html = await r.text();
        assert.ok(html.includes('<h1') && !html.includes('Conteúdo indisponível'), u.pathname);
      }),
    );
  }
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    // Keep automated validation outside consumer engagement statistics.
    await ctx.route('**/api/atividade', (route) => route.abort());
    const p = await ctx.newPage(),
      errors: string[] = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(base);
    await expect(p.getByText('Radar de ofertas.')).toBeVisible();
    await p.locator('.heroart img').evaluate((img: HTMLImageElement) => img.decode());
    await p.getByRole('button', { name: 'Menu', exact: true }).click();
    await p.locator('nav').getByRole('link', { name: 'Mapa' }).click();
    await p.locator('.leaflet-marker-icon').first().waitFor();
    await p.locator('.leaflet-tile-loaded').first().waitFor();
    await p.getByLabel('Pesquisar no mapa').fill('Fralli');
    await expect(p.locator('.leaflet-marker-icon')).toHaveCount(1);
    await p.locator('.leaflet-marker-icon').click();
    await p.getByRole('link', { name: 'Ver loja →' }).click();
    await expect(p.locator('.detailed')).toHaveCount(6);
    await p.getByRole('button', { name: 'Salvar nos favoritos' }).click();
    await p.getByRole('link', { name: /Favoritos, 1 lojas/ }).click();
    await expect(p.locator('.card')).toHaveCount(1);
    assert.equal((await ctx.request.get(url('/api/admin/dados'))).status(), 401);
    if (process.env.PORTAL_ADMIN_EMAIL && process.env.PORTAL_ADMIN_PASSWORD_FILE) {
      await p.goto(url('/admin/entrar'));
      await p.getByLabel('E-mail').fill(process.env.PORTAL_ADMIN_EMAIL);
      await p
        .getByLabel('Senha')
        .fill((await readFile(process.env.PORTAL_ADMIN_PASSWORD_FILE, 'utf8')).trim());
      await p.getByRole('button', { name: 'Entrar', exact: true }).click();
      await expect(p.getByText('Ofertas disponíveis', { exact: true })).toBeVisible({
        timeout: 15000,
      });
      const data = await (await ctx.request.get(url('/api/admin/dados'))).json();
      assert.ok(data.stores.length > 0);
      assert.ok(data.imports.some((i: { status: string }) => i.status === 'concluída'));
      await p.getByRole('button', { name: 'Sair', exact: true }).click();
      await p.waitForURL('**/admin/entrar');
      assert.equal((await ctx.request.get(url('/api/admin/dados'))).status(), 401);
    }
    assert.deepEqual(errors, []);
    console.log(
      urls.length +
        ' URLs conferidas no domínio público. Mapa, mosaicos, filtros, favoritos, proteção e recursos da página verificados.',
    );
  } finally {
    await b.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
