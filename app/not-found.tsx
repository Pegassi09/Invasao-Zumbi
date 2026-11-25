import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="wrap inside">
      <div className="kicker">404</div>
      <h1>Página não encontrada</h1>
      <p>O endereço pode ter mudado ou a oferta pode ter sido desativada.</p>
      <Link className="button primary" href="/lojas">
        Explorar lojas
      </Link>
    </div>
  );
}
