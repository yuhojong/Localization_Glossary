const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("glossaryApi", {
  getStatus: () => ipcRenderer.invoke("glossary:get-status"),
  search: (query, options) => ipcRenderer.invoke("glossary:search", query, options),
  reindex: () => ipcRenderer.invoke("glossary:reindex"),
  selectDirectory: () => ipcRenderer.invoke("glossary:select-directory")
});
