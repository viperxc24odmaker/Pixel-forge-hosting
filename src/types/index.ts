export type Edition = 'java' | 'bedrock'
export type Software = 'vanilla' | 'paper' | 'fabric' | 'forge' | 'neoforge'
export type ServerStatus = 'offline' | 'running' | 'starting' | 'error'

export interface Server {
  id: string
  name: string
  edition: Edition
  version: string
  software: Software
  ramGb: number
  storageGb: number
  port: number
  createdAt: string
  status: ServerStatus
  players: number
  maxPlayers: number
  path: string
  eulaAccepted?: boolean
}

export interface SystemInfo {
  totalMemoryGB: number
  freeMemoryGB: number
  freeStorageGB: number
  cpuModel: string
  cpuCores: number
}

export interface FileEntry { name: string; path: string; directory: boolean; size: number }

declare global {
  interface Window {
    pixelForge: {
      system: { info(): Promise<SystemInfo> }
      relay: { status(): Promise<{ mode: string; connected: boolean; endpoint: string }> }
      servers: {
        list(): Promise<Server[]>
        create(input: Omit<Server, 'id' | 'createdAt' | 'status' | 'players' | 'maxPlayers' | 'path'>): Promise<Server>
        start(id: string): Promise<Server>
        stop(id: string): Promise<Server | undefined>
        restart(id: string): Promise<Server>
        delete(id: string): Promise<void>
        command(id: string, command: string): Promise<boolean>
        logs(id: string): Promise<string[]>
        watchLogs(id: string, callback: (payload: { id: string; line: string }) => void): void
        openFolder(id: string): Promise<string>
      }
      files: {
        list(id: string, path?: string): Promise<FileEntry[]>
        read(id: string, path: string): Promise<string>
        write(id: string, path: string, content: string): Promise<void>
        delete(id: string, path: string): Promise<void>
        mkdir(id: string, path: string): Promise<void>
        rename(id: string, from: string, to: string): Promise<void>
        chooseUpload(id: string): Promise<string[]>
      }
    }
  }
}

export {}
