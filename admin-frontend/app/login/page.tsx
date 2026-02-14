"use client";

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
	const router = useRouter();
	const { login, isLoading, error, isAuthenticated } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	useEffect(() => {
		if (isAuthenticated) {
			router.push('/admin');
		}
	}, [isAuthenticated, router]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		await login(email, password);
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
			<div className="w-full max-w-md bg-white/10 border border-white/20 rounded-xl p-8 shadow-2xl">
				<h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Login</h1>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-3 py-2 rounded bg-white/5 border border-white/20 text-white"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-200 mb-1">Senha</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-3 py-2 rounded bg-white/5 border border-white/20 text-white"
							required
						/>
					</div>
					{error && (
						<div className="text-sm text-red-400">{error}</div>
					)}
					<button
						type="submit"
						disabled={isLoading}
						className="w-full py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-60"
					>
						{isLoading ? 'Entrando...' : 'Entrar'}
					</button>
				</form>
			</div>
		</div>
	);
}
