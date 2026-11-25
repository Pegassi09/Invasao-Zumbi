'use client';
import { useState } from 'react';
import { blankStore, type Store, type Offer, type Category } from '@/lib/model';
import { request, type Data } from './client';
export type Entity = 'store' | 'offer' | 'category';
export type Edit = { kind: Entity; record?: Store | Offer | Category; initialStore?: string };
export function Editor({
  edit,
  data,
  done,
  close,
}: {
  edit: Edit;
  data: Data;
  done: () => void;
  close: () => void;
}) {
  const { kind, record } = edit;
  const base =
    kind === 'store'
      ? blankStore()
      : kind === 'offer'
        ? {
            storeId: edit.initialStore || data.stores[0]?._id || '',
            title: '',
            conditions: '',
            start: '',
            end: '',
            active: true,
            featured: false,
          }
        : { name: '' };
  type Value = Record<string, string | number | boolean | null>;
  const [value, V] = useState<Value>(() =>
    Object.fromEntries(
      Object.keys(base).map((k) => [k, (record as unknown as Value)?.[k] ?? (base as Value)[k]]),
    ),
  );
  const [busy, B] = useState(false),
    [error, E] = useState(''),
    [upload, U] = useState('');
  const set = (key: string, v: string | boolean | number | null) => V((o) => ({ ...o, [key]: v }));
  const field = (key: string, label: string, type = 'text', required = false) => (
    <label key={key}>
      {label}
      <input
        type={type}
        step={type === 'number' ? 'any' : undefined}
        value={String(value[key] ?? '')}
        required={required}
        maxLength={key === 'title' ? 1800 : 240}
        onChange={(e) =>
          set(
            key,
            type === 'number'
              ? e.target.value === ''
                ? null
                : Number(e.target.value)
              : e.target.value,
          )
        }
      />
    </label>
  );
  const area = (key: string, label: string) => (
    <label>
      {label}
      <textarea
        value={String(value[key] || '')}
        rows={4}
        maxLength={key === 'conditions' ? 9000 : 3000}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );
  async function save(remove = false) {
    const turningOff = record && 'active' in record && record.active && !value.active;
    if (
      (remove || turningOff) &&
      !confirm(
        remove
          ? 'Excluir este registro? A exclusão de uma loja inclui suas promoções.'
          : 'Desativar a exibição pública deste registro?',
      )
    )
      return;
    B(true);
    E('');
    try {
      await request('salvar', {
        entity: kind,
        id: record?._id,
        version: record && 'updated' in record ? record.updated : undefined,
        op: remove ? 'delete' : 'save',
        value,
        confirmed: !!(remove || turningOff),
      });
      done();
    } catch (ex) {
      E((ex as Error).message);
    } finally {
      B(false);
    }
  }
  return (
    <form
      className="adminform stack"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="between">
        <h2>
          {record ? 'Editar' : 'Cadastrar'}{' '}
          {kind === 'store' ? 'loja' : kind === 'offer' ? 'promoção' : 'categoria'}
        </h2>
        <button type="button" className="textlink" onClick={close}>
          Fechar
        </button>
      </div>
      {kind !== 'offer' && field('name', 'Nome', 'text', true)}
      {kind === 'store' && (
        <>
          <label>
            Categoria
            <select
              aria-label="Categoria"
              value={String(value.category)}
              onChange={(e) => set('category', e.target.value)}
            >
              <option value="">A confirmar</option>
              {data.categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {area('description', 'Descrição')}
          {field('address', 'Endereço completo')}
          <div className="formpair">
            {field('lat', 'Latitude', 'number')}
            {field('lng', 'Longitude', 'number')}
          </div>
          {field(
            'locationSource',
            'Fonte da localização ou confirmação do responsável',
            'text',
            value.lat !== null,
          )}
          <div className="formpair">
            {field('phone', 'Telefone público', 'tel')}
            {field('whatsapp', 'WhatsApp comercial público', 'tel')}
          </div>
          {field('hours', 'Horário de funcionamento')}
          <label>
            Logotipo ou foto (JPG, PNG, WebP · até 3 MB)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                B(true);
                U('Enviando imagem…');
                try {
                  const r = await request('imagem', f, true);
                  set('image', r.url);
                  U('Imagem enviada. Salve o cadastro.');
                } catch (ex) {
                  U((ex as Error).message);
                } finally {
                  B(false);
                }
              }}
            />
          </label>
          {value.image && (
            <div className="row">
              <img width={90} src={String(value.image)} alt="Imagem do cadastro" />
              <button className="textlink" type="button" onClick={() => set('image', '')}>
                Remover do cadastro
              </button>
            </div>
          )}
          {upload && <p role="status">{upload}</p>}
        </>
      )}
      {kind === 'offer' && (
        <>
          <label>
            Loja
            <select
              aria-label="Loja"
              value={String(value.storeId)}
              required
              onChange={(e) => set('storeId', e.target.value)}
            >
              {data.stores.map((s) => (
                <option value={s._id} key={s._id}>
                  {s.name} · {s.address}
                </option>
              ))}
            </select>
          </label>
          {field('title', 'Oferta / desconto', 'text', true)}
          {area('conditions', 'Condições de utilização')}
          <div className="formpair">
            {field('start', 'Início da validade', 'date')}
            {field('end', 'Fim da validade', 'date')}
          </div>
        </>
      )}
      {kind !== 'category' && (
        <div className="row">
          {[
            ['active', 'Ativo no portal'],
            ['featured', 'Destacar na vitrine'],
          ].map(([k, t]) => (
            <label className="check" key={k}>
              <input
                type="checkbox"
                checked={Boolean(value[k])}
                onChange={(e) => set(k, e.target.checked)}
              />
              {t}
            </label>
          ))}
        </div>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button className="button primary" disabled={busy}>
          {busy ? 'Processando…' : 'Salvar cadastro'}
        </button>
        {record && (
          <button
            type="button"
            className="button danger"
            disabled={busy}
            onClick={() => save(true)}
          >
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
