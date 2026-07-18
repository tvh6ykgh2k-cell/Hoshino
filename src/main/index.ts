import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { initSqlJsRuntime, closeDatabase } from './database';
import { net } from 'electron';

let mainWindow: BrowserWindow | null = null;

async function probeDevServer(): Promise<string> {
  for (const port of [5173, 5174, 5175, 5176, 5177, 5178]) {
    const url = `http://localhost:${port}`;
    try {
      const req = net.request({ url, method: 'HEAD' });
      await new Promise<void>((resolve, reject) => {
        req.on('response', () => { req.abort(); resolve(); });
        req.on('error', () => reject(new Error('no server')));
        req.end();
      });
      return url;
    } catch { /* port not available, try next */ }
  }
  return 'http://localhost:5173'; // fallback
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Hoshino',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    // Vite may pick 5174+ if 5173 is occupied — probe the running port
    const devUrl = process.env.VITE_DEV_SERVER_URL ?? await probeDevServer();
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await initSqlJsRuntime();
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
