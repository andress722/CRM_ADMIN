import { Order, Product } from '@/types/api';

/**
 * Export orders to CSV
 */
export function exportOrdersToCSV(orders: Order[], filename = 'orders.csv') {
  const headers = ['Order ID', 'Customer', 'Email', 'Amount', 'Items', 'Status', 'Date'];
  const rows = orders.map((order) => [
    order.id?.slice(0, 12) || 'N/A',
    order.customerName || 'N/A',
    order.customerEmail || 'N/A',
    order.totalAmount?.toFixed(2) || '0.00',
    order.items?.length || 0,
    order.status,
    new Date(order.createdAt).toLocaleDateString(),
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell))
        .join(',')
    )
    .join('\n');

  downloadCSV(csv, filename);
}

/**
 * Export products to CSV
 */
export function exportProductsToCSV(products: Product[], filename = 'products.csv') {
  const headers = ['Product ID', 'Name', 'SKU', 'Price', 'Stock', 'Category', 'Created'];
  const rows = products.map((product) => [
    product.id?.slice(0, 12) || 'N/A',
    product.name,
    product.sku,
    product.price?.toFixed(2) || '0.00',
    product.stock,
    product.category || 'N/A',
    new Date(product.createdAt).toLocaleDateString(),
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell))
        .join(',')
    )
    .join('\n');

  downloadCSV(csv, filename);
}

/**
 * Helper to trigger CSV download
 */
function downloadCSV(csv: string, filename: string) {
  const element = document.createElement('a');
  element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Generate and download PDF report (using HTML to PDF via print)
 */
export function generatePDFReport(title: string, content: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #475569; }
          h1 { color: #1e293b; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
          h2 { color: #0066cc; margin-top: 20px; }
          h3 { color: #475569; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #0066cc; color: white; padding: 10px; text-align: left; border: 1px solid #ddd; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f1f5f9; }
          .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div>${content}</div>
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `;

  const newWindow = window.open('', '', 'width=900,height=700');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}

/**
 * Generate orders report HTML
 */
export function generateOrdersReportHTML(orders: Order[]): string {
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;

  return `
    <h2 style="color: #0066cc; margin-top: 20px;">Orders Summary</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background-color: #f1f5f9; border: 1px solid #e2e8f0;">
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Total Orders</strong></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">${orders.length}</td>
      </tr>
      <tr style="border: 1px solid #e2e8f0;">
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Total Revenue</strong></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$${totalRevenue.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #f1f5f9; border: 1px solid #e2e8f0;">
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Delivered Orders</strong></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">${deliveredOrders}</td>
      </tr>
    </table>
    <h3>Recent Orders</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #0066cc; color: white;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Order ID</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Customer</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Amount</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${orders
          .slice(0, 10)
          .map(
            (o) => `
          <tr style="border: 1px solid #ddd;">
            <td style="padding: 10px;">${o.id?.slice(0, 12)}</td>
            <td style="padding: 10px;">${o.customerName || 'N/A'}</td>
            <td style="padding: 10px;">$${o.totalAmount.toFixed(2)}</td>
            <td style="padding: 10px;">${o.status}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate products report HTML
 */
export function generateProductsReportHTML(products: Product[]): string {
  const lowStockCount = products.filter((p) => p.stock < 10).length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  return `
    <h2 style="color: #0066cc; margin-top: 20px;">Products Summary</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background-color: #f1f5f9; border: 1px solid #e2e8f0;">
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Total Products</strong></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">${products.length}</td>
      </tr>
      <tr style="border: 1px solid #e2e8f0;">
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Low Stock Items</strong></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">${lowStockCount}</td>
      </tr>
      <tr style="background-color: #f1f5f9; border: 1px solid #e2e8f0;">
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Inventory Value</strong></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$${totalValue.toFixed(2)}</td>
      </tr>
    </table>
    <h3>Top 10 Products</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #0066cc; color: white;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Name</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">SKU</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Price</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Stock</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${products
          .slice(0, 10)
          .map(
            (p) => `
          <tr style="border: 1px solid #ddd;">
            <td style="padding: 10px;">${p.name}</td>
            <td style="padding: 10px;">${p.sku}</td>
            <td style="padding: 10px;">$${p.price.toFixed(2)}</td>
            <td style="padding: 10px;">${p.stock}</td>
            <td style="padding: 10px;">$${(p.price * p.stock).toFixed(2)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}
