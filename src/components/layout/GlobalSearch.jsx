import db from "@/api/databaseClient";

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Search, User, FileText, Loader2 } from "lucide-react";

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ clients: [], orders: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const fetchedRef = useRef(false);

  // Carrega dados uma vez para busca em memória
  const [allClients, setAllClients] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  const fetchData = async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    try {
      const [c, o] = await Promise.all([
        db.entities.Client.list("-created_date", 500),
        db.entities.ServiceOrder.list("-created_date", 500),
      ]);
      setAllClients(c);
      setAllOrders(o);
    } catch {
      fetchedRef.current = false;
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (!query.trim()) {
        setResults({ clients: [], orders: [] });
        return;
      }
      setLoading(true);
      const q = query.toLowerCase();
      const matchedClients = allClients
        .filter(c => (c.full_name || "").toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q))
        .slice(0, 5);
      const matchedOrders = allOrders
        .filter(o =>
          (o.os_number || "").toLowerCase().includes(q) ||
          (o.client_name || "").toLowerCase().includes(q) ||
          (o.device_name || "").toLowerCase().includes(q)
        )
        .slice(0, 5);
      setResults({ clients: matchedClients, orders: matchedOrders });
      setLoading(false);
    }, 200);
    debounceRef.current = handler;
    return () => clearTimeout(handler);
  }, [query, allClients, allOrders]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = results.clients.length > 0 || results.orders.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onFocus={() => { fetchData(); setOpen(true); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          placeholder="Buscar cliente ou OS..."
          className="w-full h-9 rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {loading && (
          <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {!loading && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          )}
          {hasResults && (
            <div className="py-1">
              {results.clients.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Clientes
                  </div>
                  {results.clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { navigate("/clientes"); setOpen(false); setQuery(""); }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.full_name}</p>
                        {c.phone && <p className="text-xs text-muted-foreground truncate">{c.phone}</p>}
                      </div>
                    </button>
                  ))}
                </>
              )}
              {results.orders.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-t mt-1 pt-2">
                    Ordens de Serviço
                  </div>
                  {results.orders.map(o => (
                    <button
                      key={o.id}
                      onClick={() => { navigate("/atendimentos"); setOpen(false); setQuery(""); }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          <span className="font-mono">{o.os_number || "—"}</span>
                          <span className="text-muted-foreground"> · {o.client_name}</span>
                        </p>
                        {o.device_name && <p className="text-xs text-muted-foreground truncate">{o.device_name}</p>}
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">{o.status}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}