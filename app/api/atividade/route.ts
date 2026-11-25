import { z } from 'zod';
import { collections } from '@/lib/db';
import { failure, jsonBody, limit, Problem, sameOrigin } from '@/lib/security';
import { todaySP } from '@/lib/model';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await limit(req, 'visita', 240, 60000);
    const { kind, id } = z
      .object({
        kind: z.enum(['loja', 'oferta', 'localização', 'compartilhamento']),
        id: z.union([z.uuid(), z.literal('inicio'), z.literal('mapa')]),
      })
      .strict()
      .parse(await jsonBody(req));
    const c = await collections();
    let found = false;
    if (kind === 'compartilhamento' && ['inicio', 'mapa'].includes(id)) found = true;
    if (!found && kind !== 'oferta')
      found = !!(await c.stores.findOne({ _id: id, active: true }, { projection: { _id: 1 } }));
    if (!found && ['oferta', 'compartilhamento'].includes(kind)) {
      const o = await c.offers.findOne({
        _id: id,
        active: true,
        $or: [{ end: '' }, { end: { $gte: todaySP() } }],
      });
      found = !!(
        o && (await c.stores.findOne({ _id: o.storeId, active: true }, { projection: { _id: 1 } }))
      );
    }
    if (!found) throw new Problem(404, 'Registro inexistente.');
    await c.usage.updateOne(
      { _id: kind + '-' + id },
      { $inc: { count: 1 }, $set: { kind, target: id } },
      { upsert: true },
    );
    return new Response(null, { status: 204 });
  } catch (e) {
    return failure(e);
  }
}
