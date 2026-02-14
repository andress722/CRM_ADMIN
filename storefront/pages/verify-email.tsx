import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export default function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando e‑mail...');
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Token inválido ou ausente.');
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
          setMessage('E‑mail verificado com sucesso.');
        } else {
          setStatus('error');
          setMessage('Token inválido ou expirado.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Não foi possível verificar o e‑mail.');
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
      setMessage('Verificação reenviada. Confira seu e‑mail.');
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
      setMessage('Não foi possível reenviar a verificação.');
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Verificação de E‑mail</h1>
      <p className={status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-600' : ''}>
        {message}
      </p>
      {status === 'error' && (
        <div className="mt-4">
          <input
            type="email"
            placeholder="Seu e‑mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded px-2 py-1 w-full mb-2"
          />
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar verificação'}
          </button>
        </div>
      )}
    </div>
  );
}