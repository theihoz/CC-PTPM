import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useCartStore } from './stores/cart'
import { useAuthStore } from './stores/auth'
import {
  createLocalStorageCartRepository,
  createSupabaseCartRepository,
} from './services/cartRepositories'
import { setupCartSync } from './services/cartSync'
import { supabase } from './lib/supabase'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Giỏ hàng: khách vãng lai lưu trong LocalStorage, người đã đăng nhập lưu trên Supabase.
// Hàm này cũng khôi phục phiên đăng nhập đã lưu.
setupCartSync({
  auth: useAuthStore(),
  cart: useCartStore(),
  guestRepo: createLocalStorageCartRepository(),
  accountRepoFor: () => createSupabaseCartRepository(supabase),
})

app.mount('#app')
