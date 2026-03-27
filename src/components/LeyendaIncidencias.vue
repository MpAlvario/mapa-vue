<template>
  <!-- Botón -->
  <button class="btn-leyenda" @click="mostrarLeyenda = !mostrarLeyenda">
    {{ mostrarLeyenda ? '✕ Cerrar' : '🗺️ Leyenda' }}
  </button>

  <!-- Panel -->
  <transition name="leyenda-slide">
    <div class="leyenda-panel" v-if="mostrarLeyenda">
      <h4>Tipos de incidencia</h4>

      <div class="leyenda-item" v-for="item in leyendaItems" :key="item.label">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 28 28">
          <template v-if="item.forma === 'circulo'">
            <circle cx="14" cy="14" r="11" :fill="item.color" :stroke="item.borde" stroke-width="2.5"/>
          </template>
          <template v-else-if="item.forma === 'triangulo'">
            <polygon points="14,2 26,25 2,25" :fill="item.color" :stroke="item.borde" stroke-width="2.5" stroke-linejoin="round"/>
          </template>
          <template v-else-if="item.forma === 'rombo'">
            <polygon points="14,2 26,14 14,26 2,14" :fill="item.color" :stroke="item.borde" stroke-width="2.5" stroke-linejoin="round"/>
          </template>
          <template v-else-if="item.forma === 'cuadrado'">
            <rect x="3" y="3" width="22" height="22" rx="3" :fill="item.color" :stroke="item.borde" stroke-width="2.5"/>
          </template>
          <template v-else-if="item.forma === 'rectangulo'">
            <rect x="2" y="8" width="24" height="12" rx="3" :fill="item.color" :stroke="item.borde" stroke-width="2.5"/>
          </template>
        </svg>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from "vue"

const mostrarLeyenda = ref(false)

const leyendaItems = [
  { label: "Choque",                forma: "circulo",    color: "#EF9F27", borde: "#BA7517" },
  { label: "Atropellamiento",       forma: "circulo",    color: "#BA7517", borde: "#8a5510" },
  { label: "Volcadura",             forma: "circulo",    color: "#FAC775", borde: "#BA7517" },
  { label: "Robo",                  forma: "triangulo",  color: "#E24B4A", borde: "#A32D2D" },
  { label: "Asalto",                forma: "triangulo",  color: "#A32D2D", borde: "#7a1e1e" },
  { label: "Incendio",              forma: "rombo",      color: "#D85A30", borde: "#a03d1c" },
  { label: "Inundación",            forma: "cuadrado",   color: "#378ADD", borde: "#1f5fa8" },
  { label: "Vehículo descompuesto", forma: "rectangulo", color: "#888780", borde: "#5a5955" },
]
</script>

<style scoped>
.btn-leyenda {
  position: absolute;
  bottom: 32px;
  right: 12px;    
  z-index: 9999;
  padding: 8px 14px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: background 0.2s;
}
.btn-leyenda:hover { background: #f3f4f6; }

.leyenda-panel {
  position: absolute;
  bottom: 76px;
  right: 12px;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 14px;
  padding: 14px 16px;
  width: 220px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  font-family: sans-serif;
}
.leyenda-panel h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}
.leyenda-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-size: 12px;
  color: #374151;
}

/* Animación */
.leyenda-slide-enter-active,
.leyenda-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.leyenda-slide-enter-from,
.leyenda-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>