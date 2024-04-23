import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import VNav from '../lib/v-nav'

const app = createApp(App)

app.use(VNav)
app.mount('#app')
