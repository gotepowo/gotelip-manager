const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  database: {
    load: () =>
      ipcRenderer.invoke("db:load"),

    list: (entityName, sortExpression, limit) =>
      ipcRenderer.invoke(
        "db:list",
        entityName,
        sortExpression,
        limit,
      ),

    get: (entityName, id) =>
      ipcRenderer.invoke(
        "db:get",
        entityName,
        id,
      ),

    create: (entityName, data) =>
      ipcRenderer.invoke(
        "db:create",
        entityName,
        data,
      ),

    update: (entityName, id, changes) =>
      ipcRenderer.invoke(
        "db:update",
        entityName,
        id,
        changes,
      ),

    delete: (entityName, id) =>
      ipcRenderer.invoke(
        "db:delete",
        entityName,
        id,
      ),

    bulkCreate: (entityName, records) =>
      ipcRenderer.invoke(
        "db:bulk-create",
        entityName,
        records,
      ),

    filter: (entityName, filters) =>
      ipcRenderer.invoke(
        "db:filter",
        entityName,
        filters,
      ),
  },

  files: {
    upload: (fileData) =>
      ipcRenderer.invoke(
        "file:upload",
        fileData,
      ),
  },
});