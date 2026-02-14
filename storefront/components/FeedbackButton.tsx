import React, { useState } from 'react';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('sugestao');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    // Simula envio (poderia integrar com backend ou serviço de email)
    setSent(true);
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setText('');
      setType('sugestao');
    }, 2000);
  };

  return (
    <>
      <button
        className="fixed bottom-6 right-6 bg-pink-600 text-white px-4 py-3 rounded-full shadow-lg z-50 font-bold text-lg hover:bg-pink-700"
        aria-label="Enviar feedback"
        onClick={() => setOpen(true)}
      >
        💬 Feedback
      </button>
      {open && (
        <div className="fixed bottom-20 right-6 bg-white border rounded-lg shadow-lg p-4 z-50 w-80 flex flex-col gap-2">
          <span className="font-bold text-pink-600 mb-1">Envie seu feedback</span>
          <select value={type} onChange={e => setType(e.target.value)} className="border rounded px-2 py-1">
            <option value="sugestao">Sugestão</option>
            <option value="elogio">Elogio</option>
            <option value="problema">Reportar problema</option>
          </select>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="border rounded px-2 py-1 resize-none h-20"
            placeholder="Digite aqui..."
          />
          <div className="flex gap-2 justify-end">
            <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="px-3 py-1 bg-pink-600 text-white rounded font-bold" onClick={handleSend} disabled={!text || sent}>
              {sent ? 'Enviado!' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
