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
    <form className="section-card w-full max-w-lg" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">InfoTechGamer</p>
          <h2 className="text-2xl font-bold text-slate-900">
            {forgotMode ? 'Recuperar Senha' : isLogin ? 'Login' : 'Registro'}
          </h2>
        </div>
        <span className="chip">InfoTechGamer ID</span>
      </div>
      <p className="text-sm text-slate-600 mb-6">
        {forgotMode
          ? 'Enviaremos um link de recuperacao para o seu e-mail.'
          : isLogin
            ? 'Entre para continuar sua experiencia premium em tecnologia e gaming.'
            : 'Crie sua conta e salve seus setups, alertas e favoritos.'}
      </p>
      {!forgotMode && !isLogin && (
        <input name="name" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="input-field w-full mb-3" required />
      )}
      <input name="email" type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="input-field w-full mb-3" required />
      {!forgotMode && (
        <input name="password" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="input-field w-full mb-3" required />
      )}
      {error && <div className="text-rose-600 mb-2 text-sm">{error}</div>}
      {success && !forgotMode && <div className="text-emerald-600 mb-2 text-sm">Sucesso!</div>}
      {forgotSuccess && forgotMode && <div className="text-emerald-600 mb-2 text-sm">E-mail de recuperação enviado!</div>}
      {showResend && !forgotMode && (
        <button
          type="button"
          className="text-sm text-slate-600 underline w-full text-left"
          onClick={handleResendVerification}
          disabled={resendLoading || resendCooldown > 0}
        >
          {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : resendLoading ? 'Reenviando...' : 'Reenviar verificação'}
        </button>
      )}
      <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
        {loading ? 'Processando...' : forgotMode ? 'Enviar recuperação' : isLogin ? 'Entrar' : 'Registrar'}
      </button>
      {!forgotMode && (
        <button type="button" className="mt-2 text-sm text-slate-600 underline w-full text-left" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Criar conta' : 'Já tenho conta'}
        </button>
      )}
      {!forgotMode && (
        <div className="mt-5 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ou continue com</p>
          <button
            type="button"
            className="btn-ghost w-full text-left"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
          >
            Continuar com Google
          </button>
          <button
            type="button"
            className="btn-ghost w-full text-left"
            onClick={() => handleSocialLogin('facebook')}
            disabled={loading}
          >
            Continuar com Facebook
          </button>
        </div>
      )}
      {!forgotMode && (
        <button type="button" className="mt-3 text-sm text-slate-500 underline w-full text-left" onClick={() => setForgotMode(true)}>
          Esqueci minha senha
        </button>
      )}
      {forgotMode && (
        <button type="button" className="mt-3 text-sm text-slate-500 underline w-full text-left" onClick={() => { setForgotMode(false); setForgotSuccess(false); }}>
          Voltar ao login
        </button>
      )}
    </form>
  );
}
