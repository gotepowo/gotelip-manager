import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { app } from "electron";

const EMPTY_DATABASE = {
  Client: [],
  ServiceOrder: [],
  Invoice: [],
  Transaction: [],
  Setting: [],
};

function getApplicationFolder() {
  // Development: project folder.
  if (!app.isPackaged) {
    return process.cwd();
  }

  // electron-builder portable EXE:
  // This points to the folder where the user placed the portable .exe.
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }

  // Fallback for non-portable packaged builds.
  return path.dirname(process.execPath);
}

function getDatabasePath() {
  return path.join(getApplicationFolder(), "data", "database.json");
}

function createEmptyDatabase() {
  return structuredClone(EMPTY_DATABASE);
}

function ensureDatabaseExists() {
  const databasePath = getDatabasePath();
  const dataFolder = path.dirname(databasePath);

  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
  }

  if (!fs.existsSync(databasePath)) {
    fs.writeFileSync(
      databasePath,
      JSON.stringify(createEmptyDatabase(), null, 2),
      "utf8",
    );
  }

  return databasePath;
}

export function loadDatabase() {
  const databasePath = ensureDatabaseExists();

  try {
    const raw = fs.readFileSync(databasePath, "utf8");
    const parsed = JSON.parse(raw);

    // Ensure newly added entities exist, even in an older database file.
    for (const entityName of Object.keys(EMPTY_DATABASE)) {
      if (!Array.isArray(parsed[entityName])) {
        parsed[entityName] = [];
      }
    }

    return parsed;
  } catch (error) {
    throw new Error(`Could not read database.json: ${error.message}`);
  }
}

function saveDatabase(database) {
  const databasePath = ensureDatabaseExists();
  const temporaryPath = `${databasePath}.tmp`;

  try {
    createBackup(databasePath);
    // Write to a temporary file first.
    fs.writeFileSync(
      temporaryPath,
      JSON.stringify(database, null, 2),
      "utf8",
    );

    // Replace the original only after the write succeeds.
    fs.renameSync(temporaryPath, databasePath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) {
      fs.rmSync(temporaryPath, { force: true });
    }

    throw new Error(`Could not save database.json: ${error.message}`);
  }
}


function collectLocalFileUrls(value, result = new Set()) {
  if (typeof value === "string") {
    if (value.startsWith("local-file:")) result.add(value);
    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectLocalFileUrls(item, result);
    return result;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectLocalFileUrls(item, result);
  }

  return result;
}

function localFileUrlToAbsolutePath(fileUrl) {
  if (typeof fileUrl !== "string" || !fileUrl.startsWith("local-file:")) return null;

  let relativePath = decodeURIComponent(fileUrl);
  relativePath = relativePath.replace(/^local-file:(?:\/\/\/|\/\/|\/|\\\\|\\)?/i, "");
  relativePath = relativePath.replace(/^[/\\]+/, "");
  relativePath = relativePath.replace(/^local-file:(?:\/\/\/|\/\/|\/|\\\\|\\)?/i, "");
  relativePath = relativePath.replace(/^[/\\]+/, "");

  const applicationFolder = path.resolve(getApplicationFolder());
  const uploadsFolder = path.resolve(applicationFolder, "uploads");
  const absolutePath = path.resolve(applicationFolder, relativePath.replace(/[\/\\]+/g, path.sep));

  if (absolutePath !== uploadsFolder && !absolutePath.startsWith(`${uploadsFolder}${path.sep}`)) {
    return null;
  }

  return absolutePath;
}

function getReferencedFileUrls(database) {
  return collectLocalFileUrls(database);
}

function removeEmptyUploadFolders(startPath) {
  const uploadsRoot = path.join(getApplicationFolder(), "uploads");
  let current = path.dirname(startPath);

  while (current.startsWith(uploadsRoot) && current !== uploadsRoot) {
    try {
      if (fs.readdirSync(current).length > 0) break;
      fs.rmdirSync(current);
      current = path.dirname(current);
    } catch {
      break;
    }
  }
}

function permanentlyDeleteUnreferencedFiles(candidateUrls, database) {
  const referenced = getReferencedFileUrls(database);

  for (const fileUrl of candidateUrls) {
    if (referenced.has(fileUrl)) continue;
    const absolutePath = localFileUrlToAbsolutePath(fileUrl);
    if (!absolutePath) continue;

    try {
      fs.rmSync(absolutePath, { force: true });
      removeEmptyUploadFolders(absolutePath);
    } catch (error) {
      console.warn(`Could not remove uploaded file ${absolutePath}:`, error);
    }
  }
}

function moveUnreferencedFilesToTrash(candidateUrls, database, deletionId) {
  const referenced = getReferencedFileUrls(database);
  const movedFiles = [];
  const trashFolder = path.join(getApplicationFolder(), "trash", "uploads", deletionId);

  for (const fileUrl of candidateUrls) {
    if (referenced.has(fileUrl)) continue;
    const sourcePath = localFileUrlToAbsolutePath(fileUrl);
    if (!sourcePath || !fs.existsSync(sourcePath)) continue;

    const targetPath = path.join(trashFolder, `${randomUUID()}-${path.basename(sourcePath)}`);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    try {
      fs.renameSync(sourcePath, targetPath);
      removeEmptyUploadFolders(sourcePath);
      movedFiles.push({
        fileUrl,
        sourceRelativePath: path.relative(getApplicationFolder(), sourcePath),
        trashRelativePath: path.relative(getApplicationFolder(), targetPath),
      });
    } catch (error) {
      console.warn(`Could not move uploaded file to trash ${sourcePath}:`, error);
    }
  }

  return movedFiles;
}

function restoreTrashedFiles(movedFiles = []) {
  for (const item of movedFiles) {
    const sourcePath = item?.sourceRelativePath
      ? path.join(getApplicationFolder(), item.sourceRelativePath)
      : item?.sourcePath;
    const targetPath = item?.trashRelativePath
      ? path.join(getApplicationFolder(), item.trashRelativePath)
      : item?.targetPath;

    if (!sourcePath || !targetPath || !fs.existsSync(targetPath)) continue;
    try {
      fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
      fs.renameSync(targetPath, sourcePath);
    } catch (error) {
      console.warn(`Could not restore uploaded file ${targetPath}:`, error);
    }
  }
}


function getTrashRoot() {
  return path.join(getApplicationFolder(), "trash");
}

function getTrashEntriesFolder() {
  return path.join(getTrashRoot(), "entries");
}

function getTrashEntryPath(deletionId) {
  return path.join(getTrashEntriesFolder(), `${deletionId}.json`);
}

function writeTrashEntry(entry) {
  fs.mkdirSync(getTrashEntriesFolder(), { recursive: true });
  fs.writeFileSync(getTrashEntryPath(entry.id), JSON.stringify(entry, null, 2), "utf8");
}

function removeTrashEntryFiles(entry) {
  for (const item of entry?.deletedUploads ?? []) {
    const targetPath = item?.trashRelativePath
      ? path.join(getApplicationFolder(), item.trashRelativePath)
      : item?.targetPath;
    if (!targetPath) continue;
    try {
      fs.rmSync(targetPath, { force: true });
    } catch (error) {
      console.warn(`Could not permanently remove trashed file ${targetPath}:`, error);
    }
  }

  const uploadFolder = path.join(getTrashRoot(), "uploads", entry.id);
  try {
    fs.rmSync(uploadFolder, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Could not remove trash upload folder ${uploadFolder}:`, error);
  }

  try {
    fs.rmSync(getTrashEntryPath(entry.id), { force: true });
  } catch (error) {
    console.warn(`Could not remove trash entry ${entry.id}:`, error);
  }
}

function getTrashDisplayName(entityName, record) {
  if (entityName === "Client") return record.name || record.full_name || "Cliente sem nome";
  if (entityName === "ServiceOrder") return record.os_number || record.device || "Ordem de serviço";
  if (entityName === "Invoice") return record.number || record.invoice_number || record.description || "Nota fiscal";
  if (entityName === "Transaction") return record.description || "Transação";
  if (entityName === "Setting") return record.store_name || "Configurações";
  return record.name || record.title || record.id;
}

export function listTrashEntries() {
  const entriesFolder = getTrashEntriesFolder();
  if (!fs.existsSync(entriesFolder)) return [];

  const entries = [];
  for (const fileName of fs.readdirSync(entriesFolder)) {
    if (!fileName.endsWith(".json")) continue;
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(entriesFolder, fileName), "utf8"));
      entries.push({
        id: entry.id,
        entityName: entry.entityName,
        deletedAt: entry.deletedAt,
        displayName: entry.displayName,
        recordId: entry.record?.id,
        fileCount: Array.isArray(entry.deletedUploads) ? entry.deletedUploads.length : 0,
      });
    } catch (error) {
      console.warn(`Could not read trash entry ${fileName}:`, error);
    }
  }

  return entries.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
}

export function restoreTrashEntry(deletionId) {
  const entryPath = getTrashEntryPath(deletionId);
  if (!fs.existsSync(entryPath)) throw new Error("Item da lixeira não encontrado.");

  const entry = JSON.parse(fs.readFileSync(entryPath, "utf8"));
  const database = loadDatabase();
  const records = requireEntity(database, entry.entityName);

  restoreTrashedFiles(entry.deletedUploads);

  const restored = {
    ...entry.record,
    updated_date: new Date().toISOString(),
  };

  const existingIndex = records.findIndex((item) => item.id === restored.id);
  if (existingIndex >= 0) records[existingIndex] = restored;
  else records.push(restored);

  saveDatabase(database);
  fs.rmSync(entryPath, { force: true });

  const uploadFolder = path.join(getTrashRoot(), "uploads", deletionId);
  try {
    fs.rmSync(uploadFolder, { recursive: true, force: true });
  } catch {}

  return restored;
}

export function permanentlyDeleteTrashEntry(deletionId) {
  const entryPath = getTrashEntryPath(deletionId);
  if (!fs.existsSync(entryPath)) return false;
  const entry = JSON.parse(fs.readFileSync(entryPath, "utf8"));
  removeTrashEntryFiles(entry);
  return true;
}

export function emptyTrash() {
  const entries = listTrashEntries();
  for (const entry of entries) permanentlyDeleteTrashEntry(entry.id);

  // Also remove any orphaned legacy files/folders that have no manifest.
  try {
    fs.rmSync(getTrashRoot(), { recursive: true, force: true });
  } catch {}

  return { deletedCount: entries.length };
}

function requireEntity(database, entityName) {
  if (!Object.hasOwn(database, entityName)) {
    throw new Error(`Unknown entity: ${entityName}`);
  }

  if (!Array.isArray(database[entityName])) {
    throw new Error(`Entity "${entityName}" is not an array`);
  }

  return database[entityName];
}

function compareValues(left, right) {
  if (left === right) return 0;
  if (left === null || left === undefined) return -1;
  if (right === null || right === undefined) return 1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortRecords(records, sortExpression) {
  if (!sortExpression) {
    return records;
  }

  const descending = sortExpression.startsWith("-");
  const field = descending
    ? sortExpression.slice(1)
    : sortExpression;

  return records.sort((a, b) => {
    const result = compareValues(a[field], b[field]);
    return descending ? -result : result;
  });
}

export function listRecords(
  entityName,
  sortExpression = "-created_date",
  limit = 500,
) {
  const database = loadDatabase();
  const records = requireEntity(database, entityName);

  const copiedRecords = records.map((record) => ({ ...record }));
  const sortedRecords = sortRecords(copiedRecords, sortExpression);

  const numericLimit = Number(limit);

  if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
    return sortedRecords;
  }

  return sortedRecords.slice(0, numericLimit);
}

export function getRecord(entityName, id) {
  const database = loadDatabase();
  const records = requireEntity(database, entityName);

  return records.find((record) => record.id === id) ?? null;
}

export function createRecord(entityName, data) {
  const database = loadDatabase();
  const records = requireEntity(database, entityName);

  const now = new Date().toISOString();

  const newRecord = {
    ...data,
    id: randomUUID(),
    created_date: data.created_date ?? now,
    updated_date: now,
  };

  records.push(newRecord);
  saveDatabase(database);

  return newRecord;
}

export function updateRecord(entityName, id, changes) {
  const database = loadDatabase();
  const records = requireEntity(database, entityName);

  const index = records.findIndex((record) => record.id === id);

  if (index === -1) {
    throw new Error(`${entityName} record not found: ${id}`);
  }

  const updatedRecord = {
    ...records[index],
    ...changes,

    // Do not allow updates to silently change the ID.
    id: records[index].id,

    // Preserve the original creation date.
    created_date:
      records[index].created_date ??
      changes.created_date ??
      new Date().toISOString(),

    updated_date: new Date().toISOString(),
  };

  const previousFileUrls = collectLocalFileUrls(records[index]);

  records[index] = updatedRecord;
  saveDatabase(database);
  permanentlyDeleteUnreferencedFiles(previousFileUrls, database);

  return updatedRecord;
}

export function deleteRecord(entityName, id) {
  const database = loadDatabase();
  const records = requireEntity(database, entityName);

  const index = records.findIndex((record) => record.id === id);

  if (index === -1) {
    return false;
  }

  const [deletedRecord] = records.splice(index, 1);
  const deletedFileUrls = collectLocalFileUrls(deletedRecord);
  saveDatabase(database);

  const deletionId = `${entityName}-${id}-${Date.now()}`;
  const deletedUploads = moveUnreferencedFilesToTrash(deletedFileUrls, database, deletionId);
  const deletedAt = new Date().toISOString();

  writeTrashEntry({
    id: deletionId,
    entityName,
    deletedAt,
    displayName: getTrashDisplayName(entityName, deletedRecord),
    record: deletedRecord,
    deletedUploads,
  });

  return {
    ...deletedRecord,
    __trash_id: deletionId,
    __deleted_uploads: deletedUploads,
  };
}


export function restoreRecord(entityName, record) {
  if (!record?.id) throw new Error("Invalid record for restore");

  const {
    __deleted_uploads: deletedUploads = [],
    __trash_id: trashId,
    ...recordData
  } = record;
  restoreTrashedFiles(deletedUploads);

  const database = loadDatabase();
  const records = requireEntity(database, entityName);
  const existingIndex = records.findIndex((item) => item.id === recordData.id);
  const restored = { ...recordData, updated_date: new Date().toISOString() };
  if (existingIndex >= 0) records[existingIndex] = restored;
  else records.push(restored);
  saveDatabase(database);

  if (trashId) {
    try {
      fs.rmSync(getTrashEntryPath(trashId), { force: true });
      fs.rmSync(path.join(getTrashRoot(), "uploads", trashId), { recursive: true, force: true });
    } catch {}
  }

  return restored;
}

export function getNextServiceOrderNumber(prefix = "OS") {
  const database = loadDatabase();
  const orders = requireEntity(database, "ServiceOrder");
  const year = new Date().getFullYear();
  const safePrefix = String(prefix || "OS").trim().replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase() || "OS";
  const pattern = new RegExp(`^${safePrefix}-${year}-(\\d+)$`, "i");
  const highest = orders.reduce((max, order) => {
    const match = String(order.os_number || "").match(pattern);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0);
  return `${safePrefix}-${year}-${String(highest + 1).padStart(4, "0")}`;
}

export function getDatabasePathForBackup() {
  return ensureDatabaseExists();
}

export function validateAndRestoreBackup(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf8");
  const parsed = JSON.parse(raw);
  for (const entityName of Object.keys(EMPTY_DATABASE)) {
    if (!Array.isArray(parsed[entityName])) parsed[entityName] = [];
  }
  const databasePath = ensureDatabaseExists();
  createBackup(databasePath);
  fs.writeFileSync(databasePath, JSON.stringify(parsed, null, 2), "utf8");
  return parsed;
}
export function bulkCreateRecords(entityName, items) {
  if (!Array.isArray(items)) {
    throw new Error("bulkCreate requires an array");
  }

  const database = loadDatabase();
  const records = requireEntity(database, entityName);
  const now = new Date().toISOString();

  const createdRecords = items.map((item) => ({
    ...item,
    id: item.id ?? randomUUID(),
    created_date: item.created_date ?? now,
    updated_date: now,
  }));

  records.push(...createdRecords);
  saveDatabase(database);

  return createdRecords;
}

export function filterRecords(entityName, filters = {}) {
  const database = loadDatabase();
  const records = requireEntity(database, entityName);

  if (!filters || typeof filters !== "object") {
    return records.map((record) => ({ ...record }));
  }

  return records
    .filter((record) => {
      return Object.entries(filters).every(([field, expectedValue]) => {
        return record[field] === expectedValue;
      });
    })
    .map((record) => ({ ...record }));
}   

function getBackupFolder() {
  return path.join(getApplicationFolder(), "backups");
}

function createBackup(databasePath) {
  if (!fs.existsSync(databasePath)) {
    return;
  }

  const backupFolder = getBackupFolder();

  fs.mkdirSync(backupFolder, {
    recursive: true,
  });

  const timestamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");

  const backupPath = path.join(
    backupFolder,
    `database-${timestamp}.json`,
  );

  fs.copyFileSync(databasePath, backupPath);

  removeOldBackups(backupFolder);
}

function removeOldBackups(backupFolder) {
  const backupFiles = fs
    .readdirSync(backupFolder)
    .filter((name) => name.startsWith("database-"))
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({
      name,
      path: path.join(backupFolder, name),
      modified: fs.statSync(
        path.join(backupFolder, name),
      ).mtimeMs,
    }))
    .sort((a, b) => b.modified - a.modified);

  for (const oldBackup of backupFiles.slice(30)) {
    fs.rmSync(oldBackup.path, {
      force: true,
    });
  }
}

export function saveUploadedFile(fileData) {
  if (!fileData || typeof fileData !== "object") {
    throw new Error("Invalid file data");
  }

  const {
    name,
    bytes,
    category = "general",
  } = fileData;

  if (!name) {
    throw new Error("File name is required");
  }

  if (!Array.isArray(bytes)) {
    throw new Error("File bytes are required");
  }

  const safeCategory = String(category)
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  const uploadsFolder = path.join(
    getApplicationFolder(),
    "uploads",
    safeCategory,
  );

  fs.mkdirSync(uploadsFolder, {
    recursive: true,
  });

  const extension = path.extname(name);
  const originalBaseName = path.basename(name, extension);

  const safeBaseName = originalBaseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "file";

  const uniqueName = `${Date.now()}-${randomUUID()}-${safeBaseName}${extension}`;

  const destinationPath = path.join(
    uploadsFolder,
    uniqueName,
  );

  fs.writeFileSync(
    destinationPath,
    Buffer.from(bytes),
  );

  const relativePath = path.relative(
    getApplicationFolder(),
    destinationPath,
  );

  const normalizedRelativePath =
  relativePath.replaceAll("\\", "/");

  return {
    file_url: `local-file:///${encodeURI(
        normalizedRelativePath,
    )}`,
    relative_path: normalizedRelativePath,
    original_name: name,
    };
}