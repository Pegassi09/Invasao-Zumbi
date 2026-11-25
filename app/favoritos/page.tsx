import { Catalog } from '@/components/catalog';
import { PageTitle } from '@/components/page-title';
import { listing } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas favoritas', robots: { index: false } };
export default async function Page() {
  return (
    <div className="wrap inside">
      <PageTitle title="Minhas favoritas" desc="As lojas que você salvou neste dispositivo." />
      <Catalog mode="favoritos" stores={await listing()} />
    </div>
  );
}
