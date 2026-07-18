import React from "react";

const statusConfig = {
  "Em análise": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  "Aguardando peça": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  "Em conserto": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  "Pronto": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Entregue": { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
  "Cancelado": { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig["Em análise"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}