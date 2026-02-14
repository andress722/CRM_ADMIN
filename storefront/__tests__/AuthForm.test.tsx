import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthForm from '../components/AuthForm';
import { NotificationProvider } from '../context/NotificationContext';

describe('AuthForm', () => {
  it('handles login and shows notification', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'token', refreshToken: 'refresh' })
    });
    global.fetch = fetchMock as any;
    render(
      <NotificationProvider>
        <AuthForm />
      </NotificationProvider>
    );
    fireEvent.change(screen.getByPlaceholderText(/E-mail/i), { target: { value: 'user@email.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Senha/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    const notifications = await screen.findAllByText(/Login realizado com sucesso/i, {}, { timeout: 2000 });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('handles password recovery and shows notification', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as any;
    render(
      <NotificationProvider>
        <AuthForm />
      </NotificationProvider>
    );
    fireEvent.click(screen.getByText(/Esqueci minha senha/i));
    fireEvent.change(screen.getByPlaceholderText(/E-mail/i), { target: { value: 'user@email.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar recuperação/i }));
    const notifications = await screen.findAllByText(/E-mail de recuperação enviado/i, {}, { timeout: 2000 });
    expect(notifications.length).toBeGreaterThan(0);
  });
});
