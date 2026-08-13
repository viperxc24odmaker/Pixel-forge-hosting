import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { promises as fs, statfsSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { ensureRuntime, startLocalMinecraft, stopLocalMinecraft, sendMinecraftCommand, isMinecraftRunning } from './server-runtime.js'

type Server = { id: string; name: string; edition: 'java' | 'bedrock'; version: string; software: string; ramGb: number; storageGb: number; port: number; createdAt: string; eulaAccepted?: boolean }
const root = () => path.join(app.getPath('userData'), 'pixel-forge')
const serversDir = () => path.join(root(), 'servers')
const db = () => path.join(root(), 'servers.json')
const logs = new Map<string, string[]>()
let servers: Server[] = []
let mainWindow: BrowserWindow | null = null

async function load() { await fs.mkdir(serversDir(), { recursive: true }); if (!existsSync(db())) await fs.writeFile(db(), '[]'); servers = JSON.parse(await fs.readFile(db(), 'utf8')) }
async function save() { await fs.writeFile(db(), JSON.stringify(servers, null, 2)) }
function dir(id: string) { return path.join(serversDir(), id) }
function safe(id: string, file: string) { const base = path.resolve(dir(id)); const full = path.resolve(base, file); if (full !== base && !full.startsWith(base + path.sep)) throw new Error('Invalid path'); return full }
function pushLog(id: string, line: string) { const list = logs.get(id) ?? []; list.push(line); logs.set(id, list.slice(-500)); mainWindow?.webContents.send('server:log', { id, line }) }

async function configureServer(s: Server) {
  const folder = dir(s.id)
  if (s.edition === 'java') {
    const properties = `server-port=${s.port}\nserver-ip=\nmax-players=20\nmotd=${s.name.replaceAll('\n', ' ')}\nview-distance=10\nsimulation-distance=10\n` 
    await fs.writeFile(path.join(folder, 'server.properties'), properties)
    await fs.writeFile(path.join(folder, 'eula.txt'), `# Accepted through Pixel Forge Hosting\neula=${s.eulaAccepted === true ? 'true' : 'false'}\n`)
  } else {
    const properties = `server-name=${s.name.replaceAll('\n', ' ')}\ngamemode=survival\ndifficulty=easy\nallow-cheats=false\nmax-players=20\nserver-port=${s.port}\nserver-portv6=${s.port}\n` 
    await fs.writeFile(path.join(folder, 'server.properties'), properties)
  }
}

async function startOne(id: string) {
  const s = servers.find(x => x.id === id)
  if (!s) throw new Error('Server not found')
  if (s.edition === 'java' && !s.eulaAccepted) throw new Error('Accept the Minecraft EULA in the server settings before starting.')
  await ensureRuntime(s.edition, s.version, s.software, dir(id), line => pushLog(id, line))
  await configureServer(s)
  if (s.edition === 'java' && !existsSync(path.join(dir(id), 'server.jar')) && s.software !== 'Forge' && s.software !== 'NeoForge') throw new Error('The Java server runtime is missing server.jar.')
  if (s.edition === 'bedrock' && !existsSync(path.join(dir(id), 'bedrock_server.exe'))) throw new Error('The Bedrock runtime is missing bedrock_server.exe.')
  pushLog(id, '[Pixel Forge] Starting local server...')
  await startLocalMinecraft(id, dir(id), s.edition, s.ramGb, line => pushLog(id, line))
  return { ...s, status: 'running', players: 0, maxPlayers: 20, path: dir(id) }
}

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 1440, height: 900, minWidth: 1100, minHeight: 700, backgroundColor: '#0d0d10', title: 'Pixel Forge Hosting', webPreferences: { preload: path.join(app.getAppPath(), 'dist-electron', 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
  if (process.env.VITE_DEV_SERVER_URL) void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  else void mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
}

ipcMain.handle('system:info', () => { const total = os.totalmem() / 1024 ** 3; const free = os.freemem() / 1024 ** 3; let freeStorageGB = 0; try { const s = statfsSync(app.getPath('userData')); freeStorageGB = +(Number(s.bavail) * Number(s.bsize) / 1024 ** 3).toFixed(1) } catch {} return { totalMemoryGB: +total.toFixed(1), freeMemoryGB: +free.toFixed(1), freeStorageGB, cpuModel: os.cpus()[0]?.model ?? 'Unknown', cpuCores: os.cpus().length } })
ipcMain.handle('relay:status', () => ({ mode: 'hybrid', connected: false, endpoint: 'Local mode — relay service not configured' }))
ipcMain.handle('servers:list', () => servers.map(s => ({ ...s, status: isMinecraftRunning(s.id) ? 'running' : 'offline', players: 0, maxPlayers: 20, path: dir(s.id) })))
ipcMain.handle('servers:create', async (_e, input: Omit<Server, 'id' | 'createdAt'>) => {
  const id = randomUUID()
  const s: Server = { ...input, id, createdAt: new Date().toISOString() }
  await fs.mkdir(dir(id), { recursive: true })
  logs.set(id, ['[Pixel Forge] Server creation started.'])
  try {
    await ensureRuntime(s.edition, s.version, s.software, dir(id), line => pushLog(id, line))
    await configureServer(s)
    servers.push(s)
    await save()
    pushLog(id, '[Pixel Forge] Server created and ready to start.')
    return { ...s, status: 'offline', players: 0, maxPlayers: 20, path: dir(id) }
  } catch (error) {
    await fs.rm(dir(id), { recursive: true, force: true })
    throw error
  }
})
ipcMain.handle('servers:start', (_e, id) => startOne(id))
ipcMain.handle('servers:stop', async (_e, id) => { stopLocalMinecraft(id); const s = servers.find(x => x.id === id); if (s) pushLog(id, '[Pixel Forge] Server stopped.'); return s ? { ...s, status: 'offline', players: 0, maxPlayers: 20, path: dir(id) } : undefined })
ipcMain.handle('servers:restart', async (_e, id) => { stopLocalMinecraft(id); await new Promise(r => setTimeout(r, 500)); return startOne(id) })
ipcMain.handle('servers:command', (_e, id, command) => { sendMinecraftCommand(id, command); pushLog(id, `> ${command.trim()}`); return true })
ipcMain.handle('servers:delete', async (_e, id) => { stopLocalMinecraft(id); await fs.rm(dir(id), { recursive: true, force: true }); servers = servers.filter(s => s.id !== id); logs.delete(id); await save() })
ipcMain.handle('server:logs', (_e, id) => logs.get(id) ?? [])
ipcMain.handle('server:open-folder', (_e, id) => shell.openPath(dir(id)))
ipcMain.handle('server:eula', async (_e, id, accepted: boolean) => { const s = servers.find(x => x.id === id); if (!s) throw new Error('Server not found'); s.eulaAccepted = accepted; await configureServer(s); await save(); return s })
ipcMain.handle('server:files', async (_e, id, relative = '') => { const entries = await fs.readdir(safe(id, relative), { withFileTypes: true }); return Promise.all(entries.map(async e => { const p = safe(id, path.join(relative, e.name)); const st = await fs.stat(p); return { name: e.name, path: path.relative(dir(id), p).replaceAll('\\', '/'), directory: e.isDirectory(), size: st.size } })) })
ipcMain.handle('server:file:read', (_e, id, file) => fs.readFile(safe(id, file), 'utf8'))
ipcMain.handle('server:file:write', (_e, id, file, text) => fs.writeFile(safe(id, file), text, 'utf8'))
ipcMain.handle('server:file:delete', (_e, id, file) => fs.rm(safe(id, file), { recursive: true, force: true }))
ipcMain.handle('server:file:mkdir', (_e, id, file) => fs.mkdir(safe(id, file), { recursive: true }))
ipcMain.handle('server:file:rename', (_e, id, a, b) => fs.rename(safe(id, a), safe(id, b)))
ipcMain.handle('server:file:choose-upload', async (_e, id) => { const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }); if (result.canceled) return []; for (const file of result.filePaths) await fs.copyFile(file, path.join(dir(id), path.basename(file))); return result.filePaths.map(file => path.basename(file)) })

app.whenReady().then(async () => { await load(); createWindow() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
