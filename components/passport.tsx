'use client';
import { useCallback, useEffect, useState } from 'react';
import { Stamp } from 'lucide-react';
export function Passport() {
  const [visited, V] = useState<{ _id: string; name: string; address: string }[]>([]),
    [total, T] = useState(0),
    [note, N] = useState(''),
    [busy, B] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch('/api/passaporte', { cache: 'no-store' }),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    V(d.visited);
    T(d.total);
  }, []);
  useEffect(() => {
    load().catch((e) => N(e.message));
  }, [load]);
  return (
    <div className="stack">
      <form
        className="adminform stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            code = new FormData(form).get('code');
          B(true);
          try {
            const r = await fetch('/api/passaporte', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
              }),
              d = await r.json();
            if (!r.ok) throw Error(d.error);
            await load();
            form.reset();
            N('Carimbo registrado.');
          } catch (ex) {
            N((ex as Error).message);
          } finally {
            B(false);
          }
        }}
      >
        <label>
          Código entregue pela organização na loja
          <input name="code" required minLength={12} maxLength={12} autoComplete="off" />
        </label>
        <button className="button primary" disabled={busy}>
          <Stamp size={17} /> Registrar visita
        </button>
      </form>
      {note && (
        <p className="notice" role="status">
          {note}
        </p>
      )}
      <h2>
        {visited.length} de {total} lojas visitadas
      </h2>
      <progress value={visited.length} max={total || 1} />
      {visited.map((s) => (
        <div className="panel" key={s._id}>
          {s.name} · {s.address}
        </div>
      ))}
    </div>
  );
}
