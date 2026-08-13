import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import path from 'node:path'

const running = new Map<string, ChildProcessWithoutNullStreams>()

export function startLocalMinecraft(id: string, folder: string, edition: 'java' | 'bedrock', ramGb: number, log: (line: string) => void) {
  if (running.has(id)) return
  const child = edition === 'bedrock'
    ? spawn(path.join(folder, 'bedrock_server.exe'), [], { cwd: folder, windowsHide: true })
    : spawn('java', [`-Xms${Math.max(1, ramGb - 1)}G`, `-Xmx${ramGb}G`, '-jar', 'server.jar', 'nogui'], { cwd: folder, windowsHide: true })
  running.set(id, child)
  child.stdout.on('data', data => log(String(data).trimEnd()))
  child.stderr.on('data', data => log(String(data).trimEnd()))
  child.on('exit', () => running.delete(id))
}

export function sendMinecraftCommand(id: string, command: string) { running.get(id)?.stdin.write(command.trim() + '\n') }
export function stopLocalMinecraft(id: string) { running.get(id)?.stdin.write('stop\n') }
export function isMinecraftRunning(id: string) { return running.has(id) }
