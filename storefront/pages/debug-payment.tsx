import React, { useEffect, useState } from 'react';

export default function DebugPayment() {
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('lastPaymentResponse');
    if (raw) {
      try {
        setPayload(JSON.parse(raw));
      } catch {
        setPayload({ raw });
      }
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Debug Pagamento</h1>
      {!payload && <p>Nenhum pagamento salvo ainda.</p>}
      {payload && (
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}
