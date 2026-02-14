import React, { useEffect, useState } from 'react';
import SeoHead from '../components/SeoHead';
import { useLocale } from '../context/LocaleContext';
import { apiFetch } from '../utils/api';

export default function Profile() {
  const { formatFromBase } = useLocale();
  const [user, setUser] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [uRes, oRes] = await Promise.all([
          apiFetch('/users/me', { method: 'GET' }),
          apiFetch('/users/me/orders', { method: 'GET' }),
        ]);
        if (uRes.ok) {
          const u = await uRes.json();
          if (mounted) { setUser(u); setForm(u); }
        }
        if (oRes.ok) {
          const os = await oRes.json();
          if (mounted) setOrders(os);
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
      }
    }
    load();
    return () => { mounted = false };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave() {
    try {
      const res = await apiFetch('/users/me', { method: 'PUT', body: JSON.stringify(form) });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setForm(updated);
        setEditing(false);
      }
    } catch (err) {
      console.error('Failed to save profile', err);
    }
  }

  return (
    <>
      <SeoHead title="Perfil | Loja Online" description="Gerencie seus dados e acompanhe seus pedidos." />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Minha Conta</h1>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Dados do Usuário</h2>
          {editing ? (
            <div className="grid grid-cols-1 gap-2">
              <input name="name" value={form.name} onChange={handleChange} className="border rounded px-2 py-1" />
              <input name="email" value={form.email} onChange={handleChange} className="border rounded px-2 py-1" />
              <input name="phone" value={form.phone} onChange={handleChange} className="border rounded px-2 py-1" />
              <input name="address" value={form.address} onChange={handleChange} className="border rounded px-2 py-1" />
              <button className="bg-green-600 text-white px-4 py-2 rounded font-bold mt-2" onClick={handleSave}>Salvar</button>
              <button className="text-gray-500 underline mt-1" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          ) : (
            <div className="mb-2">
              {user ? (
                <>
                  <p><strong>Nome:</strong> {user.name}</p>
                  <p><strong>E-mail:</strong> {user.email}</p>
                  <p><strong>Telefone:</strong> {user.phone}</p>
                  <p><strong>Endereço:</strong> {user.address}</p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold mt-2" onClick={() => setEditing(true)}>Editar</button>
                </>
              ) : (
                <p>Carregando...</p>
              )}
            </div>
          )}
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Histórico de Pedidos</h2>
          <table className="w-full border rounded">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Total</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-t">
                  <td className="p-2">{order.id}</td>
                  <td className="p-2">{order.date}</td>
                  <td className="p-2">{formatFromBase(order.total)}</td>
                  <td className="p-2">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
