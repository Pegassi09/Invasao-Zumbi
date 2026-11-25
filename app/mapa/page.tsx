import { EventMap } from '@/components/map';
import { PageTitle } from '@/components/page-title';
import { listing } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mapa do evento' };
export default async function Page() {
  return (
    <div className="wrap inside">
      <PageTitle
        title="Mapa do evento"
        desc="Escolha uma loja no mapa para consultar a oferta e traçar sua rota."
      />
      <EventMap stores={await listing()} />
    </div>
  );
}
