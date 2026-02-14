// Banner de onboarding rápido
import React, { useState } from 'react';
import Link from 'next/link';

export default function OnboardingBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4 flex items-center justify-between">
      <div>
        <span className="font-bold text-blue-700">Bem-vindo ao Admin!</span>
        <span className="block text-sm text-blue-600 mt-1">
          Veja a documentação rápida para começar:{' '}
          <Link href="/docs" className="underline">Documentação</Link>
        </span>
      </div>
      <button className="text-blue-500 ml-4" onClick={() => setVisible(false)}>Fechar</button>
    </div>
  );
}
