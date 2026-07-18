import {
  app,
  BrowserWindow,
  protocol,
  net,
} from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerIPC } from "./ipc.js";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-file",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function registerLocalFileProtocol() {
  protocol.handle("local-file", (request) => {
    const encodedPath = request.url.replace(
      "local-file:///",
      "",
    );

    const decodedPath = decodeURIComponent(encodedPath);

    const applicationFolder = !app.isPackaged
  ? process.cwd()
  : process.env.PORTABLE_EXECUTABLE_DIR ||
    path.dirname(process.execPath);

    const absolutePath = path.join(
      applicationFolder,
      decodedPath,
    );

    return net.fetch(
      `file://${absolutePath.replaceAll("\\", "/")}`,
    );
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
  mainWindow.loadFile(
    path.join(__dirname, "..", "dist", "index.html"),
  );
  } else {
      if (app.isPackaged) {
    mainWindow.loadFile(
      path.join(__dirname, "..", "dist", "index.html"),
    );
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }
  }

  // Remove the // while debugging:
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  registerLocalFileProtocol();
  registerIPC();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});