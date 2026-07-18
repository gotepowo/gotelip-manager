/**
 * Exporta um array de objetos para um arquivo CSV e dispara o download.
 * @param {Array<Object>} data - Array de registros a exportar
 * @param {Array<{key: string, label: string, format?: (val: any) => string}>} columns - Colunas a exportar
 * @param {string} filename - Nome do arquivo (sem extensão)
 */
export function exportToCSV(data, columns, filename) {
  if (!data || data.length === 0) return;

  const escape = (val) => {
    const str = val == null ? "" : String(val);
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map(c => escape(c.label)).join(";");
  const rows = data.map(row =>
    columns.map(c => escape(c.format ? c.format(row[c.key]) : row[c.key])).join(";")
  );

  const csv = "\uFEFF" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}