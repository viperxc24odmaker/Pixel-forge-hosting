<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">⚒</span><span>PIXEL FORGE</span></div>
      <nav>
        <RouterLink to="/">Dashboard</RouterLink>
        <RouterLink to="/create">Create Server</RouterLink>
      </nav>
      <div class="sidebar-foot">Local-first hosting<br><span>Windows Edition</span></div>
    </aside>
    <main class="main"><RouterView /></main>
  </div>
</template>
