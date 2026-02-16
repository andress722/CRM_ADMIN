import React, { useState } from 'react';

const categories = ['Todos', 'Eletrônicos', 'Roupas', 'Livros', 'Casa', 'Esportes'];

export default function CategoryFilter({ onSelect }: { onSelect: (cat: string) => void }) {
  const [selected, setSelected] = useState('Todos');

  function handleSelect(cat: string) {
    setSelected(cat);
    onSelect(cat);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(cat => (
        <button
          key={cat}
          className={`px-4 py-1.5 rounded-full border text-sm font-semibold transition ${selected === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          onClick={() => handleSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
