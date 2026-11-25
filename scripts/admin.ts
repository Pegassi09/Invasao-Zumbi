import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { ready, collections, client, audit, transaction } from '../lib/db';
import { hashPassword } from '../lib/security';
async function main() {
  const email = (process.argv[2] || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Error('Uso: npm run admin -- email@dominio.com.br');
  const silent = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output: silent,
    terminal: !!process.stdin.isTTY,
  });
  process.stderr.write('Senha administrativa (mínimo 14 caracteres, entrada oculta): ');
  let pw: string;
  try {
    pw = await rl.question('');
  } finally {
    rl.close();
    process.stderr.write('\n');
  }
  if (pw.length < 14 || pw.length > 198) throw Error('Use entre 14 e 198 caracteres.');
  const password = await hashPassword(pw);
  await ready();
  await transaction(async (session) => {
    const c = await collections(),
      user = await c.admins.findOne({ email }, { session }),
      id = user?._id || crypto.randomUUID();
    await c.admins.updateOne(
      { _id: id },
      { $set: { email, password, active: true, role: 'admin' } },
      { upsert: true, session },
    );
    await c.sessions.deleteMany({ user: id }, { session });
    await audit('Configurou acesso administrativo', 'CLI', id, session);
  });
  console.log('Acesso configurado.');
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.MONGODB_URI) await (await client()).close();
  });
