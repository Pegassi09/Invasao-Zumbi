'use client';
import { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { request } from './client';
export function Login() {
  const [err, E] = useState(''),
    [busy, B] = useState(false);
  return (
    <form
      className="logincard stack"
      onSubmit={async (e) => {
        e.preventDefault();
        B(true);
        E('');
        const f = new FormData(e.currentTarget);
        try {
          await request('entrar', Object.fromEntries(f));
          location.href = '/admin';
        } catch (ex) {
          E((ex as Error).message);
        } finally {
          B(false);
        }
      }}
    >
      <Lock size={26} className="acid" />
      <h1>Área administrativa</h1>
      <p>Entre para gerenciar o portal da Invasão Zumbi.</p>
      <label>
        E-mail
        <input name="email" type="email" required autoComplete="username" />
      </label>
      <label>
        Senha
        <input
          name="password"
          type="password"
          required
          maxLength={198}
          autoComplete="current-password"
        />
      </label>
      <button className="button primary" disabled={busy}>
        {busy ? 'Entrando…' : 'Entrar'} <ArrowRight size={16} />
      </button>
      {err && (
        <p className="notice" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}
