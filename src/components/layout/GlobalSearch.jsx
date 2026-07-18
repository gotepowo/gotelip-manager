import db from "@/api/databaseClient";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, FileText, Loader2, ReceiptText, WalletCards } from "lucide-react";

const normalize = (value) => String(value || "").toLocaleLowerCase("pt-BR");
const includes = (record, fields, query) => fields.some((field) => normalize(record[field]).includes(query));

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [data, setData] = useState({ clients: [], orders: [], invoices: [], transactions: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clients, orders, invoices, transactions] = await Promise.all([
        db.entities.Client.list("-created_date", 1000),
        db.entities.ServiceOrder.list("-created_date", 1000),
        db.entities.Invoice.list("-created_date", 1000),
        db.entities.Transaction.list("-date", 1000),
      ]);
      setData({ clients, orders, invoices, transactions });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const close = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    const refresh = () => fetchData();
    window.addEventListener("database-updated", refresh);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("database-updated", refresh);
    };
  }, []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return { clients: [], orders: [], invoices: [], transactions: [] };
    return {
      clients: data.clients.filter((item) => includes(item, ["full_name", "phone", "email", "cpf", "cnpj"], q)).slice(0, 5),
      orders: data.orders.filter((item) => includes(item, ["os_number", "client_name", "device_name", "problem_type", "status"], q)).slice(0, 5),
      invoices: data.invoices.filter((item) => includes(item, ["invoice_number", "client_name", "description", "service_order_number"], q)).slice(0, 5),
      transactions: data.transactions.filter((item) => includes(item, ["description", "client_name", "category", "type"], q)).slice(0, 5),
    };
  }, [data, query]);

  const sections = [
    { key: "clients", title: "Clientes", icon: User, path: "/clientes", label: (x) => x.full_name, detail: (x) => x.phone || x.email },
    { key: "orders", title: "Ordens de Serviço", icon: FileText, path: "/atendimentos", label: (x) => `${x.os_number || "OS"} · ${x.client_name || ""}`, detail: (x) => `${x.device_name || ""}${x.status ? ` · ${x.status}` : ""}` },
    { key: "invoices", title: "Notas Fiscais", icon: ReceiptText, path: "/notas-fiscais", label: (x) => `${x.invoice_number || "NF"} · ${x.client_name || ""}`, detail: (x) => x.description || x.service_order_number },
    { key: "transactions", title: "Transações", icon: WalletCards, path: "/financas", label: (x) => x.description || x.category || "Transação", detail: (x) => `${x.type || ""} · ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(x.amount || 0)}` },
  ];
  const hasResults = sections.some((section) => results[section.key].length);

  const go = (section, item) => {
    const searchValue = item.os_number || item.invoice_number || item.full_name || item.description || "";
    navigate(`${section.path}?search=${encodeURIComponent(searchValue)}&highlight=${encodeURIComponent(item.id)}`);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onFocus={() => { setOpen(true); fetchData(); }} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} placeholder="Buscar clientes, OS, notas ou transações..." className="w-full h-9 rounded-lg border border-input bg-card pl-9 pr-9 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        {loading && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      {open && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-xl shadow-xl z-50 max-h-[70vh] overflow-y-auto">
          {!loading && !hasResults && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum resultado encontrado</div>}
          {sections.map((section, index) => {
            const Icon = section.icon;
            if (!results[section.key].length) return null;
            return (
              <div key={section.key} className={index ? "border-t" : ""}>
                <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{section.title}</div>
                {results[section.key].map((item) => (
                  <button key={item.id} onClick={() => go(section, item)} className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-accent transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{section.label(item)}</p><p className="text-xs text-muted-foreground truncate">{section.detail(item)}</p></div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
