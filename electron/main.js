const path = require("path");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { GlossaryStore } = require("./glossary");

const isDev = !app.isPackaged;
let mainWindow = null;
let store = null;

function firstExistingPath(candidates) {
  return candidates.find((candidate) => candidate && require("fs").existsSync(candidate)) || candidates[0];
}

function getDefaultDataDir() {
  if (isDev) {
    return path.join(process.cwd(), "data");
  }

  return firstExistingPath([
    path.join(process.resourcesPath, "data"),
    path.join(app.getAppPath(), "data"),
    path.join(path.dirname(process.execPath), "data")
  ]);
}

function getWindowIconPath() {
  if (isDev) {
    return path.join(__dirname, "..", "build", "icon.png");
  }

  return firstExistingPath([
    path.join(process.resourcesPath, "build", "icon.png"),
    path.join(app.getAppPath(), "build", "icon.png"),
    path.join(__dirname, "..", "build", "icon.png")
  ]);
}

async function createWindow() {
  store = new GlossaryStore(getDefaultDataDir());
  await store.reindex();

  mainWindow = new BrowserWindow({
    title: "Navi Localization Glossary",
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#f4efe6",
    icon: getWindowIconPath(),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });

  if (isDev) {
    await mainWindow.loadURL("http://127.0.0.1:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("glossary:get-status", async () => {
  return {
    ...store.getStatus(),
    appVersion: app.getVersion()
  };
});

ipcMain.handle("glossary:search", async (_event, query, options) => {
  return store.search(query, options);
});

ipcMain.handle("glossary:reindex", async () => {
  await store.reindex();
  return {
    ...store.getStatus(),
    appVersion: app.getVersion()
  };
});

ipcMain.handle("glossary:select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      ...store.getStatus(),
      appVersion: app.getVersion()
    };
  }

  store.setDataDir(result.filePaths[0]);
  await store.reindex();
  return {
    ...store.getStatus(),
    appVersion: app.getVersion()
  };
});
