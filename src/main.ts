import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import DashboardView from './views/DashboardView.vue'
import ServerView from './views/ServerView.vue'
import CreateServerView from './views/CreateServerView.vue'
import './styles.css'

const router = createRouter({ history: createWebHashHistory(), routes: [
  { path: '/', component: DashboardView },
  { path: '/create', component: CreateServerView },
  { path: '/server/:id', component: ServerView },
] })

createApp(App).use(createPinia()).use(router).mount('#app')
