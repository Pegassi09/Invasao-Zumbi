import { Login } from '@/components/admin/login';
import { redirect } from 'next/navigation';
import { principal } from '@/lib/security';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acesso administrativo', robots: { index: false, follow: false } };
export default async function Page() {
  if (await principal()) redirect('/admin');
  return (
    <div className="wrap inside">
      <Login />
    </div>
  );
}
