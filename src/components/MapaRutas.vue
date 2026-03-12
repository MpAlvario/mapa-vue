<template>
  <div class="map-wrapper">
    <div class="panel">
      <h3>🚨 Incidencias - Veracruz</h3>

      <select v-model="tipo">
        <option value="todos">Todos</option>
        <option value="choque">Choque</option>
        <option value="atropellamiento">Atropellamiento</option>
        <option value="robo">Robo</option>
        <option value="asalto">Asalto</option>
        <option value="incendio">Incendio</option>
        <option value="inundacion">Inundación</option>
        <option value="volcadura">Volcadura</option>
        <option value="vehiculo_descompuesto">Vehículo descompuesto</option>
      </select>

      <select v-model="minutos">
        <option value="30">30 min</option>
        <option value="60">1 hora</option>
        <option value="180">3 horas</option>
        <option value="720">12 horas</option>
        <option value="1440">24 horas</option>
      </select>

      <button @click="refrescarTodo">Actualizar</button>

      <div class="info" v-html="info"></div>
    </div>

    <div ref="mapContainer" class="map"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue"

import { useLeafletMap }   from "../composables/useLeafletMap"
import { useRouting }      from "../composables/useRouting"
import { useMapPatrullas } from "../composables/usePatrullas"
import { useIncidencias }  from "../composables/useIncidencias"
import { useMapHeatmap }   from "../composables/useHeatmap"

const mapContainer = ref(null)
const tipo    = ref("todos")
const minutos = ref("1440")
const info    = ref("Cargando...")
const hayRuta = ref(false)

let autoRefresh = null

const { map, markersLayer, patrullasLayer, miUbicacion, miMarker } = useLeafletMap(mapContainer)

const { routingControl, trazarRuta, trazarRutaDesdePatrulla, quitarRuta } = useRouting(map, miUbicacion, miMarker, hayRuta)

const { asignarPatrullaAPI, cargarPatrullasVisual } = useMapPatrullas(
  map,
  patrullasLayer,
  trazarRutaDesdePatrulla,
  () => refrescarTodo(),
  () =>cargarHeatmap(minutos.value), //actualizar el heatmap
  () =>cargarIncidencias(tipo, minutos)
)

const { cargarIncidencias, colorPorSeveridad } = useIncidencias(map, markersLayer, trazarRuta, asignarPatrullaAPI, miUbicacion, miMarker)

const { heatLayer, cargarHeatmap } = useMapHeatmap(map)

async function refrescarTodo() {
  if (!map.value || !patrullasLayer.value) return

  info.value = "Actualizando..."
  map.value.closePopup()

  const totalMarkers = await cargarIncidencias(tipo, minutos)
  await cargarPatrullasVisual()
  await cargarHeatmap(minutos.value)

  info.value = `
    Incidencias: ${totalMarkers}<br>
    Auto refresh: 10s
  `
}

onMounted(() => {
  const stop = watch(map, (nuevoMapa) => {
    if (nuevoMapa) {
      stop()

      // Cierra popups antes del zoom para evitar error 
      nuevoMapa.on('zoomstart', () => {
        nuevoMapa.closePopup()
      })

      refrescarTodo()
      autoRefresh = setInterval(refrescarTodo, 10000)
    }
  }, { immediate: true })
})

onBeforeUnmount(() => {
  if (autoRefresh) clearInterval(autoRefresh)
  if (map.value) {
    map.value.off('zoomstart') // Limpia el listener al desmontar
    map.value.closePopup()
  }
})
</script>

<style>
.map {
  height: 100vh;
  width: 100%;
}

.panel {
  position: absolute;
  top: 72px;
  right: 12px;
  left: unset;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.97);
  padding: 16px;
  border-radius: 16px;
  width: 260px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: sans-serif;
}

.panel h3 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.panel select {
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  outline: none;
  transition: border 0.2s;
}

.panel select:focus {
  border-color: #3b82f6;
}

.panel button {
  margin-top: 4px;
  padding: 8px 16px;
  width: fit-content;
  align-self: center;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
  transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
}

.panel button:hover {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
  transform: translateY(-1px);
}

.panel button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.panel .info {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  margin-top: 2px;
}
</style>