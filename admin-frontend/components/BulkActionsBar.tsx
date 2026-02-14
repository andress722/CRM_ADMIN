import React from 'react';

type BulkActionsBarProps = {
  selectedCount: number;
  children: React.ReactNode;
};

export default function BulkActionsBar({ selectedCount, children }: BulkActionsBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center text-sm">
      <span className="text-slate-500">Selecionados: {selectedCount}</span>
      {children}
    </div>
  );
}
