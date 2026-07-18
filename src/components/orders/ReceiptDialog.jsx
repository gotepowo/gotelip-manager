import db from "@/api/databaseClient";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useToast } from "@/components/ui/use-toast";
import { Printer, Download, Receipt, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import moment from "moment";

export default function ReceiptDialog({ open, onOpenChange, order }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) {
      db.entities.Setting.list("-created_date", 1).then(list => {
        if (list.length > 0) setSettings(list[0]);
      }).catch(() => {});
    }
  }, [open]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    const element = document.getElementById("receipt-document");
    if (!element) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Recibo-${order.os_number || "documento"}.pdf`);
      toast({ title: "Recibo baixado em PDF!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (!order) return null;

  const fmtCurrency = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  const storeName = settings?.store_name || "Gotelip Assistência";
  const receiptDate = order.delivered_date || order.completion_date || moment().format("YYYY-MM-DD");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Recibo de Pagamento
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2" disabled={downloading}>
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                PDF
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-white border rounded-xl p-8 print:border-0 print:p-0" id="receipt-document">
          {/* Header */}
          <div className="text-center border-b pb-4 mb-6">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="h-16 w-16 object-contain mx-auto mb-2" />
            )}
            <h2 className="text-lg font-bold text-foreground">{storeName}</h2>
            {settings?.address && <p className="text-xs text-muted-foreground">{settings.address}</p>}
            <div className="flex justify-center gap-3 text-xs text-muted-foreground mt-0.5">
              {settings?.cnpj && <span>CNPJ: {settings.cnpj}</span>}
              {settings?.phone && <span>Telefone: {settings.phone}</span>}
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recibo de Pagamento</h3>
            <p className="text-xs text-muted-foreground mt-1">Nº {order.os_number}</p>
          </div>

          <div className="mb-6">
            <p className="text-sm text-foreground leading-relaxed">
              Recebi(emos) de <strong>{order.client_name}</strong> a importância de{" "}
              <strong className="text-lg">{fmtCurrency(order.amount_received)}</strong>{" "}
              referente ao serviço de conserto/manutenção do dispositivo abaixo descriminado:
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dispositivo:</span>
              <span className="font-medium text-right">{order.device_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Problema:</span>
              <span className="font-medium text-right">{order.problem_type}</span>
            </div>
            {order.service_description && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Serviço:</span>
                <span className="font-medium text-right max-w-[60%]">{order.service_description}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-sm mb-8 pt-2 border-t">
            <span className="text-muted-foreground">Data de Entrega:</span>
            <span className="font-medium">{moment(receiptDate).format("DD/MM/YYYY")}</span>
          </div>

          {/* Warranty note */}
          <div className="text-xs text-muted-foreground bg-blue-50 rounded-lg p-3 mb-8">
            <p className="font-medium text-blue-800 mb-1">Garantia de 90 dias</p>
            <p>Este serviço possui garantia de 90 dias a partir da data de entrega, 
            válida para o serviço prestado. A garantia não cobre danos por mau uso, quedas ou infiltração de líquidos.</p>
          </div>

          {/* Signature */}
          <div className="border-t pt-8">
            <div className="border-b border-foreground/30 pb-1 mb-1 w-64 mx-auto"></div>
            <p className="text-center text-xs text-muted-foreground">{storeName}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}