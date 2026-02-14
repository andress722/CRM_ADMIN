// Tooltip para pontos críticos (rate limiting, LGPD, segurança)
import React from 'react';

export default function CriticalTooltip({ text }: { text: string }) {
  return (
    <span className="relative group">
      <span className="underline decoration-dotted cursor-help">?</span>
      <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-black text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {text}
      </div>
    </span>
  );
}
