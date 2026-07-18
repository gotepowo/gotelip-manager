import db from "@/api/databaseClient";

import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Check,
  Download,
  Eraser,
  FileSignature,
  FileText,
  Loader2,
  Printer,
  Trash2,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import moment from "moment";

const Field = ({ label, value, className = "" }) => (
  <div className={className}>
    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="min-h-[22px] whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-900">
      {value || "—"}
    </p>
  </div>
);

export default function OSDocumentDialog({ open, onOpenChange, order, onSaved }) {
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!open) return;
    db.entities.Setting.list("-created_date", 1)
      .then((list) => list.length > 0 && setSettings(list[0]))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open || !order) return;
    setHasSignature(Boolean(order.client_signature));
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (order.client_signature) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = order.client_signature;
      }
    }, 100);
  }, [open, order]);

  const getPos = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    return {
      x: (point.clientX - rect.left) * (canvas.width / rect.width),
      y: (point.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (event) => {
    event.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPos(event);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(event);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;
    setHasSignature(true);
  };

  const stopDraw = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      toast({ title: "Desenhe a assinatura do cliente primeiro", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await db.entities.ServiceOrder.update(order.id, {
        client_signature: canvas.toDataURL("image/png"),
        os_signed: true,
        signed_date: new Date().toISOString(),
      });
      toast({ title: "OS assinada e confirmada!" });
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar assinatura", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById("os-document");
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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * printableWidth) / canvas.width;
      let remaining = imageHeight;
      let y = margin;

      pdf.addImage(imgData, "PNG", margin, y, printableWidth, imageHeight);
      remaining -= pageHeight - margin * 2;
      while (remaining > 0) {
        pdf.addPage();
        y = margin - (imageHeight - remaining);
        pdf.addImage(imgData, "PNG", margin, y, printableWidth, imageHeight);
        remaining -= pageHeight - margin * 2;
      }
      pdf.save(`OS-${order.os_number || "documento"}.pdf`);
      toast({ title: "OS baixada em PDF!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await db.entities.ServiceOrder.update(order.id, {
        client_signature: "",
        os_signed: false,
        signed_date: null,
      });
      toast({ title: "Assinatura removida da OS" });
      setDeleteOpen(false);
      clearSignature();
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao remover assinatura", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (!order) return null;

  const fmtCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
  const storeName = settings?.store_name || "Gotelip Assistência";
  const entryDate = order.entry_date ? moment(order.entry_date).format("DD/MM/YYYY") : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-4xl print:max-h-none print:max-w-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Ordem de Serviço — {order.os_number}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2" disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Baixar PDF
              </Button>
              <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              {order.os_signed && (
                <Button
                  onClick={() => setDeleteOpen(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-600"
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Remover assinatura
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div id="os-document" className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="h-2 bg-[#2563eb]" />

          <div className="p-7 sm:p-9 print:p-0">
            <header className="mb-7 flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
              <div className="flex min-w-0 items-start gap-4">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-contain p-1" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-2xl font-bold text-white">
                    {storeName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">{storeName}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{settings?.address || "Assistência técnica especializada"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    {settings?.cnpj && <span><strong>CNPJ:</strong> {settings.cnpj}</span>}
                    {settings?.phone && <span><strong>Telefone:</strong> {settings.phone}</span>}
                    {settings?.email && <span><strong>E-mail:</strong> {settings.email}</span>}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  Ordem de serviço
                </span>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">#{order.os_number || "—"}</p>
                <p className="mt-1 text-xs text-slate-500">Entrada em {entryDate}</p>
              </div>
            </header>

            <section className="mb-5 overflow-hidden rounded-xl border border-slate-200">
              <div className="bg-slate-900 px-4 py-2.5">
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Dados do cliente</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <Field label="Nome" value={order.client_name} />
                <Field label="Telefone" value={order.client_phone} />
              </div>
            </section>

            <section className="mb-5 overflow-hidden rounded-xl border border-slate-200">
              <div className="bg-slate-100 px-4 py-2.5">
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">Equipamento e atendimento</h3>
              </div>
              <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2">
                <Field label="Equipamento" value={order.device_name} />
                <Field label="Problema relatado" value={order.problem_type} />
                <Field label="Serviço / diagnóstico" value={order.service_description} className="sm:col-span-2" />
              </div>
            </section>

            <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Status da ordem</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{order.status || "Em atendimento"}</p>
              </div>
              <div className="min-w-[220px] rounded-xl bg-[#eff6ff] p-4 text-right ring-1 ring-inset ring-blue-200">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Valor do serviço</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-blue-950">{fmtCurrency(order.amount_received)}</p>
              </div>
            </section>

            <section className="mb-6 rounded-xl border border-slate-200 p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-700">Termos e garantia</h3>
              <div className="space-y-2 text-[11px] leading-relaxed text-slate-600">
                <p><strong>1.</strong> O cliente autoriza a execução do serviço descrito nesta ordem.</p>
                <p><strong>2.</strong> O pagamento deverá ser realizado conforme o valor e as condições acordadas.</p>
                <p><strong>3.</strong> A garantia legal é de 90 dias e cobre somente o serviço realizado e a peça substituída.</p>
                <p><strong>4.</strong> A garantia não cobre queda, impacto, líquido, oxidação, mau uso, violação por terceiros ou defeito sem relação com o reparo.</p>
              </div>
            </section>

            {!!order.attachments?.length && (
              <section className="mb-6 print:break-inside-avoid">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-700">Anexos do equipamento</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {order.attachments.map((attachment, index) => {
                    const isImage = attachment.type?.startsWith("image/");
                    return isImage ? (
                      <a key={`${attachment.file_url}-${index}`} href={attachment.file_url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        <img src={attachment.file_url} alt={attachment.name || "Anexo"} className="h-28 w-full object-cover" />
                        <p className="truncate px-2 py-1.5 text-[10px] text-slate-600">{attachment.name || attachment.original_name}</p>
                      </a>
                    ) : (
                      <a key={`${attachment.file_url}-${index}`} href={attachment.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="min-w-0 flex-1 truncate">{attachment.name || attachment.original_name}</span>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 gap-8 border-t-2 border-slate-900 pt-6 sm:grid-cols-2 print:break-inside-avoid">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Assinatura do cliente</p>
                {order.os_signed && order.client_signature ? (
                  <div>
                    <img src={order.client_signature} alt="Assinatura do cliente" className="h-20 max-w-full object-contain object-left" />
                    <div className="border-t border-slate-400 pt-1 text-xs text-slate-500">{order.client_name}</div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Assinado em {order.signed_date ? moment(order.signed_date).format("DD/MM/YYYY [às] HH:mm") : "—"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="print:hidden">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={150}
                        className="h-[130px] w-full cursor-crosshair touch-none rounded-lg border-2 border-dashed border-slate-300 bg-slate-50"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[10px] text-slate-500">{hasSignature ? "Assinatura capturada ✓" : "Assine na área acima"}</p>
                        {hasSignature && (
                          <button type="button" onClick={clearSignature} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-900">
                            <Eraser className="h-3 w-3" /> Limpar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="hidden h-20 border-b border-slate-400 print:block" />
                  </>
                )}
              </div>

              <div className="flex flex-col justify-end">
                <div className="h-20 border-b border-slate-400" />
                <p className="pt-1 text-center text-xs text-slate-500">{storeName}</p>
              </div>
            </section>

            <footer className="mt-7 flex items-center justify-between border-t border-slate-200 pt-3 text-[9px] text-slate-400">
              <span>Documento vinculado à OS #{order.os_number || "—"}</span>
              <span>Emitido em {moment().format("DD/MM/YYYY [às] HH:mm")}</span>
            </footer>
          </div>
        </div>

        <div className="print:hidden">
          {!order.os_signed ? (
            <Button onClick={handleConfirm} disabled={saving || !hasSignature} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Salvando..." : "Confirmar e assinar"}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" /> OS assinada e confirmada
            </div>
          )}
        </div>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Remover assinatura"
          description={`Tem certeza que deseja remover a assinatura da OS ${order.os_number || ""}? A ordem continuará existindo.`}
          onConfirm={handleDelete}
          confirmText="Remover assinatura"
          destructive
        />
      </DialogContent>
    </Dialog>
  );
}
