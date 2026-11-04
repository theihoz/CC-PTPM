import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useCartStore } from './stores/cart'
import { createLocalStorageCartRepository } from './services/cartRepositories'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Khách vãng lai: giỏ hàng lưu trong LocalStorage của trình duyệt.
useCartStore().useRepository(createLocalStorageCartRepository())

app.mount('#app')
