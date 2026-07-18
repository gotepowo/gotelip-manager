import db from "@/api/databaseClient";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function TransactionFormDialog({ open, onOpenChange, transaction, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: moment().format("YYYY-MM-DD"),
    type: "Entrada",
    category: "Serviço",
    amount: 0,
    description: "",
    client_name: "",
  });

  useEffect(() => {
    if (transaction) {
      setForm({
        date: transaction.date || moment().format("YYYY-MM-DD"),
        type: transaction.type || "Entrada",
        category: transaction.category || "Serviço",
        amount: transaction.amount || 0,
        description: transaction.description || "",
        client_name: transaction.client_name || "",
      });
    } else {
      setForm({ date: moment().format("YYYY-MM-DD"), type: "Entrada", category: "Serviço", amount: 0, description: "", client_name: "" });
    }
  }, [transaction, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, amount: parseFloat(form.amount) };
      if (transaction?.id) {
        await db.entities.Transaction.update(transaction.id, data);
        toast({ title: "Transação atualizada!" });
      } else {
        await db.entities.Transaction.create(data);
        toast({ title: "Transação registrada!" });
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar transação", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction?.id ? "Editar Transação" : "Nova Transação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Saída">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Serviço">Serviço</SelectItem>
                  <SelectItem value="Peça">Peça</SelectItem>
                  <SelectItem value="Taxa">Taxa</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Cliente (opcional)</Label>
            <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Nome do cliente" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descreva a transação..." rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : transaction?.id ? "Atualizar" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}