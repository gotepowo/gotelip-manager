import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { parseCSV } from "@/utils/importCSV";
import { useToast } from "@/components/ui/use-toast";

/**
 * Botão reutilizável para importar dados de um arquivo CSV.
 * @param {Array} columns - Mapeamento de colunas para o parseCSV
 * @param {Function} onImport - Recebe os registros parseados e deve persisti-los (async)
 * @param {string} label - Texto do botão
 */
export default function ImportCSVButton({ columns, onImport, label = "Importar CSV" }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const records = await parseCSV(file, columns);
      if (records.length === 0) {
        toast({ title: "Nenhum registro válido encontrado no arquivo", variant: "destructive" });
        return;
      }
      await onImport(records);
      toast({ title: `${records.length} registro(s) importado(s)!` });
    } catch (err) {
      toast({ title: err.message || "Erro ao importar CSV", variant: "destructive" });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}