<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Server, Software } from './types'

type Tab = 'dashboard' | 'create' | 'console' | 'files' | 'players' | 'mods' | 'settings'
const tab = ref<Tab>('dashboard')
const servers = ref<Server[]>([])
const selected = ref<Server | null>(null)
const name = ref('My Survival Server')
const edition = ref<'java' | 'bedrock'>('java')
const version = ref('1.21.8')
const software = ref<Software>('paper')
const ram = ref(4)
const storage = ref(25)
const eulaAccepted = ref(false)
const command = ref('')
const logs = ref<string[]>([])
const fileText = ref('')
const fileName = ref('server.properties')
const files = ref<any[]>([])
const notice = ref('')
const busy = ref(false)
const system = ref({ totalMemoryGB: 16, freeMemoryGB: 8, freeStorageGB: 100, cpuModel: 'Detecting…', cpuCores: 4 })
const relay = ref({ connected: false, endpoint: 'Local mode' })
const ramOptions = [4, 6, 8, 10, 12, 16, 20, 24, 28, 32]
const versions = ['1.21.8', '1.21.7', '1.21.6', '1.21.5', '1.20.6']
const softwares: Software[] = ['vanilla', 'paper', 'fabric', 'forge', 'neoforge']
const recommendedRam = computed(() => Math.max(4, Math.min(32, Math.floor(system.value.totalMemoryGB * 0.5))))
const joinAddress = computed(() => selected.value ? `127.0.0.1:${selected.value.port}` : '')

function hasBackendBridge() {
  const api = window.pixelForge
  return !!(api?.system?.info && api?.relay?.status && api?.servers?.list)
}

async function refresh() {
  if (!hasBackendBridge()) {
    servers.value = []
    notice.value = 'Pixel Forge backend bridge is unavailable. Please launch the Windows Electron app instead of the web preview.'
    return
  }

  try {
    const api = window.pixelForge
    const [systemInfo, relayStatus, serverList] = await Promise.all([
      api.system.info(),
      api.relay.status(),
      api.servers.list(),
    ])

    system.value = systemInfo
    relay.value = relayStatus
    servers.value = Array.isArray(serverList) ? serverList : []

    if (selected.value) {
      selected.value = servers.value.find(s => s.id === selected.value?.id) ?? null
    }
  } catch (error) {
    console.error('[Pixel Forge] Failed to refresh host state:', error)
    servers.value = []
    notice.value = error instanceof Error
      ? `Pixel Forge backend error: ${error.message}`
      : 'Pixel Forge backend failed to initialize.'
  }
}

async function openServer(server: Server) {
  if (!hasBackendBridge()) return
  selected.value = server
  tab.value = 'console'
  logs.value = await window.pixelForge.servers.logs(server.id)
  window.pixelForge.servers.watchLogs(server.id, payload => {
    if (payload.id === server.id) logs.value.push(payload.line)
  })
}

async function createServer() {
  if (!eulaAccepted.value) { notice.value = 'Accept the Minecraft EULA before creating a Java server.'; return }
  if (!hasBackendBridge()) { await refresh(); return }
  busy.value = true
  notice.value = `Installing ${software.value} ${version.value}… this can take a while the first time.`
  try {
    const server = await window.pixelForge.servers.create({ name: name.value, edition: edition.value, version: version.value, software: software.value, ramGb: ram.value, storageGb: storage.value, port: edition.value === 'bedrock' ? 19132 + servers.value.length : 25565 + servers.value.length, eulaAccepted: eulaAccepted.value })
    const serverList = await window.pixelForge.servers.list()
    servers.value = Array.isArray(serverList) ? serverList : []
    await openServer(server)
    notice.value = 'Server installed and ready. It is stopped by default.'
  } catch (error) { notice.value = error instanceof Error ? error.message : String(error) }
  finally { busy.value = false }
}

async function start() {
  if (!selected.value || !hasBackendBridge()) return
  busy.value = true
  notice.value = 'Starting Minecraft…'
  try { selected.value = await window.pixelForge.servers.start(selected.value.id); logs.value = await window.pixelForge.servers.logs(selected.value.id); notice.value = `Server running. Join with ${joinAddress.value}`; await refresh() }
  catch (error) { notice.value = error instanceof Error ? error.message : String(error); await refresh() }
  finally { busy.value = false }
}

async function stop() { if (!selected.value || !hasBackendBridge()) return; await window.pixelForge.servers.stop(selected.value.id); await refresh() }
async function restart() { if (!selected.value || !hasBackendBridge()) return; busy.value = true; try { selected.value = await window.pixelForge.servers.restart(selected.value.id); await refresh() } catch (error) { notice.value = error instanceof Error ? error.message : String(error) } finally { busy.value = false } }
async function sendCommand() { if (!selected.value || !command.value.trim() || !hasBackendBridge()) return; await window.pixelForge.servers.command(selected.value.id, command.value); command.value = '' }
async function deleteServer() { if (!selected.value || !hasBackendBridge() || !confirm(`Delete ${selected.value.name}? This permanently removes the local server data.`)) return; await window.pixelForge.servers.delete(selected.value.id); selected.value = null; tab.value = 'dashboard'; await refresh() }
async function loadFiles() { if (!selected.value || !hasBackendBridge()) return; files.value = await window.pixelForge.files.list(selected.value.id); }
async function readFile(path: string) { if (!selected.value || !hasBackendBridge()) return; fileName.value = path; fileText.value = await window.pixelForge.files.read(selected.value.id, path) }
async function saveFile() { if (!selected.value || !hasBackendBridge()) return; await window.pixelForge.files.write(selected.value.id, fileName.value, fileText.value); notice.value = `${fileName.value} saved.` }
async function upload() { if (!selected.value || !hasBackendBridge()) return; const uploaded = await window.pixelForge.files.chooseUpload(selected.value.id); notice.value = uploaded.length ? `Uploaded ${uploaded.join(', ')}` : 'Upload cancelled.'; await loadFiles() }

onMounted(refresh)
</script>

<template>
<div class="app-shell">
  <aside class="sidebar">
    <div class="brand"><span class="brand-mark">⚒</span><div><strong>PIXEL FORGE</strong><small>HOSTING</small></div></div>
    <button class="nav-item" :class="{active: tab === 'dashboard'}" @click="tab = 'dashboard'">⌂ <span>Dashboard</span></button>
    <button class="nav-item" :class="{active: tab === 'create'}" @click="tab = 'create'">＋ <span>Create Server</span></button>
    <div v-if="selected" class="nav-group"><p>SERVER</p>
      <button class="nav-item" :class="{active: tab === 'console'}" @click="tab = 'console'">▣ <span>Console</span></button>
      <button class="nav-item" :class="{active: tab === 'files'}" @click="tab = 'files'; loadFiles()">▤ <span>Files</span></button>
      <button class="nav-item" :class="{active: tab === 'players'}" @click="tab = 'players'">♙ <span>Players</span></button>
      <button class="nav-item" :class="{active: tab === 'mods'}" @click="tab = 'mods'">◆ <span>Plugins & Mods</span></button>
      <button class="nav-item" :class="{active: tab === 'settings'}" @click="tab = 'settings'">⚙ <span>Settings</span></button>
    </div>
    <div class="sidebar-foot">Local-first hosting<br><span>Windows Edition</span></div>
  </aside>

  <main class="main">
    <header class="topbar"><div><p class="eyebrow">{{ selected && tab !== 'dashboard' ? selected.name : 'PIXEL FORGE HOSTING' }}</p><h1>{{ tab === 'dashboard' ? 'Dashboard' : tab === 'create' ? 'Create Server' : selected?.name }}</h1></div><div class="relay-pill"><i :class="{on: relay.connected}"></i>{{ relay.connected ? 'Relay connected' : 'Local mode' }}</div></header>
    <div v-if="notice" class="notice" @click="notice = ''">{{ notice }}</div>

    <section v-if="tab === 'dashboard'" class="page">
      <div class="hero"><div><p class="eyebrow">LOCAL-FIRST MINECRAFT HOSTING</p><h2>Forge your server.<br><em>Skip the networking pain.</em></h2><p>Pixel Forge installs and runs Minecraft directly on your Windows PC.</p></div><button class="button primary big" @click="tab = 'create'">⚒ Create a server</button></div>
      <div class="stats"><div><span>Servers</span><strong>{{ servers.length }}</strong></div><div><span>Host RAM</span><strong>{{ system.totalMemoryGB }} GB</strong></div><div><span>Free RAM</span><strong>{{ system.freeMemoryGB }} GB</strong></div><div><span>Recommended</span><strong>{{ recommendedRam }} GB</strong></div></div>
      <div class="section-title"><h3>Your servers</h3><span>{{ servers.length }} total</span></div>
      <div v-if="!servers.length" class="empty"><div class="forge-icon">⚒</div><h3>No servers yet</h3><p>Your first server will appear here.</p><button class="button primary" @click="tab = 'create'">Create server</button></div>
      <div v-else class="server-grid"><article v-for="server in servers" :key="server.id" class="server-card" @click="openServer(server)"><div class="server-top"><span class="status" :class="server.status">● {{ server.status }}</span><span>{{ server.edition }} · {{ server.version }}</span></div><h3>{{ server.name }}</h3><p>{{ server.software }} · {{ server.ramGb }} GB RAM</p><div class="address">127.0.0.1:{{ server.port }}</div></article></div>
    </section>

    <section v-else-if="tab === 'create'" class="page narrow"><div class="panel"><div class="panel-title"><div><p class="eyebrow">NEW INSTANCE</p><h2>Create your Minecraft server</h2></div></div><div class="form-grid">
      <label>Server name<input v-model="name"></label><label>Edition<select v-model="edition"><option value="java">Java</option><option value="bedrock">Bedrock</option></select></label>
      <label>Version<select v-model="version"><option v-for="v in versions" :key="v">{{ v }}</option></select></label><label>Server software<select v-model="software"><option v-for="s in softwares" :key="s" :value="s">{{ s }}</option></select></label>
      <label>RAM <span class="hint">Recommended {{ recommendedRam }} GB</span><select v-model.number="ram"><option v-for="r in ramOptions" :key="r" :value="r">{{ r }} GB</option></select></label>
      <label>Storage<select v-model.number="storage"><option v-for="s in [5,10,25,50,100]" :key="s" :value="s">{{ s }} GB</option></select></label>
    </div><div class="resource-note">🧠 {{ system.cpuModel }} · {{ system.totalMemoryGB }} GB RAM · {{ system.freeStorageGB }} GB free storage</div>
    <label class="eula"><input type="checkbox" v-model="eulaAccepted"> I agree to the Minecraft EULA and want Pixel Forge to install the server software for me.</label>
    <button class="button primary big full" :disabled="busy" @click="createServer">{{ busy ? 'Installing…' : 'Create & Install Server' }}</button></div></section>

    <section v-else-if="selected" class="page">
      <div class="server-banner"><div><span class="status" :class="selected.status">● {{ selected.status }}</span><h2>{{ selected.name }}</h2><p>{{ selected.edition }} · {{ selected.software }} {{ selected.version }}</p></div><div class="actions"><button v-if="selected.status !== 'running'" class="button primary" :disabled="busy" @click="start">▶ Start</button><button v-else class="button danger" @click="stop">■ Stop</button><button class="button" :disabled="busy" @click="restart">↻ Restart</button></div></div>
      <div class="join-card"><div><span>{{ selected.status === 'running' ? 'Join locally' : 'Local join address' }}</span><strong>{{ joinAddress }}</strong></div><button class="button" @click="navigator.clipboard?.writeText(joinAddress)">Copy address</button></div>
      <div v-if="tab === 'console'" class="panel console"><div class="console-head"><strong>Live console</strong><span>{{ logs.length }} lines</span></div><div class="console-body"><div v-for="(line, i) in logs" :key="i">{{ line }}</div></div><form class="command" @submit.prevent="sendCommand"><span>&gt;</span><input v-model="command" placeholder="Send a server command…" :disabled="selected.status !== 'running'"></form></div>
      <div v-else-if="tab === 'files'" class="panel"><div class="panel-title"><h3>Server files</h3><button class="button" @click="upload">Upload files</button></div><div class="file-row" v-for="file in files" :key="file.path" @click="!file.directory && readFile(file.path)"><span>{{ file.directory ? '📁' : '📄' }} {{ file.path }}</span><span class="muted">{{ file.directory ? '' : `${file.size} bytes` }}</span></div><textarea v-if="fileText" v-model="fileText" class="editor" spellcheck="false"></textarea><div v-if="fileText" class="editor-actions"><button class="button primary" @click="saveFile">Save {{ fileName }}</button></div></div>
      <div v-else-if="tab === 'players'" class="panel"><div class="panel-title"><h3>Players</h3><span>0 online</span></div><div class="empty compact"><div class="forge-icon">♙</div><h3>Player discovery coming next</h3><p>The server process is real; player parsing will be added without faking data.</p></div></div>
      <div v-else-if="tab === 'mods'" class="panel"><div class="panel-title"><div><h3>Plugins & Mods</h3><p class="muted">Use the real server folder for now.</p></div><button class="button" @click="upload">Upload .jar</button></div><div class="empty compact"><div class="forge-icon">◆</div><h3>Manual installs are live</h3><p>Upload plugin/mod JAR files directly into the server directory. Marketplace integration is next.</p></div></div>
      <div v-else class="panel"><div class="panel-title"><h3>Server settings</h3></div><div class="settings-grid"><label>Port<input type="number" :value="selected.port" disabled></label><label>RAM<input type="number" :value="selected.ramGb" disabled></label><label>Version<input :value="selected.version" disabled></label><label>Software<input :value="selected.software" disabled></label></div></div>
      <div class="danger-zone"><div><strong>Delete server</strong><p>This permanently removes its local data.</p></div><button class="button danger" @click="deleteServer">Delete</button></div>
    </section>
  </main>
</div>
</template>
