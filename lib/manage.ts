import { z } from 'zod';
import { collections, transaction, audit } from './db';
import { slugify } from './model';
import { Problem } from './security';
const short = z.string().trim().max(240);
const date = z.union([z.literal(''), z.iso.date()]);
const tel = z.string().regex(/^$|^\+?[\d ()-]{8,24}$/);
const store = z
  .object({
    name: short.min(1),
    address: short,
    category: short,
    description: z.string().trim().max(3000),
    phone: tel,
    whatsapp: tel,
    hours: short,
    image: z.string().regex(/^$|^\/api\/imagens\/[a-f0-9-]{36}$/),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    locationSource: short.or(z.string().max(1000)),
    active: z.boolean(),
    featured: z.boolean(),
  })
  .strict()
  .refine(
    (s) => (s.lat === null) === (s.lng === null) && (s.lat === null || !!s.locationSource.trim()),
  );
const offer = z
  .object({
    storeId: short.min(1),
    title: z.string().trim().min(1).max(1800),
    conditions: z.string().trim().max(9000),
    start: date,
    end: date,
    active: z.boolean(),
    featured: z.boolean(),
  })
  .strict()
  .refine((o) => !o.start || !o.end || o.start <= o.end);
const command = z
  .object({
    entity: z.enum(['store', 'offer', 'category']),
    id: short.optional(),
    op: z.enum(['save', 'delete']),
    value: z.unknown().optional(),
    confirmed: z.boolean().optional(),
    version: z.string().optional(),
  })
  .strict();
export async function mutate(data: unknown, who: string) {
  const cmd = command.parse(data),
    id = cmd.id || crypto.randomUUID(),
    now = new Date().toISOString();
  return transaction(async (session) => {
    const c = await collections();
    await c.meta.updateOne({ _id: 'catalog' }, { $inc: { revision: 1 } }, { session });
    const coll =
      cmd.entity === 'store' ? c.stores : cmd.entity === 'offer' ? c.offers : c.categories;
    const prev = cmd.id ? await coll.findOne({ _id: id }, { session }) : null;
    if (cmd.id && !prev) throw new Problem(404, 'Registro não encontrado.');
    if (prev && 'updated' in prev && cmd.version !== prev.updated)
      throw new Problem(409, 'Registro alterado. Reabra o cadastro.');
    if (cmd.op === 'delete') {
      if (!cmd.confirmed || !cmd.id) throw new Problem(400, 'Confirme a exclusão.');
      if (
        cmd.entity === 'category' &&
        (await c.stores.countDocuments({ category: id }, { session }))
      )
        throw new Problem(409, 'A categoria está em uso.');
      if (cmd.entity === 'store') await c.offers.deleteMany({ storeId: id }, { session });
      await coll.deleteOne({ _id: id }, { session });
    } else if (cmd.entity === 'store') {
      const s = store.parse(cmd.value);
      if (
        prev &&
        'address' in prev &&
        'lat' in prev &&
        'lng' in prev &&
        'locationSource' in prev &&
        prev.address !== s.address &&
        s.lat !== null &&
        prev.lat === s.lat &&
        prev.lng === s.lng &&
        prev.locationSource === s.locationSource
      )
        throw new Problem(
          422,
          'O endereço mudou. Confira a fonte e as coordenadas ou retire o ponto antigo.',
        );
      if (s.category && !(await c.categories.findOne({ _id: s.category }, { session })))
        throw new Problem(422, 'Categoria inexistente.');
      if (
        s.image &&
        !(await c.images.findOne(
          { _id: s.image.split('/').pop()! },
          { session, projection: { _id: 1 } },
        ))
      )
        throw new Problem(422, 'Imagem inexistente.');
      if (prev && 'active' in prev && prev.active && !s.active && !cmd.confirmed)
        throw new Problem(400, 'Confirme a desativação.');
      await c.stores.updateOne(
        { _id: id },
        {
          $set: { ...s, updated: now },
          $setOnInsert: { created: now, slug: slugify(s.name) + '-' + id.slice(0, 8) },
        },
        { upsert: true, session },
      );
    } else if (cmd.entity === 'offer') {
      const o = offer.parse(cmd.value);
      if (!(await c.stores.findOne({ _id: o.storeId }, { session })))
        throw new Problem(422, 'Loja inexistente.');
      if (prev && 'active' in prev && prev.active && !o.active && !cmd.confirmed)
        throw new Problem(400, 'Confirme a desativação.');
      await c.offers.updateOne(
        { _id: id },
        { $set: { ...o, updated: now }, $setOnInsert: { created: now } },
        { upsert: true, session },
      );
    } else {
      const { name } = z
        .object({ name: short.min(1) })
        .strict()
        .parse(cmd.value);
      if (await c.categories.findOne({ _id: { $ne: id }, name }, { session }))
        throw new Problem(409, 'Categoria já cadastrada.');
      await c.categories.updateOne({ _id: id }, { $set: { name } }, { upsert: true, session });
    }
    await audit(
      { store: 'Loja', offer: 'Promoção', category: 'Categoria' }[cmd.entity] +
        ' · ' +
        (cmd.op === 'delete' ? 'exclusão' : prev ? 'edição' : 'cadastro'),
      who,
      id,
      session,
    );
    return { id };
  });
}
