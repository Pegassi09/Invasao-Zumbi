import { collections } from '@/lib/db';
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const image = await (await collections()).images.findOne({ _id: id });
  return image
    ? new Response(new Uint8Array(image.data.buffer), {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    : new Response(null, { status: 404 });
}
