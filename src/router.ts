import { createRouter, createWebHashHistory } from 'vue-router';
import DashboardView from './views/DashboardView.vue';
import CreateServerView from './views/CreateServerView.vue';
import ServerView from './views/ServerView.vue';
export const router = createRouter({ history: createWebHashHistory(), routes: [{ path: '/', component: DashboardView }, { path: '/create', component: CreateServerView }, { path: '/server/:id', component: ServerView }] });
