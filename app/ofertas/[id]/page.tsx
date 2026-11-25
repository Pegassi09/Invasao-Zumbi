import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Ticket, ChevronRight } from 'lucide-react';
import { findOffer } from '@/lib/details';
import { storeName } from '@/lib/view';
import { Share, Visit } from '@/components/actions';
import { MiniMap } from '@/components/map';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const f = await findOffer((await params).id);
  if (!f) return {};
  const title = f.o.title + ' · ' + storeName(f.s.name),
    description = f.o.conditions || 'Oferta da Invasão Zumbi em Marília.';
  return {
    title,
    description,
    alternates: { canonical: '/ofertas/' + f.o._id },
    openGraph: { title, description, images: [f.s.image || '/arte/social.jpg'] },
  };
}
export default async function Page({ params }: Props) {
  const f = await findOffer((await params).id);
  if (!f) notFound();
  const { s, o } = f;
  return (
    <div className="wrap inside">
      <Visit kind="oferta" id={o._id} />
      <div className="crumb">
        <Link href="/ofertas">Ofertas</Link>
        <ChevronRight size={13} />
        {storeName(s.name)}
      </div>
      <div className="detailgrid">
        <section className="coupon offerpage">
          <div className="kicker">
            <Ticket size={16} />
            {o.featured ? 'OFERTA ESPECIAL' : 'OFERTA DA LOJA'}
          </div>
          <h1>{o.title}</h1>
          <Link className="textlink" href={'/lojas/' + s.slug}>
            {storeName(s.name)} <ArrowRight size={15} />
          </Link>
          <h2>Condições da oferta</h2>
          <p>{o.conditions || 'Consulte as condições diretamente com o estabelecimento.'}</p>
          {[
            o.start && 'Início em ' + o.start.split('-').reverse().join('/'),
            o.end && 'Válida até ' + o.end.split('-').reverse().join('/'),
          ]
            .filter(Boolean)
            .map((t) => (
              <p key={t}>{t}</p>
            ))}
          <Share id={o._id} path={'/ofertas/' + o._id} title={s.name + ' — ' + o.title} />
        </section>
        <MiniMap store={s} />
      </div>
    </div>
  );
}
