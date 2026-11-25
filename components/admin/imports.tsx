'use client';
import { useState } from 'react';
import { Upload } from 'lucide-react';
import { request, formatDate, type Batch, type BatchLine } from './client';
export function Imports({ batches, refresh }: { batches: Batch[]; refresh: () => void }) {
  const [file, F] = useState<File | null>(null),
    [info, I] = useState<Batch | null>(null),
    [lines, L] = useState<BatchLine[]>([]),
    [busy, B] = useState(false),
    [note, N] = useState(''),
    [filter, Q] = useState(''),
    [policy, P] = useState('');
  async function open(id: string) {
    const data = await request('historico?id=' + id);
    I(data.info);
    L(data.lines);
    Q('');
    P('');
  }
  async function action(fn: () => Promise<void>) {
    B(true);
    N('');
    try {
      await fn();
    } catch (ex) {
      N((ex as Error).message);
    } finally {
      B(false);
    }
  }
  return (
    <div className="stack">
      <form
        className="adminform stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (file)
            void action(async () => {
              const r = await request('importar?nome=' + encodeURIComponent(file.name), file, true);
              await open(r.id);
              refresh();
              N('Prévia gerada. Confira as linhas antes de confirmar.');
            });
        }}
      >
        <h2>Importar planilha</h2>
        <label>
          Arquivo XLSX ou CSV · até 3 MB
          <input
            type="file"
            required
            accept=".xlsx,.csv"
            onChange={(e) => F(e.target.files?.[0] || null)}
          />
        </label>
        <button className="button secondary" disabled={busy || !file}>
          <Upload size={16} /> Gerar prévia
        </button>
      </form>
      {note && (
        <p role="status" className="notice">
          {note}
        </p>
      )}
      {info && (
        <div className="adminform stack">
          <div className="between">
            <h2>{info.file}</h2>
            <button className="textlink" onClick={() => I(null)}>
              Fechar
            </button>
          </div>
          <p>
            {info.status} · {formatDate(info.at)}
          </p>
          <div className="summarychips">
            {Object.entries(info.summary || {}).map(([k, n]) => (
              <span key={k}>
                <b>{n}</b> {k}
              </span>
            ))}
          </div>
          <p>
            Contatos de origem ficam no histórico privado. Linhas ocultas e recusas ficam
            disponíveis para conferência. Cadastros existentes preservam as edições do painel.
          </p>
          {!!info.replaced?.length && (
            <div className="stack">
              <details>
                <summary>{info.replaced.length} ofertas anteriores divergentes</summary>
                {info.replaced.map((o) => (
                  <p key={o.id}>
                    {o.store} · {o.title}
                  </p>
                ))}
              </details>
              {info.status === 'prévia' && (
                <label>
                  Tratamento das ofertas anteriores
                  <select value={policy} onChange={(e) => P(e.target.value)} required>
                    <option value="">Escolha antes de confirmar</option>
                    <option value="acrescentar">Manter anteriores e acrescentar novas</option>
                    <option value="substituir">
                      Desativar as divergentes listadas e cadastrar novas
                    </option>
                  </select>
                </label>
              )}
            </div>
          )}
          {info.status === 'prévia' && (
            <button
              className="button primary"
              disabled={busy || (!!info.replaced?.length && !policy)}
              onClick={() => {
                if (confirm('Confirmar a aplicação desta prévia no catálogo?'))
                  void action(async () => {
                    const r = await request('confirmar', {
                      id: info._id,
                      confirmed: true,
                      policy: policy || undefined,
                    });
                    await open(info._id);
                    refresh();
                    N(
                      r.lojasCriadas +
                        ' lojas criadas e ' +
                        r.promocoesCriadas +
                        ' promoções acrescentadas.',
                    );
                  });
              }}
            >
              Confirmar importação
            </button>
          )}
          <input
            className="admsearch"
            aria-label="Buscar linha"
            placeholder="Buscar loja, aba ou ocorrência"
            value={filter}
            onChange={(e) => Q(e.target.value)}
          />
          <div className="historyrows">
            {lines
              .filter((l) =>
                (l.row.name + ' ' + l.row.sheet + ' ' + l.action + ' ' + l.issues.join(' '))
                  .toLocaleLowerCase()
                  .includes(filter.toLocaleLowerCase()),
              )
              .map((l) => (
                <details key={l._id}>
                  <summary>
                    {l.row.name || 'Sem nome'} · {l.row.sheet} / linha {l.row.line} · {l.action}
                  </summary>
                  <p>{l.issues.join(' · ')}</p>
                  <dl>
                    {Object.entries(l.row.raw).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {l.row.offers.map((o, i) => (
                    <p key={i}>
                      {o.title} · {o.conditions} {o.review && ' · Revisão obrigatória'}
                    </p>
                  ))}
                </details>
              ))}
          </div>
        </div>
      )}
      <h2>Histórico de importações</h2>
      {batches.map((b) => (
        <button
          key={b._id}
          className="listbutton"
          disabled={busy}
          onClick={() => action(() => open(b._id))}
        >
          <span>{b.file}</span>
          <small>
            {formatDate(b.at)} · {b.status}
          </small>
        </button>
      ))}
      {!batches.length && <p>Nenhuma importação registrada.</p>}
    </div>
  );
}
