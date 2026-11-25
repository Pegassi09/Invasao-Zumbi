'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="wrap inside">
      <h1>Conteúdo indisponível</h1>
      <p>Não foi possível consultar os dados agora.</p>
      <button className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
