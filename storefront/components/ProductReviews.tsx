// Componente de avaliações/reviews de produto

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useNotification } from '../context/NotificationContext';

interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [user, setUser] = useState('');
  const [success, setSuccess] = useState(false);
  const { notify } = useNotification();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiFetch(`/products/${productId}/reviews`, { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setReviews(data || []);
      } catch (err) {
        console.error('Failed to load reviews', err);
      }
    }
    load();
    return () => { mounted = false; };
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !comment || rating < 1) {
      notify('Preencha todos os campos e selecione uma nota.', 'error');
      return;
    }
    try {
      const res = await apiFetch(`/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, rating, comment })
      });
      if (!res.ok) {
        notify('Erro ao enviar avaliação.', 'error');
        return;
      }
      const created = await res.json();
      setReviews([...(reviews || []), created]);
      setUser('');
      setComment('');
      setRating(0);
      setSuccess(true);
      notify('Avaliação enviada com sucesso!', 'success');
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      notify('Erro de rede ao enviar avaliação.', 'error');
    }
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold mb-2">Avaliações</h3>
      <ul className="mb-4">
        {reviews.map(r => (
          <li key={r.id} className="mb-2 border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{r.user}</span>
              <span className="text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <span className="text-xs text-gray-400">{r.date}</span>
            </div>
            <p className="text-sm text-gray-700">{r.comment}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="border rounded p-4 bg-gray-50">
        <h4 className="font-semibold mb-2">Deixe sua avaliação</h4>
        <input
          type="text"
          placeholder="Seu nome"
          value={user}
          onChange={e => setUser(e.target.value)}
          className="w-full border rounded px-2 py-1 mb-2"
          required
        />
        <textarea
          placeholder="Comentário"
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="w-full border rounded px-2 py-1 mb-2"
          required
        />
        <div className="mb-2">
          <span className="mr-2">Nota:</span>
          {[1,2,3,4,5].map(n => (
            <button
              type="button"
              key={n}
              className={`text-xl ${rating >= n ? 'text-yellow-500' : 'text-gray-300'}`}
              onClick={() => setRating(n)}
              aria-label={`Nota ${n}`}
            >
              ★
            </button>
          ))}
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold mt-2">Enviar avaliação</button>
        {success && <div className="text-green-600 mt-2">Avaliação enviada!</div>}

        </form>
      </div>
    );
  }
