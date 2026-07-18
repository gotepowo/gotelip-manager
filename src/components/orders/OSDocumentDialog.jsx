import db from "@/api/databaseClient";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

import { useToast } from "@/components/ui/use-toast";
import { Printer, Check, Eraser, Loader2, FileSignature, Trash2, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import moment from "moment";

export default function OSDocumentDialog({ open, onOpenChange, order, onSaved, onDelete }) {
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
    if (open) {
      db.entities.Setting.list("-created_date", 1).then(list => {
        if (list.length > 0) setSettings(list[0]);
      }).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open && order) {
      setHasSignature(!!order.client_signature);
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (order.client_signature) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = order.client_signature;
          }
        }
      }, 100);
    }
  }, [open, order]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.strokeStyle = "#1e293b";
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
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      toast({ title: "Desenhe a assinatura do cliente primeiro", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const signatureData = canvas.toDataURL("image/png");
      await db.entities.ServiceOrder.update(order.id, {
        client_signature: signatureData,
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const element = document.getElementById("os-document");
    if (!element) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
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
      setHasSignature(false);
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

  const fmtCurrency = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  const storeName = settings?.store_name || "Gotelip Assistência";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Ordem de Serviço — {order.os_number}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2" disabled={downloading}>
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Baixar PDF
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
              {order.os_signed && (
                <Button onClick={() => setDeleteOpen(true)} variant="outline" size="sm" className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-600" disabled={deleting}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remover Assinatura
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Printable Document */}
        <div className="bg-white border rounded-xl p-8 print:border-0 print:p-0" id="os-document">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4 mb-6">
            <div className="flex items-center gap-3">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-14 w-14 object-contain" />
              )}
              <div>
                <h2 className="text-xl font-bold text-foreground">{storeName}</h2>
                {settings?.address && <p className="text-xs text-muted-foreground">{settings.address}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                  {settings?.cnpj && <span>CNPJ: {settings.cnpj}</span>}
                  {settings?.phone && <span>Telefone: {settings.phone}</span>}
                </div>
                {settings?.email && <p className="text-xs text-muted-foreground">{settings.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-lg font-bold text-foreground">Ordem de Serviço</h3>
              <p className="text-sm font-mono text-muted-foreground">{order.os_number}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {order.entry_date ? moment(order.entry_date).format("DD/MM/YYYY") : ""}
              </p>
            </div>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
              <p className="text-sm font-semibold">{order.client_name}</p>
              <p className="text-sm text-muted-foreground">{order.client_phone || ""}</p>
            </div>
          </div>

          {/* Device & Problem */}
          <div className="space-y-4 mb-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Dispositivo</p>
              <p className="text-sm font-semibold border-b border-dashed pb-2">{order.device_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Problema Relatado</p>
              <p className="text-sm border-b border-dashed pb-2">{order.problem_type}</p>
            </div>
            {order.service_description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Descrição do Serviço</p>
                <p className="text-sm border-b border-dashed pb-2">{order.service_description}</p>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Valor do Serviço</span>
              <span className="text-2xl font-bold text-foreground">{fmtCurrency(order.amount_received)}</span>
            </div>
          </div>

          {/* Terms */}
          <div className="text-xs text-muted-foreground space-y-1 mb-6">
            <p>• O cliente autoriza a realização do serviço conforme descrito acima.</p>
            <p>• O valor total deverá ser pago no ato da entrega do dispositivo.</p>
            <p>• A garantia do serviço é de 90 dias a partir da data de entrega.</p>
          </div>

          {/* Signature Area */}
          <div className="border-t pt-6">
            <p className="text-sm font-medium text-foreground mb-2">Assinatura do Cliente:</p>
            {order.os_signed && order.client_signature && !hasSignature ? (
              <div className="border-b border-foreground/30 pb-2">
                <img src={order.client_signature} alt="Assinatura" className="h-20" />
                <p className="text-xs text-muted-foreground mt-1">
                  Assinado em {order.signed_date ? moment(order.signed_date).format("DD/MM/YYYY [às] HH:mm") : ""}
                </p>
              </div>
            ) : (
              <div className="print:hidden">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={150}
                  className="w-full h-[150px] border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {hasSignature ? "Assinatura capturada ✓" : "Desenhe a assinatura do cliente na área acima"}
                  </p>
                  {hasSignature && (
                    <button type="button" onClick={clearSignature} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Eraser className="w-3 h-3" /> Limpar
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Static signature for print */}
            {order.os_signed && order.client_signature && hasSignature && (
              <div className="hidden print:block">
                <img src={canvasRef.current?.toDataURL("image/png")} alt="Assinatura" className="h-20" />
              </div>
            )}
          </div>
        </div>

        {/* Confirm action */}
        <div className="print:hidden">
          {!order.os_signed ? (
            <Button onClick={handleConfirm} disabled={saving || !hasSignature} className="gap-2 w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Salvando..." : "Confirmar e Assinar"}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 rounded-lg py-2.5">
              <Check className="w-4 h-4" /> OS já assinada e confirmada
            </div>
          )}
        </div>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Remover Assinatura"
          description={`Tem certeza que deseja remover a assinatura da OS ${order.os_number || ""}? A OS continuará existindo, apenas a assinatura será apagada.`}
          onConfirm={handleDelete}
          confirmText="Remover Assinatura"
          destructive
        />
      </DialogContent>
    </Dialog>
  );
}