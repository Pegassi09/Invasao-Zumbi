import { Catalog } from '@/components/catalog';
import { PageTitle } from '@/components/page-title';
import { listing } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vitrine de ofertas' };
export default async function Page() {
  return (
    <div className="wrap inside">
      <PageTitle
        title="Vitrine de ofertas"
        desc="Compare descontos, preços especiais e condições de cada promoção."
      />
      <Catalog mode="ofertas" stores={await listing()} />
    </div>
  );
}
