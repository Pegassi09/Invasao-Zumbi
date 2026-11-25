import { createHash, randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { collections, ready } from './db';
const scrypt = promisify(derive);
export class Problem extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const digest = (str: string) => createHash('sha256').update(str).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + '.' + ((await scrypt(password, salt, 64)) as Buffer).toString('hex');
}
export async function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split('.');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return hash.length === 128 && timingSafeEqual(key, Buffer.from(hash, 'hex'));
}
export async function principal() {
  const token = (await cookies()).get('iz_session')?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const c = await collections();
  const session = await c.sessions.findOne({ _id: digest(token), until: { $gt: new Date() } });
  return session
    ? c.admins.findOne(
        { _id: session.user, role: 'admin', active: true },
        { projection: { password: 0 } },
      )
    : null;
}
export async function requireAdmin() {
  const who = await principal();
  if (!who) throw new Problem(401, 'Entre no painel para continuar.');
  return who;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (
    origin !== new URL(req.url).origin &&
    (!process.env.SITE_URL || origin !== new URL(process.env.SITE_URL).origin)
  )
    throw new Problem(403, 'Origem da solicitação inválida.');
}
export async function limit(req: Request, kind: string, max: number, period: number) {
  await ready();
  const ip =
    (process.env.VERCEL ? req.headers.get('x-vercel-forwarded-for') : null)?.split(',')[0] ||
    'local';
  const bucket = Math.floor(Date.now() / period),
    c = await collections();
  const id = digest(kind + '|' + ip + '|' + bucket);
  const entry = await c.limits.findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { until: new Date((bucket + 2) * period) } },
    { upsert: true, returnDocument: 'after' },
  );
  if (entry && entry.count > max)
    throw new Problem(429, 'Muitas tentativas. Aguarde alguns minutos.');
}
export async function body(req: Request, limitBytes: number): Promise<Buffer> {
  if (Number(req.headers.get('content-length')) > limitBytes)
    throw new Problem(413, 'O arquivo ou formulário excedeu o limite.');
  const reader = req.body?.getReader();
  if (!reader) throw new Problem(400, 'Envie os dados.');
  const parts: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limitBytes) {
      await reader.cancel();
      throw new Problem(413, 'Limite de tamanho excedido.');
    }
    parts.push(Buffer.from(value));
  }
  return Buffer.concat(parts);
}
export async function jsonBody(req: Request) {
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    throw new Problem(415, 'Envie JSON.');
  try {
    return JSON.parse((await body(req, 64000)).toString());
  } catch (e) {
    if (e instanceof Problem) throw e;
    throw new Problem(400, 'JSON inválido.');
  }
}
export function failure(e: unknown) {
  if (e instanceof Problem) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof Error && e.name === 'ZodError')
    return Response.json(
      { error: 'Confira os campos, datas, valores e formatos informados.' },
      { status: 422 },
    );
  console.error('portal_error', e instanceof Error ? e.name : 'Unknown');
  return Response.json({ error: 'Operação indisponível. Tente novamente.' }, { status: 503 });
}
