import db from "@/api/databaseClient";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ExternalLink, Check } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import CurrencyDisplay from "@/components/shared/CurrencyDisplay";

export default function NotifyClientDialog({ open, onOpenChange, order, onNotified }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const defaultMessage = `Olá, ${order?.client_name}! O ${order?.device_name} já está pronto para retirada. O valor total é ${
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order?.amount_received || 0)
  }. Aguardamos você. Obrigado!`;

  const [message, setMessage] = useState(defaultMessage);

  useEffect(() => {
    setMessage(defaultMessage);
    setCopied(false);
  }, [order, open]);

  const phoneDigits = (order?.client_phone || "").replace(/\D/g, "");
  const whatsappPhone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "Mensagem copiada!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleMarkNotified = async () => {
    try {
      await db.entities.ServiceOrder.update(order.id, {
        client_notified: true,
        notification_date: new Date().toISOString(),
      });
      toast({ title: "Cliente marcado como avisado!" });
      onNotified();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao registrar aviso", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Avisar Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm"><strong>Cliente:</strong> {order?.client_name}</p>
            <p className="text-sm"><strong>Telefone:</strong> {order?.client_phone}</p>
            <p className="text-sm"><strong>Dispositivo:</strong> {order?.device_name}</p>
            <p className="text-sm"><strong>Valor:</strong> <CurrencyDisplay value={order?.amount_received} /></p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Mensagem</label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} />
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleCopy} variant="outline" className="w-full justify-start gap-2">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar mensagem"}
            </Button>
            <Button onClick={handleWhatsApp} className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700">
              <ExternalLink className="w-4 h-4" />
              Abrir no WhatsApp
            </Button>
          </div>

          <div className="border-t pt-3">
            <Button onClick={handleMarkNotified} variant="outline" className="w-full">
              Marcar como avisado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}