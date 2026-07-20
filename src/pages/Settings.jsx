import db from "@/api/databaseClient";

import React, { useState, useEffect } from "react";

import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Save, Store, Loader2, Upload, Download, DatabaseBackup, RotateCcw, Cloud, FolderOpen, RefreshCw, CloudOff, CheckCircle2, AlertTriangle, Trash2, ArchiveRestore, FileText } from "lucide-react";

const formatCnpj = (value) => value.replace(/\D/g, "").slice(0, 14)
  .replace(/^(\d{2})(\d)/, "$1.$2")
  .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
  .replace(/\.(\d{3})(\d)/, ".$1/$2")
  .replace(/(\d{4})(\d)/, "$1-$2");

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settingId, setSettingId] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [trashEntries, setTrashEntries] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashActionId, setTrashActionId] = useState(null);

  const [form, setForm] = useState({
    store_name: "",
    address: "",
    cnpj: "",
    phone: "",
    email: "",
    logo_url: "",
    os_prefix: "OS",
  });

  useEffect(() => {
    loadData();
    loadSyncStatus();
    loadTrashEntries();
  }, []);

  const loadTrashEntries = async () => {
    setTrashLoading(true);
    try {
      setTrashEntries(await db.trash.list());
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao carregar a lixeira", variant: "destructive" });
    } finally {
      setTrashLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      setSyncStatus(await db.sync.status());
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await db.entities.Setting.list("-created_date", 10);
      if (list.length > 0) {
        const s = list[0];
        setSettingId(s.id);
        setForm({
          store_name: s.store_name || "",
          address: s.address || "",
          cnpj: formatCnpj(s.cnpj || ""),
          phone: formatPhone(s.phone || ""),
          email: s.email || "",
          logo_url: s.logo_url || "",
          os_prefix: s.os_prefix || "OS",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } =
      await db.integrations.Core.UploadFile({
        file,
        category: "settings",
      });
      setForm(prev => ({ ...prev, logo_url: file_url }));
      toast({ title: "Logo enviado!" });
    } catch {
      toast({ title: "Erro ao enviar logo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const result = await db.backups.export();
      if (!result.canceled) toast({ title: "Backup completo salvo com sucesso!", description: result.path });
    } catch {
      toast({ title: "Erro ao criar backup", variant: "destructive" });
    }
  };

  const handleImportBackup = async () => {
    if (!window.confirm("Restaurar um backup substituirá todos os dados atuais. Um backup automático será criado antes. Continuar?")) return;
    try {
      const result = await db.backups.import();
      if (!result.canceled) {
        toast({ title: "Backup restaurado!", description: "Recarregando os dados..." });
        setTimeout(() => window.location.reload(), 500);
      }
    } catch {
      toast({ title: "O arquivo selecionado não é um backup válido", variant: "destructive" });
    }
  };


  const handleChooseSyncFolder = async () => {
    try {
      const result = await db.sync.chooseFolder();
      if (!result.canceled) {
        setSyncStatus(result.status);
        toast({ title: "Pasta do OneDrive configurada!", description: result.status.syncFolder });
      }
    } catch (error) {
      toast({ title: "Erro ao configurar OneDrive", description: error.message, variant: "destructive" });
    }
  };

  const handleUseDetectedFolder = async (folderPath) => {
    try {
      const status = await db.sync.useFolder(folderPath);
      setSyncStatus(status);
      toast({ title: "OneDrive configurado!", description: status.syncFolder });
    } catch (error) {
      toast({ title: "Erro ao configurar OneDrive", description: error.message, variant: "destructive" });
    }
  };

  const handleSyncNow = async (preferCloud = false) => {
    setSyncing(true);
    try {
      const result = await db.sync.now({ preferCloud });
      if (result.action === "cloud-empty") {
        const shouldInitialize = window.confirm("Nenhum backup foi encontrado nessa pasta do OneDrive.\n\nSe este é o computador que já possui seus dados, clique em OK para enviar a primeira cópia.\n\nSe este é o segundo computador, clique em Cancelar e aguarde o OneDrive terminar de baixar os arquivos.");
        if (shouldInitialize) {
          const initialized = await db.sync.now({ initializeCloud: true });
          setSyncStatus(initialized.status);
          toast({ title: "Primeira cópia enviada para o OneDrive!" });
        }
        return;
      }
      setSyncStatus(result.status);
      const messages = {
        uploaded: "Dados enviados para o OneDrive!",
        downloaded: "Dados baixados do OneDrive!",
        none: "Tudo já estava sincronizado.",
        disabled: "Configure a pasta do OneDrive primeiro.",
        "cloud-empty": "Nenhum backup encontrado no OneDrive.",
      };
      toast({ title: messages[result.action] || "Sincronização concluída" });
      if (result.reloadRequired) setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      await loadSyncStatus();
      const conflict = String(error.message).includes("CONFLICT");
      if (conflict && window.confirm(`${error.message}\n\nDeseja DESCARTAR as alterações locais e baixar a versão do OneDrive? Um backup local será criado antes.`)) {
        return handleSyncNow(true);
      }
      toast({ title: "Erro de sincronização", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisableSync = async () => {
    if (!window.confirm("Desativar a sincronização neste computador? Os arquivos no OneDrive não serão apagados.")) return;
    const status = await db.sync.disable();
    setSyncStatus(status);
    toast({ title: "Sincronização desativada neste computador." });
  };

  const handleRestoreTrash = async (entry) => {
    setTrashActionId(entry.id);
    try {
      await db.trash.restore(entry.id);
      await loadTrashEntries();
      toast({ title: "Item restaurado com sucesso!" });
      window.dispatchEvent(new CustomEvent("database-updated"));
    } catch (error) {
      toast({ title: "Erro ao restaurar item", description: error.message, variant: "destructive" });
    } finally {
      setTrashActionId(null);
    }
  };

  const handleDeleteTrashEntry = async (entry) => {
    if (!window.confirm(`Apagar "${entry.displayName}" permanentemente? Essa ação não pode ser desfeita.`)) return;
    setTrashActionId(entry.id);
    try {
      await db.trash.delete(entry.id);
      await loadTrashEntries();
      toast({ title: "Item apagado permanentemente." });
    } catch (error) {
      toast({ title: "Erro ao apagar item", description: error.message, variant: "destructive" });
    } finally {
      setTrashActionId(null);
    }
  };

  const handleEmptyTrash = async () => {
    const message = trashEntries.length
      ? `Esvaziar a lixeira e apagar permanentemente ${trashEntries.length} item(ns)? Essa ação não pode ser desfeita.`
      : "Esvaziar a pasta da lixeira? Arquivos antigos sem histórico também serão apagados permanentemente.";
    if (!window.confirm(message)) return;
    setTrashActionId("empty");
    try {
      await db.trash.empty();
      await loadTrashEntries();
      toast({ title: "Lixeira esvaziada." });
    } catch (error) {
      toast({ title: "Erro ao esvaziar a lixeira", description: error.message, variant: "destructive" });
    } finally {
      setTrashActionId(null);
    }
  };

  const entityLabels = {
    Client: "Cliente",
    ServiceOrder: "Ordem de serviço",
    Invoice: "Nota fiscal",
    Transaction: "Transação",
    Setting: "Configuração",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.store_name.trim()) {
      toast({ title: "Informe o nome da loja", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (settingId) {
        await db.entities.Setting.update(settingId, form);
      } else {
        const created = await db.entities.Setting.create(form);
        setSettingId(created.id);
      }
      window.dispatchEvent(new CustomEvent("settings-updated", { detail: form }));
      toast({ title: "Configurações salvas!" });
    } catch {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Informações da loja exibidas nas ordens de serviço" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-6 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Store className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold">Dados da Loja</h2>
          </div>

          <div className="grid grid-cols-[1fr_160px] gap-4">
            <div>
              <Label>Nome da Loja *</Label>
              <Input value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })} placeholder="Ex: Gotelip Assistência" />
            </div>
            <div>
              <Label>Prefixo das OS</Label>
              <Input value={form.os_prefix} onChange={e => setForm({ ...form, os_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 10) })} placeholder="OS" />
              <p className="mt-1 text-xs text-muted-foreground">Ex.: OS-2026-0001</p>
            </div>
          </div>

          <div>
            <Label>Endereço</Label>
            <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade — CEP" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: formatCnpj(e.target.value) })} placeholder="00.000.000/0000-00" inputMode="numeric" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" inputMode="tel" />
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contato@...com" />
          </div>

          <div>
            <Label>Logo da Loja</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploading ? "Enviando..." : "Enviar logo"}</span>
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" disabled={uploading} />
              </label>
              {form.logo_url && (
                <div className="flex items-center gap-3">
                  <img src={form.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded-lg border" />
                  <button type="button" onClick={() => setForm({ ...form, logo_url: "" })} className="text-xs text-red-500 hover:underline">Remover</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <DatabaseBackup className="h-5 w-5 text-primary" />
            <div><h2 className="text-sm font-semibold">Backup completo do banco</h2><p className="text-xs text-muted-foreground">Inclui clientes, OS, notas, transações e configurações.</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="gap-2" onClick={handleExportBackup}><Download className="h-4 w-4" /> Fazer e salvar backup</Button>
            <Button type="button" variant="outline" className="gap-2" onClick={handleImportBackup}><RotateCcw className="h-4 w-4" /> Carregar/restaurar backup</Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Ao restaurar, o banco atual é preservado automaticamente na pasta de backups antes da substituição.</p>
        </div>

        <div className="mt-6 rounded-xl border bg-card p-6">
          <div className="flex items-start justify-between gap-4 border-b pb-3">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Histórico de exclusões</h2>
                <p className="text-xs text-muted-foreground">Restaure registros e arquivos removidos ou apague-os permanentemente.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-red-500"
              disabled={trashLoading || trashActionId === "empty"}
              onClick={handleEmptyTrash}
            >
              {trashActionId === "empty" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Esvaziar lixeira
            </Button>
          </div>

          <div className="mt-4">
            {trashLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando histórico...
              </div>
            ) : trashEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                A lixeira está vazia.
              </div>
            ) : (
              <div className="space-y-2">
                {trashEntries.map(entry => (
                  <div key={entry.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="truncate text-sm font-medium">{entry.displayName}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entityLabels[entry.entityName] || entry.entityName}
                        {" · "}
                        excluído em {new Date(entry.deletedAt).toLocaleString("pt-BR")}
                        {entry.fileCount > 0 ? ` · ${entry.fileCount} arquivo(s)` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={trashActionId === entry.id}
                        onClick={() => handleRestoreTrash(entry)}
                      >
                        {trashActionId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
                        Restaurar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-red-500"
                        disabled={trashActionId === entry.id}
                        onClick={() => handleDeleteTrashEntry(entry)}
                      >
                        <Trash2 className="h-4 w-4" /> Apagar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Os itens permanecem na lixeira até serem restaurados ou apagados manualmente.</p>
        </div>

        <div className="mt-6 rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <Cloud className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">Sincronização pela pasta do OneDrive</h2>
              <p className="text-xs text-muted-foreground">Mantém o banco e os arquivos iguais entre o PC de casa e o notebook da loja.</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {!syncStatus?.enabled ? <CloudOff className="h-4 w-4 text-muted-foreground" /> : syncStatus?.lastError ? <AlertTriangle className="h-4 w-4 text-red-500" /> : syncStatus?.dirty ? <RefreshCw className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {!syncStatus?.enabled ? "Não configurado" : syncStatus?.lastError ? "Erro de sincronização" : syncStatus?.dirty ? "Alterações locais pendentes" : "Sincronizado"}
              </div>
              {syncStatus?.syncFolder && <p className="mt-2 break-all text-xs text-muted-foreground">Pasta: {syncStatus.syncFolder}</p>}
              {syncStatus?.lastSyncAt && <p className="mt-1 text-xs text-muted-foreground">Última sincronização: {new Date(syncStatus.lastSyncAt).toLocaleString("pt-BR")}</p>}
              {syncStatus?.baseRevision > 0 && <p className="mt-1 text-xs text-muted-foreground">Revisão local: {syncStatus.baseRevision} · Revisão no OneDrive: {syncStatus.cloudRevision ?? "—"}</p>}
              {syncStatus?.lastError && <p className="mt-2 text-xs text-red-500">{syncStatus.lastError}</p>}
            </div>

            {!syncStatus?.enabled && syncStatus?.detectedFolders?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium">Pasta do OneDrive encontrada:</p>
                <div className="space-y-2">
                  {syncStatus.detectedFolders.map(folder => (
                    <Button key={folder} type="button" variant="outline" className="w-full justify-start gap-2 overflow-hidden" onClick={() => handleUseDetectedFolder(folder)}>
                      <FolderOpen className="h-4 w-4 shrink-0" /><span className="truncate">{folder}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!syncStatus?.enabled ? (
                <Button type="button" className="gap-2" onClick={handleChooseSyncFolder}><FolderOpen className="h-4 w-4" /> Selecionar pasta do OneDrive</Button>
              ) : (
                <>
                  <Button type="button" className="gap-2" disabled={syncing} onClick={() => handleSyncNow(false)}>
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {syncing ? "Sincronizando..." : "Sincronizar agora"}
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={handleChooseSyncFolder}><FolderOpen className="h-4 w-4" /> Trocar pasta</Button>
                  <Button type="button" variant="ghost" className="gap-2 text-red-500" onClick={handleDisableSync}><CloudOff className="h-4 w-4" /> Desativar</Button>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground">O aplicativo sincroniza ao abrir, a cada 5 minutos e ao fechar. Antes de trocar de computador, clique em “Sincronizar agora” e espere o OneDrive concluir o envio.</p>
          </div>
        </div>
      </div>
    </div>
  );
}