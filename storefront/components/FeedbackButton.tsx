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
        className="fixed bottom-6 right-6 btn-primary shadow-glow z-50 text-base"
        aria-label="Enviar feedback"
        onClick={() => setOpen(true)}
      >
        💬 Feedback
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 section-card z-50 w-80 flex flex-col gap-2">
          <span className="font-bold text-amber-600 mb-1">Envie seu feedback</span>
          <select value={type} onChange={e => setType(e.target.value)} className="soft-panel">
            <option value="sugestao">Sugestão</option>
            <option value="elogio">Elogio</option>
            <option value="problema">Reportar problema</option>
          </select>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="soft-panel resize-none h-20"
            placeholder="Digite aqui..."
          />
          <div className="flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-secondary" onClick={handleSend} disabled={!text || sent}>
              {sent ? 'Enviado!' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
