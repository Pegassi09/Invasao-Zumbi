import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { passportOn, redeem } from '@/lib/passport';
import { collections } from '@/lib/db';
import { failure, jsonBody, limit, sameOrigin, digest, Problem } from '@/lib/security';
export async function GET() {
  try {
    if (!(await passportOn())) throw new Problem(404, 'Passaporte desativado.');
    const token = (await cookies()).get('iz_pass')?.value,
      c = await collections();
    const stamps = token ? await c.stamps.find({ visitor: digest(token) }).toArray() : [];
    const stores = await c.stores
      .find({ active: true }, { projection: { _id: 1, name: 1, address: 1 } })
      .toArray();
    return Response.json(
      {
        total: stores.length,
        visited: stores.filter((s) => stamps.some((t) => t.store === s._id)),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await limit(req, 'passaporte', 15, 600_000);
    const { code } = z
      .object({
        code: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-F0-9]{12}$/),
      })
      .parse(await jsonBody(req));
    const jar = await cookies(),
      token = jar.get('iz_pass')?.value || randomBytes(32).toString('hex');
    await redeem(code, digest(token));
    jar.set('iz_pass', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: !!process.env.VERCEL || new URL(req.url).protocol === 'https:',
      path: '/',
      maxAge: 180 * 86400,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
