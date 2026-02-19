import React from 'react';

type MessageProps = {
  message: string;
};

export function LoadingState({ message }: MessageProps) {
  return <div className="p-4 text-sm text-slate-600">{message}</div>;
}

export function ErrorState({ message }: MessageProps) {
  return <div className="p-4 text-sm text-red-600">{message}</div>;
}

export function EmptyState({ message }: MessageProps) {
  return <div className="p-4 text-sm text-slate-500">{message}</div>;
}
