'use client';
import { useState, useEffect, useCallback } from 'react';
import { LogOut, Plus, RefreshCw } from 'lucide-react';
import { request, formatDate, type Data } from './client';
import { Editor, type Edit, type Entity } from './editor';
import { PassportAdmin } from './passport';
import { Imports } from './imports';
import { normalize, todaySP } from '@/lib/model';
export function Dashboard() {
  const [data, D] = useState<Data | null>(null),
    [tab, T] = useState('Visão geral'),
    [edit, E] = useState<Edit | null>(null),
    [q, Q] = useState(''),
    [note, N] = useState(''),
    [error, X] = useState('');
  const refresh = useCallback(async () => {
    try {
      D(await request('dados'));
      X('');
    } catch (ex) {
      X((ex as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const select = (name: string) => {
    T(name);
    E(null);
    Q('');
    N('');
  };
  const open = (e: Edit) => {
    E(e);
    N('');
  };
  return (
    <>
      <div className="between">
        <div className="pagetitle">
          <div className="kicker">ORGANIZAÇÃO DO EVENTO</div>
          <h1>Painel administrativo</h1>
        </div>
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await request('sair', {});
              location.href = '/admin/entrar';
            } catch (ex) {
              X((ex as Error).message);
            }
          }}
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
      <div className="tabs admintabs">
        {[
          'Visão geral',
          'Lojas',
          'Promoções',
          'Categorias',
          'Importações',
          'Pendências',
          'Passaporte',
          'Auditoria',
        ].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => select(t)}>
            {t}
          </button>
        ))}
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}{' '}
          <button className="textlink" onClick={refresh}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </p>
      )}
      {note && (
        <p role="status" className="notice">
          {note}
        </p>
      )}
      {!data ? (
        <p>Carregando cadastros…</p>
      ) : edit ? (
        <Editor
          key={edit.kind + (edit.record?._id || 'nova')}
          edit={edit}
          data={data}
          close={() => E(null)}
          done={() => {
            E(null);
            N('Alteração salva.');
            void refresh();
          }}
        />
      ) : tab === 'Passaporte' ? (
        <PassportAdmin enabled={data.passport} stores={data.stores} refresh={refresh} />
      ) : tab === 'Importações' ? (
        <Imports batches={data.imports} refresh={refresh} />
      ) : tab === 'Visão geral' ? (
        <>
          <div className="admetrics">
            {[
              [data.stores.length, 'Lojas cadastradas'],
              [
                data.offers.filter(
                  (o) =>
                    o.active &&
                    (!o.end || o.end >= todaySP()) &&
                    data.stores.some((s) => s.active && s._id === o.storeId),
                ).length,
                'Ofertas disponíveis',
              ],
              [data.categories.length, 'Categorias'],
              [
                data.usage.filter((a) => a.kind === 'localização').reduce((a, u) => a + u.count, 0),
                'Cliques em localização',
              ],
              [
                data.usage
                  .filter((a) => a.kind === 'compartilhamento')
                  .reduce((a, u) => a + u.count, 0),
                'Compartilhamentos',
              ],
            ].map(([n, t]) => (
              <div className="panel" key={t}>
                <h2>{n}</h2>
                <p>{t}</p>
              </div>
            ))}
          </div>
          <div className="formpair">
            {['loja', 'oferta'].map((k) => (
              <section className="panel" key={k}>
                <h2>{k === 'loja' ? 'Lojas mais vistas' : 'Promoções mais acessadas'}</h2>
                {data.usage
                  .filter((a) => a.kind === k)
                  .slice(0, 10)
                  .map((a) => (
                    <div className="listbutton" key={a.target}>
                      <span>
                        {data.stores.find((s) => s._id === a.target)?.name ||
                          data.offers.find((o) => o._id === a.target)?.title ||
                          'Cadastro excluído'}
                      </span>
                      <b>{a.count}</b>
                    </div>
                  ))}
                {!data.usage.some((a) => a.kind === k) && <p>Ainda sem acessos registrados.</p>}
              </section>
            ))}
          </div>
        </>
      ) : tab === 'Auditoria' ? (
        <section className="stack">
          <h2>Operações recentes</h2>
          {data.audits.map((a) => (
            <div className="auditrow" key={a._id}>
              <b>{a.action}</b>
              <span>
                {a.who} · {formatDate(a.at)}
              </span>
              <small>{a.target}</small>
            </div>
          ))}
        </section>
      ) : tab === 'Pendências' ? (
        <section className="stack">
          <h2>Cadastros para conferência</h2>
          {data.stores
            .map((s) => ({
              s,
              issues: [
                s.lat === null && 'Coordenadas',
                !s.address && 'Endereço',
                !s.category && 'Categoria',
                !s.whatsapp && !s.phone && 'Contato comercial público',
                !data.offers.some((o) => o.storeId === s._id && o.active) && 'Ofertas',
              ].filter(Boolean),
            }))
            .filter((x) => x.issues.length)
            .map(({ s, issues }) => (
              <button
                className="listbutton"
                key={s._id}
                onClick={() => open({ kind: 'store', record: s })}
              >
                {s.name}
                <small>{issues.join(' · ')}</small>
              </button>
            ))}
          {data.offers
            .filter((o) => !o.active)
            .map((o) => (
              <button
                className="listbutton"
                key={o._id}
                onClick={() => open({ kind: 'offer', record: o })}
              >
                {o.title}
                <small>Oferta inativa · {data.stores.find((s) => s._id === o.storeId)?.name}</small>
              </button>
            ))}
        </section>
      ) : (
        <section className="stack">
          <div className="between">
            <h2>{tab}</h2>
            <button
              className="button primary"
              onClick={() =>
                open({
                  kind: (
                    { Lojas: 'store', Promoções: 'offer', Categorias: 'category' } as Record<
                      string,
                      Entity
                    >
                  )[tab],
                })
              }
            >
              <Plus size={16} /> Cadastrar
            </button>
          </div>
          <input
            className="admsearch"
            aria-label="Buscar cadastro"
            placeholder="Buscar cadastro…"
            value={q}
            onChange={(e) => Q(e.target.value)}
          />
          {tab === 'Lojas' &&
            data.stores
              .filter((s) => normalize(s.name + ' ' + s.address).includes(normalize(q)))
              .map((s) => (
                <button
                  className="listbutton"
                  key={s._id}
                  onClick={() => open({ kind: 'store', record: s })}
                >
                  <span>
                    {s.name}
                    <small>{s.address}</small>
                  </span>
                  <small>{s.active ? 'Ativa' : 'Inativa'} · Editar</small>
                </button>
              ))}
          {tab === 'Promoções' &&
            data.offers
              .map((o) => ({ o, s: data.stores.find((s) => s._id === o.storeId) }))
              .filter(({ o, s }) => normalize(o.title + ' ' + s?.name).includes(normalize(q)))
              .map(({ o, s }) => (
                <button
                  className="listbutton"
                  key={o._id}
                  onClick={() => open({ kind: 'offer', record: o })}
                >
                  <span>
                    {o.title}
                    <small>{s?.name}</small>
                  </span>
                  <small>{o.active ? 'Ativa' : 'Inativa'} · Editar</small>
                </button>
              ))}
          {tab === 'Categorias' &&
            data.categories
              .filter((c) => normalize(c.name).includes(normalize(q)))
              .map((c) => (
                <button
                  className="listbutton"
                  key={c._id}
                  onClick={() => open({ kind: 'category', record: c })}
                >
                  {c.name}
                  <small>Editar</small>
                </button>
              ))}
        </section>
      )}
    </>
  );
}
