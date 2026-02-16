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
          className={`pill-button ${selected === cat ? 'pill-button-active' : ''}`}
          onClick={() => handleSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
