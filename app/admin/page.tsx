import { redirect } from 'next/navigation';
import { principal } from '@/lib/security';
import { Dashboard } from '@/components/admin/dashboard';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administração', robots: { index: false, follow: false } };
export default async function Page() {
  if (!(await principal())) redirect('/admin/entrar');
  return (
    <div className="wrap inside">
      <Dashboard />
    </div>
  );
}
