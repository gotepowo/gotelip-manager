import db from "@/api/databaseClient";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2, Printer, Receipt } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import moment from "moment";

export default function ReceiptDialog({ open, onOpenChange, order }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    db.entities.Setting.list("-created_date", 1)
      .then((list) => list.length > 0 && setSettings(list[0]))
      .catch(() => {});
  }, [open]);

  const handleDownload = async () => {
    const element = document.getElementById("receipt-document");
    if (!element) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 12;
      const printableWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * printableWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", margin, margin, printableWidth, imageHeight);
      pdf.save(`Recibo-${order.os_number || "documento"}.pdf`);
      toast({ title: "Recibo baixado em PDF!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (!order) return null;

  const fmtCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
  const storeName = settings?.store_name || "Gotelip Manager";
  const receiptDate = order.delivered_date || order.completion_date || moment().format("YYYY-MM-DD");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-2xl print:max-h-none print:max-w-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Recibo de pagamento e garantia
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2" disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
              </Button>
              <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div id="receipt-document" className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="h-2 bg-[#2563eb]" />
          <div className="p-8 sm:p-10 print:p-0">
            <header className="mb-7 flex items-start justify-between gap-5 border-b-2 border-slate-900 pb-5">
              <div className="flex min-w-0 items-start gap-4">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-14 w-14 rounded-xl border border-slate-200 object-contain p-1" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#2563eb] text-xl font-bold text-white">
                    {storeName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-950">{storeName}</h2>
                  <p className="mt-1 text-xs text-slate-600">{settings?.address || "Assistência técnica especializada"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                    {settings?.cnpj && <span>CNPJ: {settings.cnpj}</span>}
                    {settings?.phone && <span>Tel.: {settings.phone}</span>}
                    {settings?.email && <span>{settings.email}</span>}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Recibo</span>
                <p className="mt-2 text-lg font-black text-slate-950">#{order.os_number || "—"}</p>
              </div>
            </header>

            <section className="mb-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Valor recebido</p>
              <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{fmtCurrency(order.amount_received)}</p>
              <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#2563eb]" />
            </section>

            <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm leading-7 text-slate-700">
                Recebemos de <strong className="text-slate-950">{order.client_name}</strong> o valor acima referente ao serviço realizado no equipamento descrito neste documento.
              </p>
            </section>

            <section className="mb-6 overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[120px_1fr] border-b border-slate-200 text-sm">
                <div className="bg-slate-100 px-4 py-3 font-semibold text-slate-600">Equipamento</div>
                <div className="px-4 py-3 font-medium text-slate-900">{order.device_name || "—"}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] border-b border-slate-200 text-sm">
                <div className="bg-slate-100 px-4 py-3 font-semibold text-slate-600">Problema</div>
                <div className="px-4 py-3 font-medium text-slate-900">{order.problem_type || "—"}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] border-b border-slate-200 text-sm">
                <div className="bg-slate-100 px-4 py-3 font-semibold text-slate-600">Serviço</div>
                <div className="px-4 py-3 font-medium text-slate-900">{order.service_description || "—"}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] text-sm">
                <div className="bg-slate-100 px-4 py-3 font-semibold text-slate-600">Data</div>
                <div className="px-4 py-3 font-medium text-slate-900">{moment(receiptDate).format("DD/MM/YYYY")}</div>
              </div>
            </section>

            <section className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-blue-950">Garantia legal de 90 dias</h3>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-inset ring-blue-200">90 dias</span>
              </div>
              <p className="text-xs leading-relaxed text-blue-900/80">
                A garantia cobre o serviço executado e a peça substituída, contados da entrega do equipamento. Não cobre queda, impacto, líquido, oxidação, mau uso, intervenção de terceiros ou defeitos sem relação com o reparo realizado.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-8 pt-5 print:break-inside-avoid">
              <div>
                <div className="h-16 border-b border-slate-400" />
                <p className="pt-1 text-center text-xs text-slate-500">{storeName}</p>
              </div>
              <div>
                <div className="h-16 border-b border-slate-400" />
                <p className="pt-1 text-center text-xs text-slate-500">{order.client_name}</p>
              </div>
            </section>

            <footer className="mt-7 flex items-center justify-between border-t border-slate-200 pt-3 text-[9px] text-slate-400">
              <span>Recibo vinculado à OS #{order.os_number || "—"}</span>
              <span>Emitido em {moment().format("DD/MM/YYYY [às] HH:mm")}</span>
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
