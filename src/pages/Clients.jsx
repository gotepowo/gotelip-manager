import db from "@/api/databaseClient";
import { deleteWithUndo } from "@/lib/undoDelete";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import CurrencyDisplay from "@/components/shared/CurrencyDisplay";
import StatusBadge from "@/components/shared/StatusBadge";
import ClientFormDialog from "@/components/clients/ClientFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Pencil, Trash2, ChevronRight, Phone, Mail, MapPin, ArrowLeft, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { exportToCSV } from "@/utils/exportCSV";
import ImportCSVButton from "@/components/shared/ImportCSVButton";
import moment from "moment";

export default function Clients() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [c, o] = await Promise.all([
      db.entities.Client.list("-created_date", 500),
      db.entities.ServiceOrder.list("-created_date", 500),
    ]);
    setClients(c);
    setOrders(o);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return clients.filter(c => {
      return !search ||
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email || "").toLowerCase().includes(search.toLowerCase());
    });
  }, [clients, search]);

  const getClientOrders = (clientId) => orders.filter(o => o.client_id === clientId);

  const getClientStats = (clientId) => {
    const co = getClientOrders(clientId);
    const totalReceived = co.reduce((s, o) => s + (o.amount_received || 0), 0);
    const totalProfit = co.reduce((s, o) => s + (o.profit || 0), 0);
    return { count: co.length, totalReceived, totalProfit };
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteWithUndo({ entity: db.entities.Client, record: deleteTarget, toast, onChanged: loadData, label: "Cliente excluído" });
    setDeleteOpen(false);
    setDeleteTarget(null);
    setSelectedClient(null);
    loadData();
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast({ title: "Nenhum cliente para exportar", variant: "destructive" });
      return;
    }
    exportToCSV(filtered.map(c => {
      const s = getClientStats(c.id);
      return { ...c, count: s.count, totalReceived: s.totalReceived, totalProfit: s.totalProfit };
    }), [
      { key: "full_name", label: "Nome" },
      { key: "phone", label: "Telefone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Endereço" },
      { key: "count", label: "Atendimentos" },
      { key: "totalReceived", label: "Total Pago" },
      { key: "totalProfit", label: "Lucro Gerado" },
    ], `clientes-${moment().format("DD-MM-YYYY")}`);
    toast({ title: "Clientes exportados em CSV!" });
  };

  const importColumns = [
    { label: "Nome", key: "full_name", required: true },
    { label: "Telefone", key: "phone", required: true },
    { label: "Email", key: "email" },
    { label: "Endereço", key: "address" },
  ];

  const handleImport = async (records) => {
    await db.entities.Client.bulkCreate(records);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Client Detail View
  if (selectedClient) {
    const clientOrders = getClientOrders(selectedClient.id);
    const stats = getClientStats(selectedClient.id);

    return (
      <div>
        <button onClick={() => setSelectedClient(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar aos clientes
        </button>

        <div className="bg-card rounded-xl border p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{selectedClient.full_name}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                {selectedClient.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selectedClient.phone}</span>}
                {selectedClient.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selectedClient.email}</span>}
                {selectedClient.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedClient.address}</span>}
              </div>
              {selectedClient.notes && <p className="text-sm text-muted-foreground mt-2 italic">{selectedClient.notes}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditClient(selectedClient); setFormOpen(true); }}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
              </Button>
              <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => { setDeleteTarget(selectedClient); setDeleteOpen(true); }}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
              </Button>
            </div>
          </div>
        </div>

        {/* Client Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Atendimentos</p>
            <p className="text-2xl font-bold mt-1">{stats.count}</p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Total Pago</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600"><CurrencyDisplay value={stats.totalReceived} /></p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Lucro Gerado</p>
            <p className="text-2xl font-bold mt-1"><CurrencyDisplay value={stats.totalProfit} showSign /></p>
          </div>
        </div>

        {/* Client Orders */}
        <h3 className="text-sm font-semibold mb-3">Histórico de Atendimentos</h3>
        {clientOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum atendimento registrado.</p>
        ) : (
          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">OS</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Dispositivo</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Problema</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Data</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {clientOrders.map(o => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{o.os_number || "—"}</td>
                    <td className="px-4 py-3 text-sm">{o.device_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.problem_type}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.entry_date ? moment(o.entry_date).format("DD/MM/YY") : "—"}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium"><CurrencyDisplay value={o.profit} showSign /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editClient} onSaved={() => { loadData(); setSelectedClient(prev => editClient ? { ...prev, ...editClient } : prev); }} />
        <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Excluir Cliente" description={`Excluir ${deleteTarget?.full_name}? Os atendimentos não serão removidos.`} onConfirm={handleDelete} confirmText="Excluir" destructive />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Clientes" subtitle={`${clients.length} clientes cadastrados`}>
        <ImportCSVButton columns={importColumns} onImport={handleImport} />
        <Button onClick={handleExportCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
        <Button onClick={() => { setEditClient(null); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </PageHeader>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 max-w-md" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente encontrado" description="Cadastre seu primeiro cliente para começar.">
          <Button onClick={() => { setEditClient(null); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => {
            const stats = getClientStats(client.id);
            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="bg-card rounded-xl border p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{client.full_name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{client.phone}</p>
                    {client.email && <p className="text-xs text-muted-foreground truncate">{client.email}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">{stats.count} atendimento{stats.count !== 1 ? "s" : ""}</span>
                  <span className="text-xs font-medium"><CurrencyDisplay value={stats.totalProfit} showSign /></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editClient} onSaved={loadData} />
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Excluir Cliente" description={`Excluir ${deleteTarget?.full_name}?`} onConfirm={handleDelete} confirmText="Excluir" destructive />
    </div>
  );
}