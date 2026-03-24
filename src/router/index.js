import { createRouter, createWebHistory } from 'vue-router'
import WelcomeView  from '@/views/WelcomeView.vue'
import LoginView    from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import App          from '@/App.vue'

const routes = [
  { path: '/',         component: WelcomeView },
  { path: '/login',    component: LoginView },
  { path: '/register', component: RegisterView },
  { path: '/mapas',    component: App, meta: { requiresAuth: true } }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('maphub_token')
  if (to.meta.requiresAuth && !token) next('/login')
  else next()
})

export default router