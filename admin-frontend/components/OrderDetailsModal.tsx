import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../src/services/endpoints";

type StatusHistory = {
  status: string;
  date: string;
};

type OrderItem = {
  id?: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
};

type Order = {
  id: string;
  customerName: string;
  customerEmail?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  totalAmount: number;
  history: StatusHistory[];
  items: OrderItem[];
};

const money = (value: number) => `R$ ${Number(value || 0).toFixed(2)}`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function OrderDetailsModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/admin/orders/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load order (${res.status})`);
        return res.json();
      })
      .then((data) => {
        const mapped: Order = {
          id: data?.id || orderId,
          customerName: data?.customerName || "",
          customerEmail: data?.customerEmail || "",
          status: data?.status || "",
          createdAt: data?.createdAt || "",
          updatedAt: data?.updatedAt || "",
          totalAmount: Number(data?.totalAmount || data?.total || 0),
          history: Array.isArray(data?.history) ? data.history : [],
          items: Array.isArray(data?.items) ? data.items : [],
        };
        setOrder(mapped);
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => {
    if (!order) return;

    const popup = window.open("", "_blank", "width=960,height=720");
    if (!popup) return;

    const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString("pt-BR") : "N/A";
    const updatedAt = order.updatedAt ? new Date(order.updatedAt).toLocaleString("pt-BR") : "N/A";

    const itemsRows = (order.items || [])
      .map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const subtotal = quantity * unitPrice;

        return `<tr>
          <td>${escapeHtml(item.productId || "N/A")}</td>
          <td>${quantity}</td>
          <td>${money(unitPrice)}</td>
          <td>${money(subtotal)}</td>
        </tr>`;
      })
      .join("");

    popup.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pedido ${escapeHtml(order.id)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 20px; color: #111827; }
    h1 { margin: 0 0 10px; font-size: 22px; }
    p { margin: 4px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #f3f4f6; }
    .totals { margin-top: 12px; text-align: right; font-size: 14px; }
    .totals strong { font-size: 16px; }
  </style>
</head>
<body>
  <h1>Pedido #${escapeHtml(order.id)}</h1>
  <p><strong>Cliente:</strong> ${escapeHtml(order.customerName || "N/A")}</p>
  <p><strong>Email:</strong> ${escapeHtml(order.customerEmail || "N/A")}</p>
  <p><strong>Status:</strong> ${escapeHtml(order.status || "N/A")}</p>
  <p><strong>Criado em:</strong> ${createdAt}</p>
  <p><strong>Atualizado em:</strong> ${updatedAt}</p>

  <table>
    <thead>
      <tr>
        <th>Produto / SKU</th>
        <th>Qtd</th>
        <th>Unitario</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows || '<tr><td colspan="4">Nenhum item</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <strong>Total do pedido: ${money(order.totalAmount)}</strong>
  </div>

  <script>window.onload = function() { window.print(); window.close(); };</script>
</body>
</html>`);
    popup.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 sm:p-6">
      <div className="relative my-2 w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl sm:my-8">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
        >
          X
        </button>

        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold">Detalhes do Pedido</h2>
          <p className="text-xs text-gray-600">#{order?.id || orderId}</p>
        </div>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-5 py-4">
          {loading && <div>Carregando...</div>}
          {!loading && !order && <div>Pedido nao encontrado.</div>}

          {!loading && order && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded border p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Cliente</p>
                  <p className="text-sm">{order.customerName || "N/A"}</p>
                  <p className="text-sm text-gray-600">{order.customerEmail || "N/A"}</p>
                </div>
                <div className="rounded border p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Pedido</p>
                  <p className="text-sm">Status: {order.status || "N/A"}</p>
                  <p className="text-sm">Total: {money(order.totalAmount)}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Itens</h3>
                <div className="overflow-x-auto rounded border">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Produto / SKU</th>
                        <th className="p-2 text-left">Qtd</th>
                        <th className="p-2 text-left">Unitario</th>
                        <th className="p-2 text-left">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-3 text-gray-500">Nenhum item.</td>
                        </tr>
                      ) : (
                        order.items.map((item, idx) => {
                          const qty = Number(item.quantity || 0);
                          const unit = Number(item.unitPrice || 0);
                          return (
                            <tr key={item.id || `${item.productId || "item"}-${idx}`} className="border-t">
                              <td className="p-2">{item.productId || "N/A"}</td>
                              <td className="p-2">{qty}</td>
                              <td className="p-2">{money(unit)}</td>
                              <td className="p-2">{money(qty * unit)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Historico de Status</h3>
                <ul className="space-y-1 rounded border p-3 text-sm text-gray-700">
                  {order.history.length === 0 && <li>Sem historico detalhado.</li>}
                  {order.history.map((h, idx) => (
                    <li key={`${h.status}-${h.date}-${idx}`}>{h.status} - {h.date}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
            Fechar
          </button>
          <button
            onClick={handlePrint}
            disabled={!order || loading}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Imprimir pedido
          </button>
        </div>
      </div>
    </div>
  );
}
