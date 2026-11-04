import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useCartStore } from './stores/cart'
import { useAuthStore } from './stores/auth'
import { createLocalStorageCartRepository } from './services/cartRepositories'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Khôi phục phiên đăng nhập đã lưu (Supabase giữ trong LocalStorage).
useAuthStore().init()

// Khách vãng lai: giỏ hàng lưu trong LocalStorage của trình duyệt.
useCartStore().useRepository(createLocalStorageCartRepository())

app.mount('#app')
