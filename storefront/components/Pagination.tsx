import React from 'react';

export default function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex gap-2 justify-center my-6">
      <button
        className="px-3 py-1 rounded border bg-gray-100 font-bold"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </button>
      <span className="px-3 py-1 font-bold">{page} / {totalPages}</span>
      <button
        className="px-3 py-1 rounded border bg-gray-100 font-bold"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
      </button>
    </div>
  );
}
