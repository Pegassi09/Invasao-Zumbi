import { Catalog } from '@/components/catalog';
import { PageTitle } from '@/components/page-title';
import { listing } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lojas participantes' };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q;
  return (
    <div className="wrap inside">
      <PageTitle
        title="Lojas participantes"
        desc="Encontre os estabelecimentos da Invasão Zumbi em Marília."
      />
      <Catalog mode="lojas" stores={await listing()} initial={typeof q === 'string' ? q : ''} />
    </div>
  );
}
