import React, { useState, useEffect } from 'react';

export default function AccessibilityBar() {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(1);

  useEffect(() => {
    document.body.style.filter = highContrast ? 'contrast(1.8) grayscale(0.2)' : '';
    document.body.style.fontSize = `${fontSize}em`;
  }, [highContrast, fontSize]);

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg z-50 flex gap-3 items-center shadow-lg">
      <button
        className={`px-3 py-1 rounded font-bold ${highContrast ? 'bg-yellow-400 text-black' : 'bg-gray-700'}`}
        onClick={() => setHighContrast(h => !h)}
        aria-label="Alternar alto contraste"
      >
        {highContrast ? 'Desativar Contraste' : 'Alto Contraste'}
      </button>
      <button
        className="px-3 py-1 rounded font-bold bg-gray-700"
        onClick={() => setFontSize(f => Math.min(f + 0.1, 2))}
        aria-label="Aumentar fonte"
      >
        A+
      </button>
      <button
        className="px-3 py-1 rounded font-bold bg-gray-700"
        onClick={() => setFontSize(f => Math.max(f - 0.1, 0.8))}
        aria-label="Diminuir fonte"
      >
        A-
      </button>
    </div>
  );
}
