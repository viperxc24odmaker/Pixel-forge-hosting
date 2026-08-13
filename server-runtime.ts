import { spawn, type ChildProcessWithoutNullStreams, execFile as execFileCallback } from 'node:child_process'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)
const running = new Map<string, ChildProcessWithoutNullStreams>()
const UA = 'Pixel-Forge-Hosting/0.1.0 (https://github.com/viperxc24odmaker/Pixel-forge-hosting)'

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Download service returned HTTP ${response.status}.`)
  return response.json()
}

async function download(url: string, destination: string) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!response.ok || !response.body) throw new Error(`Unable to download runtime: HTTP ${response.status}.`)
  const file = await fs.open(destination, 'w')
  try {
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      await file.write(value)
    }
  } finally { await file.close() }
}

async function sha256(file: string) { return createHash('sha256').update(await fs.readFile(file)).digest('hex') }

async function installJava(version: string, folder: string, software: string) {
  const selected = software.toLowerCase()
  if (selected === 'paper') {
    const builds = await getJson(`https://fill.papermc.io/v3/projects/paper/versions/${encodeURIComponent(version)}/builds`)
    const build = Array.isArray(builds) ? builds.find((entry: any) => entry.channel === 'STABLE') : null
    const downloadInfo = build?.downloads?.['server:default']
    if (!downloadInfo?.url) throw new Error(`Paper has no stable build for Minecraft ${version}.`)
    const target = path.join(folder, 'server.jar')
    await download(downloadInfo.url, target)
    const expected = downloadInfo.checksums?.sha256
    if (expected && await sha256(target) !== expected) throw new Error('Paper download failed SHA-256 verification.')
    return
  }
  if (selected === 'fabric') {
    const loaders = await getJson(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(version)}`)
    const loader = loaders.find((entry: any) => entry.stable) ?? loaders[0]
    const installers = await getJson('https://meta.fabricmc.net/v2/versions/installer')
    const installer = installers.find((entry: any) => entry.stable) ?? installers[0]
    if (!loader || !installer) throw new Error(`Fabric has no stable server loader for Minecraft ${version}.`)
    await download(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(version)}/${encodeURIComponent(loader.version)}/${encodeURIComponent(installer.version)}/server/jar`, path.join(folder, 'server.jar'))
    return
  }
  if (selected === 'forge' || selected === 'neoforge') throw new Error(`${software} automatic installation is not enabled in this build yet.`)
  const manifest = await getJson('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
  const entry = manifest.versions.find((item: any) => item.id === version && item.type === 'release')
  if (!entry) throw new Error(`Minecraft Java ${version} was not found in Mojang's release manifest.`)
  const metadata = await getJson(entry.url)
  const server = metadata.downloads?.server
  if (!server?.url) throw new Error(`Mojang does not publish a server jar for ${version}.`)
  const target = path.join(folder, 'server.jar')
  await download(server.url, target)
  if (server.sha1) {
    const actual = createHash('sha1').update(await fs.readFile(target)).digest('hex')
    if (actual !== server.sha1) throw new Error('Minecraft server download failed SHA-1 verification.')
  }
}

async function installBedrock(version: string, folder: string) {
  const page = await fetch('https://www.minecraft.net/en-us/download/server/bedrock', { headers: { 'User-Agent': UA } })
  if (!page.ok) throw new Error('Unable to open the official Bedrock server download page.')
  const html = await page.text()
  const links = [...html.matchAll(/https?:\/\/[^\"']*bedrock-server-([0-9.]+)\.zip/g)].map(match => ({ url: match[0], version: match[1] }))
  const exact = links.find(link => link.version === version)
  const url = exact?.url ?? links[0]?.url
  if (!url) throw new Error('Could not locate the official Windows Bedrock server download.')
  if (!exact && version) throw new Error(`The official Bedrock page did not expose a download matching ${version}. Refresh the version list and try again.`)
  const zip = path.join(folder, 'bedrock-server.zip')
  await download(url, zip)
  await execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Expand-Archive -LiteralPath '${zip.replaceAll("'", "''")}' -DestinationPath '${folder.replaceAll("'", "''")}' -Force`], { windowsHide: true })
  await fs.rm(zip, { force: true })
}

export async function ensureRuntime(edition: 'java' | 'bedrock', version: string, software: string, folder: string, log: (line: string) => void) {
  const marker = path.join(folder, 'pixel-forge-runtime.json')
  if (await fs.stat(marker).catch(() => null)) return
  log(`[Pixel Forge] Downloading ${software} ${version}...`)
  await fs.mkdir(folder, { recursive: true })
  if (edition === 'bedrock') await installBedrock(version, folder)
  else await installJava(version, folder, software)
  await fs.writeFile(marker, JSON.stringify({ edition, version, software }, null, 2))
  log('[Pixel Forge] Runtime ready.')
}

export async function startLocalMinecraft(id: string, folder: string, edition: 'java' | 'bedrock', ramGb: number, log: (line: string) => void) {
  if (running.has(id)) return
  const metadata = JSON.parse(await fs.readFile(path.join(folder, 'pixel-forge-runtime.json'), 'utf8')) as { software: string }
  let child: ChildProcessWithoutNullStreams
  if (edition === 'bedrock') child = spawn(path.join(folder, 'bedrock_server.exe'), [], { cwd: folder, windowsHide: true })
  else if (metadata.software.toLowerCase() === 'forge' || metadata.software.toLowerCase() === 'neoforge') child = spawn('cmd.exe', ['/c', 'run.bat'], { cwd: folder, windowsHide: true })
  else child = spawn('java', [`-Xms${Math.max(1, ramGb - 1)}G`, `-Xmx${ramGb}G`, '-jar', 'server.jar', 'nogui'], { cwd: folder, windowsHide: true })
  running.set(id, child)
  child.stdout.on('data', data => log(String(data).trimEnd()))
  child.stderr.on('data', data => log(String(data).trimEnd()))
  child.on('error', error => { log(`[Pixel Forge] Process error: ${error.message}`); running.delete(id) })
  child.on('exit', () => running.delete(id))
}

export function sendMinecraftCommand(id: string, command: string) { running.get(id)?.stdin.write(command.trim() + '\n') }
export function stopLocalMinecraft(id: string) { running.get(id)?.stdin.write('stop\n') }
export function isMinecraftRunning(id: string) { return running.has(id) }
