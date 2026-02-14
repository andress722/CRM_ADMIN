import React, { useState } from 'react';

const categories = ['Todos', 'Eletrônicos', 'Roupas', 'Livros', 'Casa', 'Esportes'];

export default function CategoryFilter({ onSelect }: { onSelect: (cat: string) => void }) {
  const [selected, setSelected] = useState('Todos');

  function handleSelect(cat: string) {
    setSelected(cat);
    onSelect(cat);
  }

  return (
    <div className="mb-4 flex gap-2 flex-wrap">
      {categories.map(cat => (
        <button
          key={cat}
          className={`px-3 py-1 rounded border font-bold ${selected === cat ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => handleSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
