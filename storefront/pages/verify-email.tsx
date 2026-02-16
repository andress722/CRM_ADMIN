import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import SeoHead from '../components/SeoHead';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';

export default function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando e-mail...');
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Token invalido ou ausente.');
      return;
    }

    apiFetch('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      skipAuth: true
    })
      .then((res) => {
        if (res.ok) {
          setStatus('success');
          setMessage('E-mail verificado com sucesso.');
        } else {
          setStatus('error');
          setMessage('Token invalido ou expirado.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Nao foi possivel verificar o e-mail.');
      });
  }, []);

  async function handleResend() {
    if (!email || cooldown > 0) return;
    const response = await apiFetch('/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      skipAuth: true
    });

    if (response.ok) {
      setMessage('Verificacao reenviada. Confira seu e-mail.');
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setMessage('Nao foi possivel reenviar a verificacao.');
    }
  }

  return (
    <>
      <SeoHead title="Verificacao de E-mail | InfoTechGamer" description="Confirme seu e-mail para liberar sua conta." />
      <main className="page-shell">
        <StorefrontHeader />
        <section className="section-card max-w-lg mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">InfoTechGamer ID</p>
          <h1 className="text-2xl font-bold mb-2">Verificacao de e-mail</h1>
          <p className={status === 'success' ? 'text-emerald-600' : status === 'error' ? 'text-rose-600' : 'text-slate-600'}>
            {message}
          </p>
          {status === 'error' && (
            <div className="mt-5">
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full mb-3"
              />
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="btn-primary w-full"
              >
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar verificacao'}
              </button>
            </div>
          )}
        </section>
        <StorefrontFooter />
      </main>
    </>
  );
}