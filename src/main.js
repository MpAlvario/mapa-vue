import { createApp } from 'vue' //importa librerias
//import './style.css'
//import App from './App.vue'
import RouterRoot from './RouterRoot.vue';
import router from './router'
import 'leaflet/dist/leaflet.css';




createApp(RouterRoot).use(router).mount('#app')


//createApp(App).mount('#app')



