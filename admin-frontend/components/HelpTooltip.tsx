// Componente de tooltip de ajuda
import React from 'react';

export default function HelpTooltip({ text }: { text: string }) {
  return (
    <span className="relative group">
      <span className="ml-1 text-blue-500 cursor-pointer">&#9432;</span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
        {text}
      </span>
    </span>
  );
}
