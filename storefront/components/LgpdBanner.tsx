// Banner de consentimento LGPD para Storefront
import React, { useState } from 'react';

export default function LgpdBanner() {
  const [accepted, setAccepted] = useState(false);

  if (accepted) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-900 text-white p-4 flex flex-col sm:flex-row justify-between items-center gap-3 z-50">
      <span className="text-sm text-slate-100">
        Este site utiliza cookies e dados conforme a LGPD. Ao continuar, você concorda com nossa <a href="/privacy" className="underline text-emerald-300">política de privacidade</a>.
      </span>
      <button
        className="btn-primary"
        onClick={() => setAccepted(true)}
      >
        Concordo
      </button>
    </div>
  );
}
