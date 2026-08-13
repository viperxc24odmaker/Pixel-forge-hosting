import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pixelForge', {
  system: { info: () => ipcRenderer.invoke('system:info') },
  relay: { status: () => ipcRenderer.invoke('relay:status') },
  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    create: (input: unknown) => ipcRenderer.invoke('servers:create', input),
    start: (id: string) => ipcRenderer.invoke('servers:start', id),
    stop: (id: string) => ipcRenderer.invoke('servers:stop', id),
    restart: (id: string) => ipcRenderer.invoke('servers:restart', id),
    delete: (id: string) => ipcRenderer.invoke('servers:delete', id),
    command: (id: string, command: string) => ipcRenderer.invoke('servers:command', id, command),
    logs: (id: string) => ipcRenderer.invoke('server:logs', id),
    watchLogs: (id: string, callback: (payload: { id: string; line: string }) => void) => ipcRenderer.on('server:log', (_event, payload) => { if (payload.id === id) callback(payload) }),
    openFolder: (id: string) => ipcRenderer.invoke('server:open-folder', id),
  },
  files: {
    list: (id: string, path?: string) => ipcRenderer.invoke('server:files', id, path),
    read: (id: string, path: string) => ipcRenderer.invoke('server:file:read', id, path),
    write: (id: string, path: string, content: string) => ipcRenderer.invoke('server:file:write', id, path, content),
    delete: (id: string, path: string) => ipcRenderer.invoke('server:file:delete', id, path),
    mkdir: (id: string, path: string) => ipcRenderer.invoke('server:file:mkdir', id, path),
    rename: (id: string, from: string, to: string) => ipcRenderer.invoke('server:file:rename', id, from, to),
    chooseUpload: (id: string) => ipcRenderer.invoke('server:file:choose-upload', id),
  },
})
