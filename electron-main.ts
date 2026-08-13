import { app, BrowserWindow } from 'electron';
import path from 'node:path';
const createWindow = () => { const win = new BrowserWindow({ width: 1440, height: 900, backgroundColor: '#0d0d10', webPreferences: { contextIsolation: true, nodeIntegration: false } }); void win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html')); };
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
