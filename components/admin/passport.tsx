'use client';
import { useState } from 'react';
import type { Store } from '@/lib/model';
import { request } from './client';
export function PassportAdmin({
  enabled,
  stores,
  refresh,
}: {
  enabled: boolean;
  stores: Store[];
  refresh: () => void;
}) {
  const [store, S] = useState(stores.find((s) => s.active)?._id || ''),
    [note, N] = useState(''),
    [busy, B] = useState(false);
  async function change(issue: boolean) {
    if (
      !confirm(
        issue
          ? 'Você verificou presencialmente a visita a esta loja?'
          : (enabled ? 'Desativar' : 'Ativar') + ' o Passaporte Zumbi?',
      )
    )
      return;
    B(true);
    try {
      const r = await request(
        'passaporte',
        issue
          ? { op: 'issue', store, present: true }
          : { op: 'enable', enabled: !enabled, confirmed: true },
      );
      N(issue ? 'Código de visita: ' + r.code + ' · expira em 15 minutos.' : 'Configuração salva.');
      refresh();
    } catch (e) {
      N((e as Error).message);
    } finally {
      B(false);
    }
  }
  return (
    <div className="adminform stack">
      <h2>Passaporte Zumbi</h2>
      <p>
        Estado atual: {enabled ? 'ativo' : 'desativado'}. A organização entrega um código de uso
        único após conferir a visita presencialmente.
      </p>
      <button className="button secondary" disabled={busy} onClick={() => change(false)}>
        {enabled ? 'Desativar' : 'Ativar'} passaporte
      </button>
      {enabled && (
        <>
          <label>
            Loja visitada
            <select value={store} onChange={(e) => S(e.target.value)}>
              {stores
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} · {s.address}
                  </option>
                ))}
            </select>
          </label>
          <button className="button primary" disabled={!store || busy} onClick={() => change(true)}>
            Confirmar visita e emitir código
          </button>
          <a href="/passaporte" className="textlink">
            Abrir passaporte do consumidor →
          </a>
        </>
      )}
      {note && (
        <p className="notice" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
