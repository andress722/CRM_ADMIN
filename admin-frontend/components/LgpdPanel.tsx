// Painel LGPD: exportação/anonimização de dados
import { API_URL } from "@/services/endpoints";
import { useState } from "react";

export default function LgpdPanel() {
  const [exporting, setExporting] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [status, setStatus] = useState("");

  const handleExport = async () => {
    setExporting(true);
    setStatus("");
    try {
      // Chamada para exportar dados do usuário
      await fetch(`${API_URL}/lgpd/export`, { method: "POST" });
      setStatus("Dados exportados com sucesso!");
    } catch {
      setStatus("Erro ao exportar dados.");
    }
    setExporting(false);
  };

  const handleAnonymize = async () => {
    setAnonymizing(true);
    setStatus("");
    try {
      // Chamada para anonimizar dados do usuário
      await fetch(`${API_URL}/lgpd/anonymize`, { method: "POST" });
      setStatus("Dados anonimizados com sucesso!");
    } catch {
      setStatus("Erro ao anonimizar dados.");
    }
    setAnonymizing(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">LGPD</h2>
      <div className="mb-2">
        Gerencie seus dados conforme a Lei Geral de Proteção de Dados.
      </div>
      <div className="flex gap-4 mb-4">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {exporting ? "Exportando..." : "Exportar Dados"}
        </button>
        <button
          onClick={handleAnonymize}
          disabled={anonymizing}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          {anonymizing ? "Anonimizando..." : "Anonimizar Dados"}
        </button>
      </div>
      {status && <div className="text-green-600 font-semibold">{status}</div>}
    </div>
  );
}
