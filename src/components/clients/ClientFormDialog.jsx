import db from "@/api/databaseClient";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useToast } from "@/components/ui/use-toast";

export default function ClientFormDialog({ open, onOpenChange, client, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", address: "", notes: ""
  });

  useEffect(() => {
    if (client) {
      setForm({
        full_name: client.full_name || "",
        phone: client.phone || "",
        email: client.email || "",
        address: client.address || "",
        notes: client.notes || "",
      });
    } else {
      setForm({ full_name: "", phone: "", email: "", address: "", notes: "" });
    }
  }, [client, open]);

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (client?.id) {
        await db.entities.Client.update(client.id, form);
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        await db.entities.Client.create(form);
        toast({ title: "Cliente cadastrado com sucesso!" });
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar cliente", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{client?.id ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome Completo *</Label>
            <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Nome do cliente" />
          </div>
          <div>
            <Label>Telefone / WhatsApp *</Label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Endereço completo" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais..." rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : client?.id ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}