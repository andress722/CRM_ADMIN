import React from 'react';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';
import { authFetch } from '@/services/auth-fetch';

export default function ExportLogsPage() {
  const handleExport = async (type: 'csv' | 'excel') => {
    const token = AuthService.getToken();
    if (!token) return alert('Usuário não autenticado.');
    try {
      const res = await authFetch(`${endpoints.admin.logs}/export?type=${type}`, {
        headers: {},
      });
      if (!res.ok) throw new Error('Erro ao exportar logs');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs.${type === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert('Erro ao exportar logs.');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white border rounded-xl shadow mt-6">
      <h1 className="text-xl font-bold mb-4">Exportar Logs Administrativos</h1>
      <div className="flex gap-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold" onClick={() => handleExport('csv')}>
          Exportar CSV
        </button>
        <button className="bg-green-600 text-white px-4 py-2 rounded font-bold" onClick={() => handleExport('excel')}>
          Exportar Excel
        </button>
      </div>
    </div>
  );
}




