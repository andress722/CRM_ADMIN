// Formulário de autenticação (login/registro)

import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { apiFetch } from '../utils/api';
import { setTokens } from '../utils/auth';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { notify } = useNotification();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (forgotMode) {
      try {
        const response = await apiFetch('/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
          skipAuth: true
        });
        setLoading(false);
        if (response.ok) {
          setForgotSuccess(true);
          notify('E-mail de recuperação enviado!', 'success');
        } else {
          setError('Informe o e-mail para recuperar a senha.');
          notify('Informe o e-mail para recuperar a senha.', 'error');
        }
      } catch {
        setLoading(false);
        setError('Erro ao enviar recuperação.');
        notify('Erro ao enviar recuperação.', 'error');
      }
      return;
    }
    try {
      if (isLogin) {
        const response = await apiFetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          skipAuth: true
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          if (response.status === 403 && body?.message?.toString().includes('Email not verified')) {
            setShowResend(true);
            throw new Error('E-mail não verificado. Reenvie a verificação.');
          }
          throw new Error('Login inválido');
        }

        const data = await response.json();
        setTokens(data.accessToken, data.refreshToken);
        setLoading(false);
        setSuccess(true);
        notify('Login realizado com sucesso!', 'success');
      } else {
        const response = await apiFetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
          skipAuth: true
        });

        setLoading(false);
        if (response.ok) {
          setSuccess(true);
          notify('Cadastro realizado com sucesso! Verifique seu e-mail.', 'success');
        } else {
          throw new Error('Cadastro inválido');
        }
      }
    } catch {
      setLoading(false);
      setError('Erro ao autenticar.');
      notify('Erro ao autenticar.', 'error');
    }
  }

  async function handleResendVerification() {
    if (!email) {
      notify('Informe o e-mail para reenviar.', 'error');
      return;
    }
    if (resendCooldown > 0) return;

    setResendLoading(true);
    try {
      const response = await apiFetch('/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        skipAuth: true
      });

      if (response.ok) {
        notify('Verificação reenviada!', 'success');
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        notify('Não foi possível reenviar.', 'error');
      }
    } catch {
      notify('Não foi possível reenviar.', 'error');
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSocialLogin(provider: 'google' | 'facebook') {
    if (!email) {
      notify('Informe o e-mail para continuar.', 'error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`/auth/social/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerUserId: `${provider}-${email}`, email, name: name || 'User' }),
        skipAuth: true
      });

      if (!response.ok) {
        throw new Error('Social login falhou');
      }

      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      setLoading(false);
      setSuccess(true);
      notify('Login realizado com sucesso!', 'success');
    } catch {
      setLoading(false);
      setError('Erro ao autenticar com rede social.');
      notify('Erro ao autenticar com rede social.', 'error');
    }
  }

  return (
    <form className="max-w-md mx-auto p-4 border rounded bg-white shadow" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-4">
        {forgotMode ? 'Recuperar Senha' : isLogin ? 'Login' : 'Registro'}
      </h2>
      {!forgotMode && !isLogin && (
        <input name="name" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-2 py-1 mb-2" required />
      )}
      <input name="email" type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-2 py-1 mb-2" required />
      {!forgotMode && (
        <input name="password" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-2 py-1 mb-2" required />
      )}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && !forgotMode && <div className="text-green-600 mb-2">Sucesso!</div>}
      {forgotSuccess && forgotMode && <div className="text-green-600 mb-2">E-mail de recuperação enviado!</div>}
      {showResend && !forgotMode && (
        <button
          type="button"
          className="mt-2 text-blue-500 underline w-full"
          onClick={handleResendVerification}
          disabled={resendLoading || resendCooldown > 0}
        >
          {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : resendLoading ? 'Reenviando...' : 'Reenviar verificação'}
        </button>
      )}
      <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold w-full" disabled={loading}>
        {loading ? 'Processando...' : forgotMode ? 'Enviar recuperação' : isLogin ? 'Entrar' : 'Registrar'}
      </button>
      {!forgotMode && (
        <button type="button" className="mt-2 text-blue-500 underline w-full" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Criar conta' : 'Já tenho conta'}
        </button>
      )}
      {!forgotMode && (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="w-full border border-gray-300 px-4 py-2 rounded font-semibold"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
          >
            Continuar com Google
          </button>
          <button
            type="button"
            className="w-full border border-gray-300 px-4 py-2 rounded font-semibold"
            onClick={() => handleSocialLogin('facebook')}
            disabled={loading}
          >
            Continuar com Facebook
          </button>
        </div>
      )}
      {!forgotMode && (
        <button type="button" className="mt-2 text-blue-500 underline w-full" onClick={() => setForgotMode(true)}>
          Esqueci minha senha
        </button>
      )}
      {forgotMode && (
        <button type="button" className="mt-2 text-gray-500 underline w-full" onClick={() => { setForgotMode(false); setForgotSuccess(false); }}>
          Voltar ao login
        </button>
      )}
    </form>
  );
}
