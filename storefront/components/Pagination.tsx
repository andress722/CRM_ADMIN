import React from 'react';

export default function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex gap-3 justify-center items-center mt-8">
      <button
        className="btn-ghost"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </button>
      <span className="badge-muted">{page} / {totalPages}</span>
      <button
        className="btn-ghost"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
      </button>
    </div>
  );
}
