import db from "@/api/databaseClient";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/components/ui/use-toast";
import { Upload, Loader2 } from "lucide-react";
import moment from "moment";

const types = ["Entrada", "Saída"];
const categories = ["Serviço", "Peça", "Taxa", "Outro"];

export default function InvoiceFormDialog({ open, onOpenChange, invoice, orders, prefillOrder, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    invoice_number: "",
    type: "Entrada",
    category: "Serviço",
    issuer_name: "",
    recipient_name: "",
    date: moment().format("YYYY-MM-DD"),
    amount: 0,
    file_url: "",
    description: "",
    service_order_id: "",
    service_order_number: "",
    client_id: "",
    client_name: "",
  });

  useEffect(() => {
    if (invoice) {
      setForm({
        invoice_number: invoice.invoice_number || "",
        type: invoice.type || "Entrada",
        category: invoice.category || "Serviço",
        issuer_name: invoice.issuer_name || "",
        recipient_name: invoice.recipient_name || "",
        date: invoice.date || moment().format("YYYY-MM-DD"),
        amount: invoice.amount || 0,
        file_url: invoice.file_url || "",
        description: invoice.description || "",
        service_order_id: invoice.service_order_id || "",
        service_order_number: invoice.service_order_number || "",
        client_id: invoice.client_id || "",
        client_name: invoice.client_name || "",
      });
    } else if (prefillOrder) {
      setForm({
        invoice_number: "",
        type: "Saída",
        category: "Serviço",
        issuer_name: "",
        recipient_name: prefillOrder.client_name || "",
        date: moment().format("YYYY-MM-DD"),
        amount: prefillOrder.amount_received || 0,
        file_url: "",
        description: `Ref: ${prefillOrder.device_name || ""} — ${prefillOrder.problem_type || ""}`,
        service_order_id: prefillOrder.id,
        service_order_number: prefillOrder.os_number || "",
        client_id: prefillOrder.client_id || "",
        client_name: prefillOrder.client_name || "",
      });
    } else {
      setForm({
        invoice_number: "",
        type: "Entrada",
        category: "Serviço",
        issuer_name: "",
        recipient_name: "",
        date: moment().format("YYYY-MM-DD"),
        amount: 0,
        file_url: "",
        description: "",
        service_order_id: "",
        service_order_number: "",
        client_id: "",
        client_name: "",
      });
    }
  }, [invoice, open, prefillOrder]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } =
      await db.integrations.Core.UploadFile({
        file,
        category: "invoices",
      });
      setForm(prev => ({ ...prev, file_url }));
      toast({ title: "Arquivo enviado!" });
    } catch {
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleOrderSelect = (orderId) => {
    const order = (orders || []).find(o => o.id === orderId);
    if (order) {
      setForm(prev => ({
        ...prev,
        service_order_id: order.id,
        service_order_number: order.os_number || "",
        client_id: order.client_id || "",
        client_name: order.client_name || "",
        recipient_name: prev.recipient_name || order.client_name || "",
      }));
    } else {
      setForm(prev => ({ ...prev, service_order_id: "", service_order_number: "", client_id: "", client_name: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.invoice_number.trim() || !form.date || !form.amount) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        amount: parseFloat(form.amount) || 0,
      };
      if (invoice?.id) {
        await db.entities.Invoice.update(invoice.id, data);
        toast({ title: "Nota fiscal atualizada!" });
      } else {
        await db.entities.Invoice.create(data);
        toast({ title: "Nota fiscal criada!" });
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar nota fiscal", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice?.id ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Número da NF *</Label>
              <Input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} placeholder="Ex: NF-00123" />
            </div>
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Emitente</Label>
              <Input value={form.issuer_name} onChange={e => setForm({ ...form, issuer_name: e.target.value })} placeholder="Quem emitiu a nota" />
            </div>
            <div>
              <Label>Destinatário</Label>
              <Input value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })} placeholder="Para quem foi emitida" />
            </div>
          </div>

          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>

          <div>
            <Label>Vincular à Ordem de Serviço</Label>
            <Select
              value={form.service_order_id}
              onValueChange={handleOrderSelect}
            >
              <SelectTrigger><SelectValue placeholder="Selecione uma OS (opcional)" /></SelectTrigger>
              <SelectContent>
                {(orders || []).map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.os_number || "Sem número"} — {o.client_name} ({o.device_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Observações sobre a nota..." rows={2} />
          </div>

          {/* File Upload */}
          <div>
            <Label>Arquivo da Nota Fiscal</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploading ? "Enviando..." : "Enviar arquivo"}</span>
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" disabled={uploading} />
              </label>
              {form.file_url && (
                <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                  Ver arquivo anexado
                </a>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : invoice?.id ? "Atualizar" : "Criar Nota"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}