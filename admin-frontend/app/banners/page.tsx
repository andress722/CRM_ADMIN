"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';

type Banner = {
  id: string;
  title: string;
  image: string;
  link?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
};

type BannerForm = {
  title: string;
  image: string;
  link: string;
  active: boolean;
  startDate: string;
  endDate: string;
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BannerForm>({
    title: '',
    image: '',
    link: '',
    active: true,
    startDate: '',
    endDate: '',
  });
  const [ordering, setOrdering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BannerForm>({
    title: '',
    image: '',
    link: '',
    active: true,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    fetch(endpoints.admin.banners, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setBanners(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar banners.');
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setEditForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  const startEdit = (banner: Banner) => {
    setEditId(banner.id);
    setEditForm({
      title: banner.title,
      image: banner.image,
      link: banner.link || '',
      active: banner.active,
      startDate: banner.startDate || '',
      endDate: banner.endDate || '',
    });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const token = AuthService.getToken();
    try {
      await fetch(`${endpoints.admin.banners}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      setBanners(list => list.map(b => b.id === id ? { ...b, ...editForm } : b));
      setEditId(null);
    } catch {
      setError('Erro ao editar banner.');
    } finally {
      setSaving(false);
    }
  };

  const removeBanner = async (id: string) => {
    setSaving(true);
    const token = AuthService.getToken();
    try {
      await fetch(`${endpoints.admin.banners}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setBanners(list => list.filter(b => b.id !== id));
    } catch {
      setError('Erro ao remover banner.');
    } finally {
      setSaving(false);
    }
  };

  const moveBanner = async (id: string, direction: 'up' | 'down') => {
    setOrdering(true);
    const token = AuthService.getToken();
    try {
      await fetch(`${endpoints.admin.banners}/${id}/move`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ direction }),
      });
      // Recarrega banners após ordenação
      const res = await fetch(endpoints.admin.banners, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBanners(data);
    } catch {
      setError('Erro ao ordenar banner.');
    } finally {
      setOrdering(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = AuthService.getToken();
    try {
      await fetch(endpoints.admin.banners, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      setForm({ title: '', image: '', link: '', active: true, startDate: '', endDate: '' });
    } catch {
      setError('Erro ao salvar banner.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando banners...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Banners Promocionais</h1>
      <form onSubmit={handleSave} className="space-y-4 mb-8">
        <div>
          <label className="font-semibold">Título</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            required
          />
        </div>
        <div>
          <label className="font-semibold">Imagem (URL)</label>
          <input
            type="url"
            name="image"
            value={form.image}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            required
          />
        </div>
        <div>
          <label className="font-semibold">Link de destino</label>
          <input
            type="url"
            name="link"
            value={form.link}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div className="flex gap-4">
          <div>
            <label className="font-semibold">Data início</label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="font-semibold">Data fim</label>
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              className="border rounded px-2 py-1"
            />
          </div>
        </div>
        <div>
          <label className="font-semibold">Ativo</label>
          <input
            type="checkbox"
            name="active"
            checked={form.active}
            onChange={handleChange}
            className="ml-2"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar banner'}
        </button>
      </form>
      {/* Preview visual do banner */}
      <div className="mb-8">
        <h2 className="text-md font-semibold mb-2">Preview</h2>
        <div className="border rounded p-4 flex flex-col items-center bg-gray-50">
          {form.image && (
            <Image
              src={form.image}
              alt="Preview"
              width={320}
              height={160}
              unoptimized
              className="max-h-32 mb-2 rounded object-contain"
            />
          )}
          <div className="font-bold text-lg mb-1">{form.title}</div>
          {form.link && <a href={form.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{form.link}</a>}
          <div className="text-xs text-gray-500 mt-2">{form.startDate && `Início: ${form.startDate}`} {form.endDate && `| Fim: ${form.endDate}`}</div>
        </div>
      </div>
      <h2 className="text-lg font-semibold mb-2">Banners cadastrados</h2>
      <ul className="space-y-2">
        {banners.length === 0 ? (
          <li className="text-gray-500">Nenhum banner cadastrado.</li>
        ) : (
          banners.map((banner, idx) => (
            <li key={banner.id} className="border rounded p-2 bg-gray-50 flex justify-between items-center">
              <div>
                {editId === banner.id ? (
                  <form onSubmit={e => { e.preventDefault(); saveEdit(banner.id); }} className="flex gap-2 items-center">
                    <input type="text" name="title" value={editForm.title} onChange={handleEditChange} className="border rounded px-2 py-1" />
                    <input type="url" name="image" value={editForm.image} onChange={handleEditChange} className="border rounded px-2 py-1" />
                    <input type="url" name="link" value={editForm.link} onChange={handleEditChange} className="border rounded px-2 py-1" />
                    <input type="date" name="startDate" value={editForm.startDate || ''} onChange={handleEditChange} className="border rounded px-2 py-1" />
                    <input type="date" name="endDate" value={editForm.endDate || ''} onChange={handleEditChange} className="border rounded px-2 py-1" />
                    <label className="flex items-center gap-1">
                      <input type="checkbox" name="active" checked={editForm.active} onChange={handleEditChange} /> Ativo
                    </label>
                    <button type="submit" className="bg-green-600 text-white px-2 py-1 rounded">Salvar</button>
                    <button type="button" className="bg-gray-400 text-white px-2 py-1 rounded" onClick={() => setEditId(null)}>Cancelar</button>
                  </form>
                ) : (
                  <>
                    <div className="font-semibold">{banner.title}</div>
                    <div className="text-xs text-gray-600">Imagem: <a href={banner.image} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver</a></div>
                    <div className="text-xs text-gray-400">{banner.active ? 'Ativo' : 'Desativado'}</div>
                    {banner.link && <div className="text-xs text-blue-600">Link: <a href={banner.link} target="_blank" rel="noopener noreferrer" className="underline">{banner.link}</a></div>}
                    <div className="text-xs text-gray-500 mt-1">{banner.startDate && `Início: ${banner.startDate}`} {banner.endDate && `| Fim: ${banner.endDate}`}</div>
                    {banner.image && (
                      <Image
                        src={banner.image}
                        alt="Preview"
                        width={240}
                        height={120}
                        unoptimized
                        className="max-h-20 mt-2 rounded object-contain"
                      />
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {editId !== banner.id && (
                  <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs" onClick={() => startEdit(banner)}>Editar</button>
                )}
                <button className="bg-red-600 text-white px-2 py-1 rounded text-xs" onClick={() => removeBanner(banner.id)}>Remover</button>
                <button className="bg-gray-600 text-white px-2 py-1 rounded text-xs" onClick={() => moveBanner(banner.id, 'up')} disabled={ordering || idx === 0}>↑</button>
                <button className="bg-gray-600 text-white px-2 py-1 rounded text-xs" onClick={() => moveBanner(banner.id, 'down')} disabled={ordering || idx === banners.length - 1}>↓</button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
