import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import sharp from 'sharp';
import { Binary } from 'mongodb';
import { collections, ready, audit } from '@/lib/db';
import {
  body,
  checkPassword,
  digest,
  failure,
  jsonBody,
  limit,
  Problem,
  requireAdmin,
  sameOrigin,
} from '@/lib/security';
import { mutate } from '@/lib/manage';
import { passportOn, managePassport } from '@/lib/passport';
import { parseFile } from '@/lib/importer';
import { previewImport, confirmImport } from '@/lib/import-service';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ operation: string }> };
const json = (data: unknown) =>
  Response.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(req: Request, { params }: Context) {
  try {
    await requireAdmin();
    const { operation } = await params,
      c = await collections(),
      url = new URL(req.url);
    if (operation === 'historico') {
      const batch = url.searchParams.get('id');
      if (!batch) throw new Problem(400, 'Informe a importação.');
      const info = await c.imports.findOne({ _id: batch });
      if (!info) throw new Problem(404, 'Importação inexistente.');
      return json({ info, lines: await c.lines.find({ batch }).sort({ order: 1 }).toArray() });
    }
    if (operation !== 'dados') throw new Problem(404, 'Página inexistente.');
    const [stores, offers, categories, imports, audits, usage] = await Promise.all([
      c.stores.find().sort({ name: 1 }).toArray(),
      c.offers.find().sort({ created: -1 }).toArray(),
      c.categories.find().sort({ name: 1 }).toArray(),
      c.imports.find().sort({ at: -1 }).limit(150).toArray(),
      c.audits.find().sort({ at: -1 }).limit(200).toArray(),
      c.usage.find().sort({ count: -1 }).toArray(),
    ]);
    return json({
      stores,
      offers,
      categories,
      imports,
      audits,
      usage,
      passport: await passportOn(),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, { params }: Context) {
  try {
    sameOrigin(req);
    const { operation } = await params;
    if (operation === 'entrar') {
      await limit(req, 'login', 12, 15 * 60_000);
      const data = z
        .object({ email: z.email().max(254), password: z.string().min(1).max(198) })
        .parse(await jsonBody(req));
      const c = await collections(),
        email = data.email.toLowerCase(),
        admin = await c.admins.findOne({ email, active: true, role: 'admin' });
      const ok = await checkPassword(
        data.password,
        admin?.password || 'invalid.' + '0'.repeat(128),
      );
      if (!ok || !admin) throw new Problem(401, 'E-mail ou senha inválidos.');
      const token = randomBytes(32).toString('hex'),
        until = new Date(Date.now() + 8 * 3600_000);
      await c.sessions.insertOne({ _id: digest(token), user: admin._id, until });
      (await cookies()).set('iz_session', token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: new URL(req.url).protocol === 'https:' || !!process.env.VERCEL,
        expires: until,
        path: '/',
      });
      await audit('Entrou no painel', email, admin._id);
      return json({ ok: true });
    }
    const who = await requireAdmin(),
      c = await collections();
    await limit(req, 'admin-' + who._id, 180, 60_000);
    if (operation === 'sair') {
      const jar = await cookies();
      await c.sessions.deleteOne({ _id: digest(jar.get('iz_session')!.value) });
      jar.delete('iz_session');
      return json({ ok: true });
    }
    if (operation === 'passaporte')
      return json(await managePassport(await jsonBody(req), who.email));
    if (operation === 'salvar') return json(await mutate(await jsonBody(req), who.email));
    if (operation === 'confirmar') {
      const { id, confirmed, policy } = z
        .object({
          id: z.uuid(),
          confirmed: z.literal(true),
          policy: z.enum(['acrescentar', 'substituir']).optional(),
        })
        .parse(await jsonBody(req));
      if (confirmed) return json(await confirmImport(id, who.email, policy));
    }
    if (operation === 'importar') {
      await limit(req, 'import-' + who._id, 20, 3600_000);
      const file = (new URL(req.url).searchParams.get('nome') || '')
        .split(/[\\/]/)
        .pop()!
        .slice(0, 180);
      try {
        return json(
          await previewImport(
            await parseFile(await body(req, 3 * 1024 * 1024), file),
            file,
            who.email,
          ),
        );
      } catch (e) {
        if (e instanceof Problem) throw e;
        await c.imports.insertOne({
          _id: crypto.randomUUID(),
          status: 'erro',
          at: new Date().toISOString(),
          who: who.email,
          file,
          error: 'Falha na leitura da planilha.',
        });
        throw new Problem(
          422,
          'Não foi possível ler a planilha. Confira o formato, os cabeçalhos e o tamanho.',
        );
      }
    }
    if (operation === 'imagem') {
      await limit(req, 'upload-' + who._id, 45, 3600_000);
      const bytes = await body(req, 3 * 1024 * 1024);
      let image: Buffer;
      try {
        const input = sharp(bytes, { limitInputPixels: 16_000_000 });
        const meta = await input.metadata();
        if (!['png', 'jpeg', 'webp'].includes(meta.format || '')) throw Error();
        image = await input
          .rotate()
          .resize(1000, 800, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
      } catch {
        throw new Problem(
          422,
          'Selecione uma imagem JPG, PNG ou WebP válida de até 3 MB e 16 megapixels.',
        );
      }
      const id = crypto.randomUUID();
      await c.images.insertOne({
        _id: id,
        data: new Binary(image),
        created: new Date(),
        owner: who._id,
      });
      await audit('Enviou imagem', who.email, id);
      return json({ url: '/api/imagens/' + id });
    }
    throw new Problem(404, 'Operação inexistente.');
  } catch (e) {
    return failure(e);
  }
}
