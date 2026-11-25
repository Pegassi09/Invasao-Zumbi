import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { collections, transaction, audit } from './db';
import { Problem, digest } from './security';
export async function passportOn() {
  return !!(await (await collections()).meta.findOne({ _id: 'passport' }))?.enabled;
}
export async function managePassport(data: unknown, who: string) {
  const action = z
    .discriminatedUnion('op', [
      z.object({ op: z.literal('enable'), enabled: z.boolean(), confirmed: z.literal(true) }),
      z.object({ op: z.literal('issue'), store: z.uuid(), present: z.literal(true) }),
    ])
    .parse(data);
  return transaction(async (session) => {
    const c = await collections();
    if (action.op === 'enable') {
      await c.meta.updateOne(
        { _id: 'passport' },
        { $set: { enabled: action.enabled } },
        { upsert: true, session },
      );
      await audit(
        action.enabled ? 'Ativou passaporte' : 'Desativou passaporte',
        who,
        'passaporte',
        session,
      );
      return { enabled: action.enabled };
    }
    if (!(await c.meta.findOne({ _id: 'passport', enabled: true }, { session })))
      throw new Problem(409, 'O passaporte está desativado.');
    if (!(await c.stores.findOne({ _id: action.store, active: true }, { session })))
      throw new Problem(422, 'Loja indisponível.');
    const code = randomBytes(6).toString('hex').toUpperCase(),
      until = new Date(Date.now() + 15 * 60_000);
    await c.codes.insertOne(
      { _id: digest(code), store: action.store, until, used: false },
      { session },
    );
    await audit('Confirmou visita e emitiu código', who, action.store, session);
    return { code, until: until.toISOString() };
  });
}
export async function redeem(code: string, visitor: string) {
  return transaction(async (session) => {
    const c = await collections();
    if (!(await c.meta.findOne({ _id: 'passport', enabled: true }, { session })))
      throw new Problem(404, 'Passaporte indisponível.');
    const ticket = await c.codes.findOneAndUpdate(
      { _id: digest(code), used: false, until: { $gt: new Date() } },
      { $set: { used: true } },
      { session, returnDocument: 'after' },
    );
    if (!ticket || !(await c.stores.findOne({ _id: ticket.store, active: true }, { session })))
      throw new Problem(422, 'Código inválido, expirado ou já utilizado.');
    await c.stamps.updateOne(
      { _id: visitor + '-' + ticket.store },
      { $setOnInsert: { visitor, store: ticket.store, created: new Date() } },
      { session, upsert: true },
    );
    return { ok: true };
  });
}
