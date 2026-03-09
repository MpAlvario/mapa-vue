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

    <!-- IMPORTANTE: usamos ref, NO id -->
    <div ref="mapContainer" class="map"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"

import { useLeafletMap }    from "../composables/useLeafletMap"
import { useRouting }       from "../composables/useRouting"
import { useMapPatrullas }  from "../composables/usePatrullas"
import { useIncidencias }   from "../composables/useIncidencias"
import { useMapHeatmap }    from "../composables/useHeatmap"

/* ------------------ REACTIVOS ------------------ */
const mapContainer = ref(null)
const tipo    = ref("todos")
const minutos = ref("1440")
const info    = ref("Cargando...")

let autoRefresh = null

/* ------------------ COMPOSABLES ------------------ */
const { map, markersLayer, patrullasLayer, miUbicacion } = useLeafletMap(mapContainer)

const { routingControl, trazarRuta, trazarRutaDesdePatrulla } = useRouting(map, miUbicacion)

// onRefrescar se pasa como función para evitar referencia circular
const { asignarPatrullaAPI, cargarPatrullasVisual } = useMapPatrullas(
  map,
  patrullasLayer,
  trazarRutaDesdePatrulla,
  () => refrescarTodo()
)

const { cargarIncidencias, colorPorSeveridad } = useIncidencias(map, markersLayer, trazarRuta, asignarPatrullaAPI)

const { heatLayer, cargarHeatmap } = useMapHeatmap(map)

/* ------------------ REFRESH ------------------ */

async function refrescarTodo() {
  info.value = "Actualizando..."

  if (map.value) {
    map.value.closePopup()
  }

  const totalMarkers = await cargarIncidencias(tipo, minutos)
  const totalHeat = await cargarHeatmap()
  await cargarPatrullasVisual()

  info.value = `
    Incidencias: ${totalMarkers}<br>
    Heatmap puntos: ${totalHeat}<br>
    Auto refresh: 10s
  `
}

/* ------------------ LIFECYCLE ------------------ */

onMounted(() => {
  // useLeafletMap maneja initMap en su propio onMounted
  refrescarTodo()
  autoRefresh = setInterval(refrescarTodo, 10000)
})

onBeforeUnmount(() => {
  if (autoRefresh) clearInterval(autoRefresh)
  // useLeafletMap maneja map.remove() en su propio onBeforeUnmount
})
</script>

<style>
.map {
  height: 100vh;
  width: 100%;
}


.panel {
  position: absolute;
  top: 72px;        /* 60px navbar + 12px de margen */
  right: 12px;      /* derecha en lugar de left */
  left: unset;      /* cancela el left anterior */
  z-index: 9999;
  background: rgba(255,255,255,0.95);
  padding: 12px;
  border-radius: 14px;
  width: 280px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.2);
}

button {
  margin-top: 8px;
  padding: 8px;
  width: 100%;
  border-radius: 8px;
  border: none;
  background: black;
  color: white;
  cursor: pointer;
}
</style>