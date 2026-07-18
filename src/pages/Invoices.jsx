import db from "@/api/databaseClient";
import { deleteWithUndo } from "@/lib/undoDelete";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import CurrencyDisplay from "@/components/shared/CurrencyDisplay";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Pencil, Trash2, ExternalLink, Paperclip } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function Invoices() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [prefillOrder, setPrefillOrder] = useState(null);

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) setSearch(query);
    loadData();
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inv, ord] = await Promise.all([
        db.entities.Invoice.list("-date", 500),
        db.entities.ServiceOrder.list("-created_date", 500),
      ]);
      setInvoices(inv);
      setOrders(ord);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter(i => {
      const matchType = typeFilter === "Todos" || i.type === typeFilter;
      const matchSearch = !search ||
        (i.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.issuer_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.recipient_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.service_order_number || "").toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [invoices, typeFilter, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteWithUndo({ entity: db.entities.Invoice, record: deleteTarget, toast, onChanged: loadData, label: "Nota fiscal excluída" });
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleAttachToOrder = (order) => {
    setPrefillOrder(order);
    setEditInvoice(null);
    setFormOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader title="Notas Fiscais" subtitle={`${invoices.length} notas cadastradas`}>
        <Button onClick={() => { setPrefillOrder(null); setEditInvoice(null); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Nota
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, emitente, cliente ou OS..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os tipos</SelectItem>
            <SelectItem value="Entrada">Entrada</SelectItem>
            <SelectItem value="Saída">Saída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhuma nota fiscal encontrada" description="Cadastre notas fiscais e vincule-as aos atendimentos.">
          <Button onClick={() => { setPrefillOrder(null); setEditInvoice(null); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Nota
          </Button>
        </EmptyState>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Nº NF</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Data</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Emitente</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Cliente / OS</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Valor</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Arquivo</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">{inv.invoice_number || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-medium ${inv.type === "Entrada" ? "text-emerald-600" : "text-red-600"}`}>
                        {inv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{inv.date ? moment(inv.date).format("DD/MM/YY") : "—"}</td>
                    <td className="px-4 py-3 text-sm">{inv.issuer_name || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {inv.client_name && <p className="font-medium">{inv.client_name}</p>}
                      {inv.service_order_number && <p className="text-xs text-muted-foreground font-mono">{inv.service_order_number}</p>}
                      {!inv.client_name && !inv.service_order_number && "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      <span className={inv.type === "Entrada" ? "text-emerald-600" : "text-red-600"}>
                        {inv.type === "Saída" ? "-" : ""}<CurrencyDisplay value={inv.amount} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inv.file_url ? (
                        <a href={inv.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Ver arquivo">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditInvoice(inv); setPrefillOrder(null); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setDeleteTarget(inv); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setPrefillOrder(null); }}
        invoice={editInvoice}
        orders={orders}
        prefillOrder={prefillOrder}
        onSaved={loadData}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Nota Fiscal"
        description="Tem certeza que deseja excluir esta nota fiscal? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        confirmText="Excluir"
        destructive
      />
    </div>
  );
}