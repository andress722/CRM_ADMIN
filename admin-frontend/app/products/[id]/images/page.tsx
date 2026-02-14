"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';

export default function ProductImagesPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [images, setImages] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    fetch(endpoints.admin.productImages(id as string), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setImages(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar imagens.');
        setLoading(false);
      });
  }, [id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !id) return;
    setLoading(true);
    setError(null);
    const token = AuthService.getToken();
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(endpoints.admin.productImages(id as string), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Erro ao enviar imagem');
      router.refresh();
    } catch {
      setError('Erro ao enviar imagem.');
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando imagens...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Imagens do Produto</h1>
      <form onSubmit={handleUpload} className="flex flex-col gap-4 mb-4">
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold" disabled={loading || !file}>
          Enviar Imagem
        </button>
      </form>
      <div className="grid grid-cols-2 gap-4">
        {images.map((img, idx) => (
          <Image
            key={idx}
            src={img}
            alt={`Produto ${id}`}
            width={256}
            height={128}
            unoptimized
            className="w-full h-32 object-cover rounded"
          />
        ))}
      </div>
    </div>
  );
}
