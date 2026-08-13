export interface SystemInfo { totalMemoryGB: number; freeMemoryGB: number; freeStorageGB: number; cpuModel: string; cpuCores: number }
export interface ServerRecord { id: string; name: string; edition: 'java' | 'bedrock'; version: string; software: string; ramGB: number; storageGB: number; port: number; status: 'offline' | 'starting' | 'running' | 'stopping' | 'error'; players: number; maxPlayers: number; path: string; createdAt: string }
export interface ConsoleLine { id: string; text: string; timestamp: string; level: 'info' | 'warn' | 'error' }
export interface FileEntry { name: string; path: string; directory: boolean; size: number }
export interface PixelForgeApi {
  system: { info: () => Promise<SystemInfo> }
  servers: { list: () => Promise<ServerRecord[]>; create: (input: Omit<ServerRecord,'id'|'status'|'players'|'path'|'createdAt'>) => Promise<ServerRecord>; remove: (id:string)=>Promise<void>; start:(id:string)=>Promise<void>; stop:(id:string)=>Promise<void>; restart:(id:string)=>Promise<void>; command:(id:string,command:string)=>Promise<void>; logs:(id:string)=>Promise<ConsoleLine[]> }
  files: { list:(serverId:string,relative?:string)=>Promise<FileEntry[]>; read:(serverId:string,relative:string)=>Promise<string>; write:(serverId:string,relative:string,content:string)=>Promise<void> }
}
