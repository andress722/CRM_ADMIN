import React, { useState } from 'react';

export default function RatingFilter({ onSelect }: { onSelect: (rating: number) => void }) {
  const [selected, setSelected] = useState(0);

  function handleSelect(rating: number) {
    setSelected(rating);
    onSelect(rating);
  }

  return (
    <div className="mb-4 flex gap-2 items-center">
      <span className="font-bold">Filtrar por nota:</span>
      {[0, 1, 2, 3, 4, 5].map(rating => (
        <button
          key={rating}
          className={`text-xl px-2 ${selected === rating ? 'text-yellow-500 font-bold' : 'text-gray-300'}`}
          onClick={() => handleSelect(rating)}
          aria-label={`Nota ${rating}`}
        >
          {rating === 0 ? 'Todas' : '★'.repeat(rating)}
        </button>
      ))}
    </div>
  );
}
