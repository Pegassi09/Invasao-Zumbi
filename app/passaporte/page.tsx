import { notFound } from 'next/navigation';
import { passportOn } from '@/lib/passport';
import { Passport } from '@/components/passport';
import { PageTitle } from '@/components/page-title';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Passaporte Zumbi', robots: { index: false } };
export default async function Page() {
  if (!(await passportOn())) notFound();
  return (
    <div className="wrap inside">
      <PageTitle
        title="Passaporte Zumbi"
        desc="Acumule um carimbo por loja. Cada visita é confirmada presencialmente pela organização e fica vinculada a este navegador."
      />
      <Passport />
    </div>
  );
}
