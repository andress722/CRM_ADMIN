import React, { useState, useEffect } from 'react';

export default function AccessibilityBar() {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(1);

  useEffect(() => {
    document.body.style.filter = highContrast ? 'contrast(1.8) grayscale(0.2)' : '';
    document.body.style.fontSize = `${fontSize}em`;
  }, [highContrast, fontSize]);

  return (
    <div className="soft-panel flex flex-wrap gap-2 items-center">
      <button
        className={`px-3 py-1.5 rounded-full text-xs font-semibold ${highContrast ? 'bg-yellow-400 text-black' : 'bg-slate-900 text-white'}`}
        onClick={() => setHighContrast(h => !h)}
        aria-label="Alternar alto contraste"
      >
        {highContrast ? 'Desativar Contraste' : 'Alto Contraste'}
      </button>
      <button
        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800"
        onClick={() => setFontSize(f => Math.min(f + 0.1, 2))}
        aria-label="Aumentar fonte"
      >
        A+
      </button>
      <button
        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800"
        onClick={() => setFontSize(f => Math.max(f - 0.1, 0.8))}
        aria-label="Diminuir fonte"
      >
        A-
      </button>
    </div>
  );
}
