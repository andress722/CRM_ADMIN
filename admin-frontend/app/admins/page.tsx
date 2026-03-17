"use client";
import { endpoints } from "@/services/endpoints";
import ExcelJS from "exceljs";
import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  blocked?: boolean;
};

type AccessLog = {
  action: string;
  date: string;
  details?: string;
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBatch, setInviteBatch] = useState("");
  const [inviting, setInviting] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [roleEdit, setRoleEdit] = useState<{ id: string; role: string } | null>(
    null,
  );
  const [roleOptions] = useState(["admin", "editor", "viewer"]);
  const [roleFilter, setRoleFilter] = useState("");
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [showLogsId, setShowLogsId] = useState<string | null>(null);

  useEffect(() => {    fetch(endpoints.admin.admins, {
      
    })
      .then((res) => res.json())
      .then((data) => {
        setAdmins(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar administradores.");
        setLoading(false);
      });
  }, []);

  const fetchAccessLogs = async (id: string) => {    try {
      const res = await fetch(`${endpoints.admin.admins}/${id}/logs`, {
        
      });
      const data = await res.json();
      setAccessLogs(data);
      setShowLogsId(id);
    } catch {
      setError("Erro ao carregar logs de acesso.");
    }
  };

  const inviteAdmin = async () => {
    if (!inviteEmail) return;
    setInviting(true);    try {
      await fetch(endpoints.admin.admins + "/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteEmail("");
    } catch {
      setError("Erro ao convidar administrador.");
    } finally {
      setInviting(false);
    }
  };

  const inviteBatchAdmins = async () => {
    const emails = inviteBatch.split(/[,;\s]+/).filter((e) => e.includes("@"));
    if (!emails.length) return;
    setInviting(true);    try {
      await fetch(endpoints.admin.admins + "/invite-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({ emails }),
      });
      setInviteBatch("");
    } catch {
      setError("Erro ao convidar em lote.");
    } finally {
      setInviting(false);
    }
  };

  const exportCSV = () => {
    if (!admins.length) return;
    const header = ["Nome", "Email", "Papel", "Status"];
    const rows = admins.map((a) => [
      a.name,
      a.email,
      a.role,
      a.blocked ? "Bloqueado" : "Ativo",
    ]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admins.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    if (!admins.length) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Admins");
    sheet.columns = [
      { header: "Nome", key: "name", width: 24 },
      { header: "Email", key: "email", width: 28 },
      { header: "Papel", key: "role", width: 14 },
      { header: "Status", key: "status", width: 14 },
    ];
    admins.forEach((admin) => {
      sheet.addRow({
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.blocked ? "Bloqueado" : "Ativo",
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admins.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleBlock = async (id: string, block: boolean) => {
    setUpdating(id);    try {
      await fetch(
        `${endpoints.admin.admins}/${id}/${block ? "block" : "unblock"}`,
        {
          method: "POST",
          
        },
      );
      setAdmins((admins) =>
        admins.map((a) => (a.id === id ? { ...a, blocked: block } : a)),
      );
    } catch {
      setError("Erro ao atualizar status.");
    } finally {
      setUpdating(null);
    }
  };

  const startRoleEdit = (id: string, currentRole: string) => {
    setRoleEdit({ id, role: currentRole });
  };

  const saveRoleEdit = async () => {
    if (!roleEdit) return;
    setUpdating(roleEdit.id);    try {
      await fetch(`${endpoints.admin.admins}/${roleEdit.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({ role: roleEdit.role }),
      });
      setAdmins((admins) =>
        admins.map((a) =>
          a.id === roleEdit.id ? { ...a, role: roleEdit.role } : a,
        ),
      );
      setRoleEdit(null);
    } catch {
      setError("Erro ao editar papel.");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div>Carregando administradores...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!admins.length) return <div>Nenhum administrador encontrado.</div>;

  const filteredAdmins = roleFilter
    ? admins.filter((a) => a.role === roleFilter)
    : admins;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Administradores & Permissões</h1>
      <div className="mb-6 flex gap-2 flex-wrap">
        <input
          type="email"
          placeholder="Convidar por email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <button
          onClick={inviteAdmin}
          className="bg-blue-600 text-white px-4 py-1 rounded font-semibold"
          disabled={inviting}
        >
          {inviting ? "Convidando..." : "Convidar"}
        </button>
        <textarea
          placeholder="Convite em lote (emails separados por vírgula, ponto e vírgula ou espaço)"
          value={inviteBatch}
          onChange={(e) => setInviteBatch(e.target.value)}
          className="border rounded px-2 py-1 min-w-[220px]"
          rows={1}
        />
        <button
          onClick={inviteBatchAdmins}
          className="bg-green-600 text-white px-4 py-1 rounded font-semibold"
          disabled={inviting || !inviteBatch.trim()}
        >
          {inviting ? "Convidando..." : "Convidar em lote"}
        </button>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Filtrar por papel</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          onClick={exportCSV}
          className="bg-gray-600 text-white px-4 py-1 rounded font-semibold"
        >
          Exportar CSV
        </button>
        <button
          onClick={exportExcel}
          className="bg-gray-800 text-white px-4 py-1 rounded font-semibold"
        >
          Exportar Excel
        </button>
      </div>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Nome</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Papel</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredAdmins.map((a) => (
            <tr key={a.id}>
              <td className="p-2 border font-semibold">{a.name}</td>
              <td className="p-2 border">{a.email}</td>
              <td className="p-2 border">
                {roleEdit && roleEdit.id === a.id ? (
                  <select
                    value={roleEdit.role}
                    onChange={(e) =>
                      setRoleEdit({ id: a.id, role: e.target.value })
                    }
                    className="border rounded px-2 py-1"
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{a.role}</span>
                )}
                {(!roleEdit || roleEdit.id !== a.id) && (
                  <button
                    className="ml-2 text-blue-600 underline text-xs"
                    onClick={() => startRoleEdit(a.id, a.role)}
                  >
                    Editar
                  </button>
                )}
                {roleEdit && roleEdit.id === a.id && (
                  <button
                    className="ml-2 text-green-600 underline text-xs"
                    onClick={saveRoleEdit}
                    disabled={updating === a.id}
                  >
                    Salvar
                  </button>
                )}
                {roleEdit && roleEdit.id === a.id && (
                  <button
                    className="ml-2 text-red-600 underline text-xs"
                    onClick={() => setRoleEdit(null)}
                  >
                    Cancelar
                  </button>
                )}
              </td>
              <td className="p-2 border">
                {a.blocked ? "Bloqueado" : "Ativo"}
              </td>
              <td className="p-2 border">
                <button
                  className={`px-3 py-1 rounded ${a.blocked ? "bg-green-600" : "bg-red-600"} text-white font-semibold mr-2`}
                  onClick={() => toggleBlock(a.id, !a.blocked)}
                  disabled={updating === a.id}
                >
                  {updating === a.id
                    ? "Atualizando..."
                    : a.blocked
                      ? "Desbloquear"
                      : "Bloquear"}
                </button>
                <button
                  className="px-3 py-1 rounded bg-gray-600 text-white font-semibold"
                  onClick={() => fetchAccessLogs(a.id)}
                >
                  Logs de acesso
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showLogsId && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">
            Logs de acesso do admin
          </h2>
          <button
            className="mb-2 text-blue-600 underline text-xs"
            onClick={() => setShowLogsId(null)}
          >
            Fechar
          </button>
          {accessLogs.length === 0 ? (
            <div className="text-gray-500">Nenhum acesso recente.</div>
          ) : (
            <ul className="space-y-2">
              {accessLogs.map((log, idx) => (
                <li key={idx} className="border rounded p-2 bg-gray-50">
                  <div className="text-sm text-gray-700">{log.action}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(log.date).toLocaleString()}
                  </div>
                  {log.details && (
                    <div className="text-xs text-gray-600 mt-1">
                      {log.details}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


