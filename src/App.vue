<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type Tab = 'dashboard' | 'create' | 'console' | 'files' | 'players' | 'mods' | 'settings'
type Server = { id: string; name: string; edition: string; version: string; software: string; ram: number; storage: number; port: number; status: 'offline' | 'running'; players: number; logs: string[] }

const tab = ref<Tab>('dashboard')
const servers = ref<Server[]>([])
const selected = ref<Server | null>(null)
const name = ref('My Survival Server')
const edition = ref('Java')
const version = ref('1.21.8')
const software = ref('Paper')
const ram = ref(4)
const storage = ref(25)
const command = ref('')
const fileText = ref('')
const fileName = ref('server.properties')
const hostRam = ref(16)
const freeRam = ref(10)
const notice = ref('')

const ramOptions = [4, 6, 8, 10, 12, 16, 20, 24, 28, 32]
const versions = ['1.21.8', '1.21.7', '1.21.6', '1.21.5', '1.20.6']
const softwares = ['Vanilla', 'Paper', 'Fabric', 'Forge', 'NeoForge']
const activeTitle = computed(() => selected.value ? selected.value.name : tab.value === 'create' ? 'Create Server' : 'Dashboard')
const recommendedRam = computed(() => Math.max(4, Math.min(32, Math.floor(hostRam.value * 0.5))))

function persist() { localStorage.setItem('pfh-servers', JSON.stringify(servers.value)) }
function openServer(server: Server) { selected.value = server; tab.value = 'console' }
function createServer() {
  const server: Server = { id: crypto.randomUUID(), name: name.value, edition: edition.value, version: version.value, software: software.value, ram: ram.value, storage: storage.value, port: 24561 + servers.value.length, status: 'offline', players: 0, logs: ['[Pixel Forge] Server created and ready for runtime installation.'] }
  servers.value.push(server); persist(); selected.value = server; tab.value = 'console'; notice.value = 'Server created. Add the runtime to its folder before starting.'
}
function start() { if (!selected.value) return; selected.value.status = 'running'; selected.value.logs.push('[Pixel Forge] Start requested.'); persist() }
function stop() { if (!selected.value) return; selected.value.status = 'offline'; selected.value.players = 0; selected.value.logs.push('[Pixel Forge] Stop requested.'); persist() }
function restart() { stop(); start() }
function sendCommand() { if (!selected.value || !command.value.trim()) return; selected.value.logs.push(`> ${command.value.trim()}`); command.value = ''; persist() }
function deleteServer() { if (!selected.value || !confirm(`Delete ${selected.value.name}? This removes the server data.`)) return; servers.value = servers.value.filter(s => s.id !== selected.value?.id); selected.value = null; tab.value = 'dashboard'; persist() }
function fakeFileLoad(file: string) { fileName.value = file; fileText.value = file === 'server.properties' ? 'motd=Pixel Forge Server\nmax-players=20\nview-distance=10\nsimulation-distance=10\nserver-port=25565\n' : '# Pixel Forge configuration\n' }
function saveFile() { notice.value = `${fileName.value} saved.` }
function route(next: Tab) { tab.value = next }

onMounted(() => { try { servers.value = JSON.parse(localStorage.getItem('pfh-servers') || '[]') } catch { servers.value = [] } if (window.pixelForge) window.pixelForge.system.info().then(info => { hostRam.value = info.totalRamGb; freeRam.value = info.freeRamGb }).catch(() => undefined) })
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">⚒</span><div><strong>PIXEL FORGE</strong><small>HOSTING</small></div></div>
      <button class="nav-item" :class="{ active: tab === 'dashboard' }" @click="route('dashboard')">⌂ <span>Dashboard</span></button>
      <button class="nav-item" :class="{ active: tab === 'create' }" @click="route('create')">＋ <span>Create Server</span></button>
      <div v-if="selected" class="nav-group"><p>SERVER</p><button class="nav-item" :class="{ active: tab === 'console' }" @click="route('console')">▣ <span>Console</span></button><button class="nav-item" :class="{ active: tab === 'files' }" @click="route('files')">▤ <span>Files</span></button><button class="nav-item" :class="{ active: tab === 'players' }" @click="route('players')">♙ <span>Players</span></button><button class="nav-item" :class="{ active: tab === 'mods' }" @click="route('mods')">◆ <span>Plugins & Mods</span></button><button class="nav-item" :class="{ active: tab === 'settings' }" @click="route('settings')">⚙ <span>Settings</span></button></div>
      <div class="sidebar-foot">Local-first hosting<br><span>Windows Edition</span></div>
    </aside>

    <main class="main">
      <header class="topbar"><div><p class="eyebrow">{{ activeTitle }}</p><h1>{{ selected && tab !== 'dashboard' ? selected.name : activeTitle }}</h1></div><div class="relay-pill"><i></i> Hybrid relay ready</div></header>
      <div v-if="notice" class="notice" @click="notice = ''">{{ notice }}</div>

      <section v-if="tab === 'dashboard'" class="page">
        <div class="hero"><div><p class="eyebrow">LOCAL-FIRST MINECRAFT HOSTING</p><h2>Forge your server.<br><em>Skip the networking pain.</em></h2><p>Run Java or Bedrock directly on your Windows PC, with Pixel Forge managing the hard parts.</p></div><button class="button primary big" @click="route('create')">⚒ Create a server</button></div>
        <div class="stats"><div><span>Servers</span><strong>{{ servers.length }}</strong></div><div><span>Host RAM</span><strong>{{ hostRam.toFixed(1) }} GB</strong></div><div><span>Free RAM</span><strong>{{ freeRam.toFixed(1) }} GB</strong></div><div><span>Recommended</span><strong>{{ recommendedRam }} GB</strong></div></div>
        <div class="section-title"><h3>Your servers</h3><span>{{ servers.length }} total</span></div>
        <div v-if="!servers.length" class="empty"><div class="forge-icon">⚒</div><h3>No servers yet</h3><p>Your first server will appear here.</p><button class="button primary" @click="route('create')">Create server</button></div>
        <div v-else class="server-grid"><article v-for="server in servers" :key="server.id" class="server-card" @click="openServer(server)"><div class="server-top"><span class="status" :class="server.status">● {{ server.status }}</span><span>{{ server.edition }} · {{ server.version }}</span></div><h3>{{ server.name }}</h3><p>{{ server.software }} · {{ server.ram }} GB RAM · {{ server.storage }} GB</p><div class="address">play.pixelforge.host:{{ server.port }}</div></article></div>
      </section>

      <section v-else-if="tab === 'create'" class="page narrow"><div class="panel"><div class="panel-title"><div><p class="eyebrow">NEW INSTANCE</p><h2>Create your Minecraft server</h2></div></div><div class="form-grid"><label>Server name<input v-model="name" /></label><label>Edition<select v-model="edition"><option>Java</option><option>Bedrock</option></select></label><label>Version<select v-model="version"><option v-for="v in versions" :key="v">{{ v }}</option></select></label><label>Server software<select v-model="software"><option v-for="s in softwares" :key="s">{{ s }}</option></select></label><label>RAM <span class="hint">Recommended {{ recommendedRam }} GB</span><select v-model.number="ram"><option v-for="r in ramOptions" :key="r" :value="r">{{ r }} GB</option></select></label><label>Storage <span class="hint">Free {{ freeRam > 0 ? 'detected' : 'unknown' }}</span><select v-model.number="storage"><option :value="5">5 GB</option><option :value="10">10 GB</option><option :value="25">25 GB</option><option :value="50">50 GB</option><option :value="100">100 GB</option></select></label></div><div class="resource-note">🧠 Your PC: {{ hostRam.toFixed(1) }} GB RAM · Pixel Forge recommends {{ recommendedRam }} GB for this host.</div><button class="button primary big full" @click="createServer">Create server</button></div></section>

      <section v-else-if="selected" class="page">
        <div class="server-banner"><div><span class="status" :class="selected.status">● {{ selected.status }}</span><h2>{{ selected.name }}</h2><p>{{ selected.edition }} · {{ selected.software }} {{ selected.version }}</p></div><div class="actions"><button v-if="selected.status === 'offline'" class="button primary" @click="start">▶ Start</button><button v-else class="button danger" @click="stop">■ Stop</button><button class="button" @click="restart">↻ Restart</button></div></div>
        <div class="join-card"><div><span>Java + Bedrock address</span><strong>play.pixelforge.host:{{ selected.port }}</strong></div><button class="button" @click="navigator.clipboard?.writeText(`play.pixelforge.host:${selected.port}`)">Copy address</button></div>
        <div v-if="tab === 'console'" class="panel console"><div class="console-head"><strong>Live console</strong><span>{{ selected.logs.length }} lines</span></div><div class="console-body"><div v-for="(line, i) in selected.logs" :key="i">{{ line }}</div></div><form class="command" @submit.prevent="sendCommand"><span>&gt;</span><input v-model="command" placeholder="Send a server command..." :disabled="selected.status !== 'running'" /></form></div>
        <div v-else-if="tab === 'files'" class="panel"><div class="panel-title"><h3>Server files</h3><button class="button" @click="notice = 'File picker is available in the Electron build.'">Upload files</button></div><div class="file-row" v-for="file in ['server.properties','eula.txt','world/','plugins/','mods/']" :key="file" @click="fakeFileLoad(file)"><span>{{ file.endsWith('/') ? '📁' : '📄' }} {{ file }}</span><span class="muted">Open</span></div><textarea v-model="fileText" class="editor" spellcheck="false"></textarea><div class="editor-actions"><button class="button primary" @click="saveFile">Save {{ fileName }}</button></div></div>
        <div v-else-if="tab === 'players'" class="panel"><div class="panel-title"><h3>Players</h3><span>{{ selected.players }} online</span></div><div class="empty compact"><div class="forge-icon">♙</div><h3>No players online</h3><p>Player controls will appear here when the server reports connected players.</p></div></div>
        <div v-else-if="tab === 'mods'" class="panel"><div class="panel-title"><div><h3>Plugins & Mods</h3><p class="muted">Compatible installs for {{ selected.software }}.</p></div><button class="button">Upload .jar</button></div><div class="catalog"><article v-for="item in ['EssentialsX','LuckPerms','ViaVersion','WorldEdit']" :key="item"><strong>{{ item }}</strong><span>Compatible package</span><button class="button">Install</button></article></div></div>
        <div v-else-if="tab === 'settings'" class="panel"><div class="panel-title"><h3>Server settings</h3></div><div class="settings-grid"><label>MOTD<input value="Pixel Forge Server" /></label><label>Max players<input type="number" value="20" /></label><label>View distance<input type="number" value="10" /></label><label>Simulation distance<input type="number" value="10" /></label></div></div>
        <div class="danger-zone"><div><strong>Delete server</strong><p>This permanently removes its local data.</p></div><button class="button danger" @click="deleteServer">Delete</button></div>
      </section>
    </main>
  </div>
</template>
