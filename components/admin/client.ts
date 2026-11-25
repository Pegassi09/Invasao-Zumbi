'use client';
import type { Store, Offer, Category } from '@/lib/model';
export type Batch = {
  replaced?: { id: string; store: string; title: string }[];
  _id: string;
  file: string;
  at: string;
  status: string;
  summary?: Record<string, number>;
  result?: Record<string, number>;
  error?: string;
};
export type BatchLine = {
  _id: string;
  row: {
    sheet: string;
    line: number;
    name: string;
    address: string;
    hidden: boolean;
    raw: Record<string, string>;
    offers: { title: string; conditions: string; review?: boolean }[];
  };
  action: string;
  issues: string[];
  storeId?: string;
};
export type Data = {
  passport: boolean;
  stores: Store[];
  offers: Offer[];
  categories: Category[];
  usage: { kind: string; target: string; count: number }[];
  imports: Batch[];
  audits: { _id: string; action: string; who: string; target: string; at: string }[];
};
export async function request(path: string, body?: unknown, raw = false) {
  const res = await fetch(
    '/api/admin/' + path,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: raw ? {} : { 'Content-Type': 'application/json' },
          body: raw ? (body as Blob) : JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir.');
  return data;
}
export const formatDate = (t: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(t));
