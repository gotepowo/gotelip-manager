/**
 * Lê e faz o parse de um arquivo CSV, retornando um array de objetos.
 * @param {File} file - Arquivo CSV enviado pelo input
 * @param {Array<{label: string, key: string, parse?: (val: string) => any, required?: boolean}>} columns - Mapeamento de colunas
 * @returns {Promise<Array<Object>>} - Array de registros prontos para inserção
 */
export function parseCSV(file, columns) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = e.target.result;
        // Remove BOM
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

        const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
        if (lines.length < 2) {
          reject(new Error("Arquivo vazio ou sem dados"));
          return;
        }

        const parseLine = (line) => {
          const result = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ";" && !inQuotes) {
              result.push(current);
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current);
          return result;
        };

        const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase());

        // Build header→column mapping
        const colMap = columns.map(col => {
          const idx = headers.findIndex(h => h === col.label.toLowerCase());
          return { col, idx };
        });

        // Validate required columns exist
        const missing = columns.filter(c => c.required && !headers.includes(c.label.toLowerCase()));
        if (missing.length > 0) {
          reject(new Error(`Colunas obrigatórias não encontradas: ${missing.map(c => c.label).join(", ")}`));
          return;
        }

        const records = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseLine(lines[i]);
          const obj = {};
          for (const { col, idx } of colMap) {
            if (idx === -1) continue;
            const raw = (values[idx] || "").trim();
            if (raw === "") continue;
            obj[col.key] = col.parse ? col.parse(raw) : raw;
          }
          records.push(obj);
        }

        resolve(records);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsText(file, "UTF-8");
  });
}