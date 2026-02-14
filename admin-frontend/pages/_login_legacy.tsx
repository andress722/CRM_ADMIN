import React, { useState } from 'react';
import { AuthService } from '@/services/auth';
import { useRouter } from 'next/router';

export default function LegacyLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await AuthService.login(email, password);
      router.push('/leads');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white p-6 rounded shadow">
        <h2 className="text-lg font-bold mb-4">Admin Login (legacy)</h2>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border px-3 py-2 mb-3" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full border px-3 py-2 mb-3" />
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? 'Signing...' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  );
}
