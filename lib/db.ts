import { MongoClient, type ClientSession, type Document } from 'mongodb';
import type { Category, Store, Offer, Listing } from './model';
import { todaySP } from './model';
const state = globalThis as typeof globalThis & {
  zumbiClient?: Promise<MongoClient>;
  zumbiIndexes?: Promise<void>;
};
export async function client() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !process.env.MONGODB_DB) throw new Error('Configure o banco de dados do portal.');
  if (!state.zumbiClient)
    state.zumbiClient = new MongoClient(uri, { maxPoolSize: 8, serverSelectionTimeoutMS: 6500 })
      .connect()
      .catch((e) => {
        delete state.zumbiClient;
        throw e;
      });
  return state.zumbiClient;
}
export async function db() {
  return (await client()).db(process.env.MONGODB_DB);
}
export type Rec = Document & { _id: string };
export async function collections() {
  const d = await db();
  return {
    codes: d.collection<Rec>('visitCodes'),
    stamps: d.collection<Rec>('stamps'),
    stores: d.collection<Store>('stores'),
    offers: d.collection<Offer>('offers'),
    categories: d.collection<Category>('categories'),
    admins: d.collection<Rec>('admins'),
    sessions: d.collection<Rec>('sessions'),
    audits: d.collection<Rec>('audits'),
    imports: d.collection<Rec>('imports'),
    lines: d.collection<Rec>('importLines'),
    usage: d.collection<Rec>('usage'),
    limits: d.collection<Rec>('limits'),
    meta: d.collection<Rec>('meta'),
    images: d.collection<Rec>('images'),
  };
}
export async function ready() {
  if (!state.zumbiIndexes)
    state.zumbiIndexes = (async () => {
      const c = await collections();
      await Promise.all([
        c.codes.createIndex({ until: 1 }, { expireAfterSeconds: 0 }),
        c.stamps.createIndex({ visitor: 1 }),
        c.stores.createIndex({ slug: 1 }, { unique: true }),
        c.offers.createIndex({ storeId: 1 }),
        c.categories.createIndex({ name: 1 }, { unique: true }),
        c.admins.createIndex({ email: 1 }, { unique: true }),
        c.sessions.createIndex({ until: 1 }, { expireAfterSeconds: 0 }),
        c.limits.createIndex({ until: 1 }, { expireAfterSeconds: 0 }),
        c.lines.createIndex({ batch: 1 }),
        c.audits.createIndex({ at: -1 }),
        c.imports.createIndex({ at: -1 }),
      ]);
      await c.meta.updateOne(
        { _id: 'catalog' },
        { $setOnInsert: { revision: 0 } },
        { upsert: true },
      );
    })().catch((e) => {
      delete state.zumbiIndexes;
      throw e;
    });
  return state.zumbiIndexes;
}
export async function transaction<T>(fn: (s: ClientSession) => Promise<T>) {
  await ready();
  return (await client()).withSession((s) =>
    s.withTransaction(() => fn(s), {
      writeConcern: { w: 'majority' },
      readConcern: { level: 'snapshot' },
    }),
  );
}
export async function listing(): Promise<Listing[]> {
  const c = await collections(),
    date = todaySP();
  const [stores, offers, categories] = await Promise.all([
    c.stores.find({ active: true }).sort({ name: 1 }).toArray(),
    c.offers
      .find(
        { active: true, $or: [{ end: '' }, { end: { $gte: date } }] },
        { projection: { importKey: 0 } },
      )
      .sort({ _id: 1 })
      .toArray(),
    c.categories.find().toArray(),
  ]);
  return stores.map((s) => ({
    ...s,
    categoryName: categories.find((k) => k._id === s.category)?.name || 'Categoria a confirmar',
    offers: offers.filter((o) => o.storeId === s._id),
  }));
}
export async function audit(action: string, who: string, target: string, session?: ClientSession) {
  await (
    await collections()
  ).audits.insertOne(
    { _id: crypto.randomUUID(), at: new Date().toISOString(), action, who, target },
    { session },
  );
}
