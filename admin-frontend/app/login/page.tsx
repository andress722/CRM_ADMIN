"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/admin");
    }
  }, [isAuthenticated, router]);

  const isTwoFactorStep = !!twoFactorChallengeId;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();

    if (isTwoFactorStep && !twoFactorCode.trim()) {
      return;
    }

    const result = await login(email, password, {
      twoFactorChallengeId: twoFactorChallengeId || undefined,
      twoFactorCode: isTwoFactorStep ? twoFactorCode.trim() : undefined,
    });

    if (result.status === "requires_two_factor") {
      setTwoFactorChallengeId(result.challengeId);
      return;
    }

    if (result.status === "authenticated") {
      setTwoFactorChallengeId(null);
      setTwoFactorCode("");
    }
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
              disabled={isTwoFactorStep}
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
              disabled={isTwoFactorStep}
            />
          </div>

          {isTwoFactorStep && (
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Codigo 2FA</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white/5 border border-white/20 text-white"
                placeholder="000000"
                required
              />
            </div>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            type="submit"
            disabled={isLoading || (isTwoFactorStep && !twoFactorCode.trim())}
            className="w-full py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-60"
          >
            {isLoading ? "Entrando..." : isTwoFactorStep ? "Validar 2FA" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
