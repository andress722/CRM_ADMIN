// Banner de consentimento LGPD para Storefront
import React, { useState } from 'react';

export default function LgpdBanner() {
  const [accepted, setAccepted] = useState(false);

  if (accepted) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-4 flex justify-between items-center z-50">
      <span>
        Este site utiliza cookies e dados conforme a LGPD. Ao continuar, você concorda com nossa <a href="/privacy" className="underline text-blue-300">política de privacidade</a>.
      </span>
      <button
        className="bg-green-500 px-4 py-2 rounded ml-4"
        onClick={() => setAccepted(true)}
      >
        Concordo
      </button>
    </div>
  );
}
