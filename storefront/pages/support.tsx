import React, { useState } from 'react';
import SeoHead from '../components/SeoHead';
import { apiFetch } from '../utils/api';

export default function SupportPage() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const response = await apiFetch('/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, subject, message })
    });

    if (!response.ok) {
      setStatus('Não foi possível enviar o chamado.');
      return;
    }

    setEmail('');
    setSubject('');
    setMessage('');
    setStatus('Chamado enviado! Em breve entraremos em contato.');
  }

  return (
    <>
      <SeoHead title="Suporte | Loja Online" description="Abra um chamado e fale com o suporte." />
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Suporte</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Assunto"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <textarea
            placeholder="Mensagem"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full border rounded px-3 py-2 min-h-[120px]"
            required
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold w-full">Enviar</button>
        </form>
        {status && <p className="mt-4 text-center">{status}</p>}
      </main>
    </>
  );
}
