import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import os from 'node:os'

const createWindow = () => {
  const win = new BrowserWindow({ width: 1440, height: 900, minWidth: 1100, minHeight: 700, backgroundColor: '#0d0d10', title: 'Pixel Forge Hosting', webPreferences: { preload: path.join(app.getAppPath(), 'dist-electron', 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
  if (process.env.VITE_DEV_SERVER_URL) void win.loadURL(process.env.VITE_DEV_SERVER_URL)
  else void win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
}

ipcMain.handle('system:info', () => { const total = os.totalmem() / 1024 ** 3; const free = os.freemem() / 1024 ** 3; return { platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model ?? 'Unknown', cores: os.cpus().length, totalRamGb: +total.toFixed(1), freeRamGb: +free.toFixed(1), recommendedRamGb: Math.max(4, Math.min(32, Math.floor(total * 0.5))) } })
ipcMain.handle('relay:status', () => ({ mode: 'hybrid', connected: false, endpoint: 'Relay not configured' }))

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
