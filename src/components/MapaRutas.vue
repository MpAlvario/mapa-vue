<template>
  <div class="mapa-rutas-main-container">
    <div class="map-wrapper">
      
      <div class="panel" v-show="panelActivo === 'incidencias'">
        <h3>🚨 Incidentes - Veracruz</h3>
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

      <MapPolygonZones
        v-if="map"
       :map="map"
       :visible="props.vistaActiva === 'poligonos'"
       :incidencias="incidencias|| []"
        />

      <button class="btn-dashboard" @click="dashVisibleLocal = true">📊 Estadísticas</button>

      <DashboardModal 
        v-model:visible="dashVisibleLocal" 
        :api-url="API.terrestre.incidencias()" 
        :tipo="tipo"
      />

      <LeyendaIncidencias
          v-if="!['heatmap', 'poligonos', 'clusters'].includes(props.vistaActiva)"
        />

    </div>
    
    <div class="bottom-bar-global"></div>
  </div>
</template>

<script setup>
import { API } from "@/config/api"
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue"

import { useLeafletMap }   from "../composables/useLeafletMap"
import { useRouting }      from "../composables/useRouting"
import { useMapPatrullas } from "../composables/usePatrullas"
import { useIncidencias }  from "../composables/useIncidencias"
import { useMapHeatmap }   from "../composables/useHeatmap"
import { useCluster }      from "../composables/useCluster"          // ← NUEVO
import LeyendaIncidencias  from "../components/LeyendaIncidencias.vue"
import DashboardModal from "./DashboardModal.vue"
import MapPolygonZones from "../components/MapPolygonZones.vue" //nuevo
import L from "leaflet"
import "leaflet.heat"

const incidencias = ref([])

const props = defineProps({
  activo:       { type: Boolean, default: false },
  panelActivo:  { type: String,  default: null  },
  vistaActiva:  { type: String,  default: 'markers' },
  dashVisible:  { type: Boolean, default: false } // Se llama dashVisible
})

// Cambiamos el nombre de la variable a dashVisibleLocal para que coincida con tu HTML
const dashVisibleLocal = ref(props.dashVisible)

// 1. Escuchar cambios del padre (Navbar -> App -> Mapa)
watch(() => props.dashVisible, (newVal) => {
  dashVisibleLocal.value = newVal
})

// 2. Avisar al padre cuando se cierra el modal localmente
watch(dashVisibleLocal, (newVal) => {
  if (newVal !== props.dashVisible) {
    emit('update:dashboardVisible', newVal) 
  }
})

const mapContainer = ref(null)
const tipo    = ref("todos")
const minutos = ref("1440")
const info    = ref("Cargando...")
const hayRuta = ref(false)
const prediccionLayer = ref(null)


let cargaInicialHecha = false
let autoRefresh = null

const { map, markersLayer, patrullasLayer, miUbicacion, miMarker, invalidateSize } = useLeafletMap(mapContainer)

const { routingControl, trazarRuta, trazarRutaDesdePatrulla, quitarRuta } = useRouting(map, miUbicacion, miMarker, hayRuta)

let quitarMarkerIncidenciaMarkers = () => false
let quitarMarkerIncidenciaCluster = () => false

const { asignarPatrullaAPI, cargarPatrullasVisual,bloquearRefresh } = useMapPatrullas(
  map,
  patrullasLayer,
  trazarRutaDesdePatrulla,
  () => refrescarTodo(),
  () => cargarHeatmap(minutos.value),
  () => cargarIncidencias(tipo.value, minutos.value),
  (incidenciaId) => {
    quitarMarkerIncidenciaMarkers(incidenciaId)
    quitarMarkerIncidenciaCluster(incidenciaId)
  }
)

// Vista markers — sin cambios
const {
  cargarIncidencias,
  quitarMarkerIncidencia,
  colorPorSeveridad,
  incidenciasData
} = useIncidencias(map, markersLayer, trazarRuta, asignarPatrullaAPI, miUbicacion, miMarker, bloquearRefresh)

quitarMarkerIncidenciaMarkers = quitarMarkerIncidencia

// Vista heatmap — sin cambios
const { heatLayer, cargarHeatmap } = useMapHeatmap(map)

// ── Vista cluster — NUEVO ────────────────────────────────────────
const {
  clusterLayer,
  inicializarCluster,
  cargarIncidenciasCluster,
  quitarMarkerIncidencia: quitarMarkerIncidenciaDelCluster,
  mostrarCluster,
  ocultarCluster,
  destruirCluster,
} = useCluster(map, trazarRuta, asignarPatrullaAPI, miUbicacion, miMarker)

quitarMarkerIncidenciaCluster = quitarMarkerIncidenciaDelCluster
// ────────────────────────────────────────────────────────────────

// ── Helper: oculta las 3 capas y muestra solo la activa ─────────
function aplicarVista(vista) {
  if (!map.value) return

  //  limpiar TODAS las capas
  if (markersLayer.value && map.value.hasLayer(markersLayer.value)) {
    map.value.removeLayer(markersLayer.value)
  }

  if (heatLayer.value && map.value.hasLayer(heatLayer.value)) {
    map.value.removeLayer(heatLayer.value)
  }

  if (prediccionLayer.value && map.value.hasLayer(prediccionLayer.value)) {
    map.value.removeLayer(prediccionLayer.value)
  }

  ocultarCluster()

  if (vista === 'poligonos') return

  //  mostrar según vista
  if (vista === 'heatmap') {
    if (heatLayer.value) map.value.addLayer(heatLayer.value)

  } else if (vista === 'prediccion') {
    cargarPrediccion()

  } else if (vista === 'cluster') {
    mostrarCluster()

  } else {
    if (markersLayer.value) map.value.addLayer(markersLayer.value)
  }

  //  efecto visual 
  if (vista === 'prediccion') {
    map.value.getContainer().style.filter = "hue-rotate(40deg) brightness(1.1)"
  } else {
    map.value.getContainer().style.filter = "none"
  }
}

watch(() => props.activo, async (val) => {
  if (val && map.value) {
    await nextTick()
    invalidateSize()
    await refrescarTodo()
    if (!autoRefresh) {
      autoRefresh = setInterval(refrescarTodo, 10000)
    }
  } else {
    if (autoRefresh) {
      clearInterval(autoRefresh)
      autoRefresh = null
    }
  }
})

// ── Cuando cambia la vista, aplicar sin recargar datos ──────────
watch(() => props.vistaActiva, (vista) => {
  aplicarVista(vista)
})

async function refrescarTodo() {
  if (!map.value || !patrullasLayer.value) return

  info.value = "Actualizando..."
  map.value.closePopup()

  let totalMarkers = 0

  if (props.vistaActiva === 'heatmap') {
    totalMarkers = await cargarIncidencias(tipo.value, minutos.value)
    await cargarHeatmap(minutos.value)
  } else if (props.vistaActiva === 'cluster') {
    totalMarkers = await cargarIncidenciasCluster(tipo.value, minutos.value)
  } else {
    totalMarkers = await cargarIncidencias(tipo.value, minutos.value)
  }

  incidencias.value = incidenciasData.value.map(i => ({
    lat: parseFloat(i.latitud),
    lng: parseFloat(i.longitud),
    tipo: i.tipo,
    zona: i.zona,
    severidad: i.severidad
  }))

 // cargar patrullas solo una vez
if (!cargaInicialHecha) {
  await cargarPatrullasVisual()
  cargaInicialHecha = true
}

// ejecutar predicción si está activa
if (props.vistaActiva === 'prediccion') {
  await cargarPrediccion()
}
  info.value = `
    Incidentes: ${totalMarkers}<br>
    Auto refresh: 10s
  `
}

//Funcion de predicción

async function cargarPrediccion() {
  if (!map.value) return

  try {
    const res = await fetch("http://127.0.0.1:5000/prediccion")
    const data = await res.json()

    const maxScore = Math.max(...data.map(z => z.score))

    const puntos = data.map(z => [
    parseFloat(z.lat_bin),
    parseFloat(z.lon_bin),
    z.score / maxScore
])
    // eliminar capa anterior si existe
    if (prediccionLayer.value && map.value.hasLayer(prediccionLayer.value)) {
      map.value.removeLayer(prediccionLayer.value)
    }

    prediccionLayer.value = L.heatLayer(puntos, {
    radius: 35,
    blur: 25,
    maxZoom: 17,
    minOpacity: 0.4,
    gradient: {
    0.1: 'blue',
    0.4: 'lime',
    0.7: 'orange',
    1.0: 'red'
  }
})

    map.value.addLayer(prediccionLayer.value)

  } catch (error) {
    console.error("Error en predicción:", error)
  }
}
//finaliza

onMounted(() => {
  const stop = watch(map, async (nuevoMapa) => {
    if (nuevoMapa) {
      stop()
//carga las patrullas
      await cargarPatrullasVisual()

      // Inicializar el cluster group una vez que el mapa existe  ← NUEVO
      inicializarCluster()

      // Aplicar la vista inicial correcta
      aplicarVista(props.vistaActiva)

      // Cerrar popups antes del zoom
      nuevoMapa.on("zoomstart", () => {
        
      })

      if (props.activo) {
        await refrescarTodo()
        autoRefresh = setInterval(refrescarTodo, 10000)
      }
    }
  }, { immediate: true })
})

onBeforeUnmount(() => {
  if (autoRefresh) {
    clearInterval(autoRefresh)
    autoRefresh = null
  }

  if (map.value) {
    map.value.closePopup()

    if (markersLayer.value) markersLayer.value.clearLayers()
    if (patrullasLayer.value) patrullasLayer.value.clearLayers()

    destruirCluster()   // ← NUEVO: limpiar el cluster al desmontar

    if (hayRuta.value) quitarRuta()

    map.value.off()
    map.value.remove()
    map.value = null
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
  border-color: #083a88;
}

.panel button {
  margin-top: 4px;
  padding: 8px 16px;
  width: fit-content;
  align-self: center;
  border-radius: 8px;
  border: none;
  background: #083a88;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(8, 58, 136, 0.3);
  transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
}

.panel button:hover {
  background: #0d4fb3;
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

.contenedor-patrulla {
  background: transparent;
  border: none;
}

.patrulla {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  position: relative;
}

.patrulla-disponible {
  background: #054dc1;
}

.patrulla-disponible::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.5);
  animation: pulso 1.5s infinite;
  top: 0;
  left: 0;
}

.patrulla-atendiendo {
  background: #808080;
}

.patrulla-atendiendo::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.4);
  animation: pulso-lento 2s infinite;
  top: 0;
  left: 0;
}

.patrulla-en-camino {
  background: linear-gradient(90deg, red 50%, blue 50%);
  animation: sirenaColor 0.5s infinite;
}

.patrulla-en-camino::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.4);
  animation: pulso 1s infinite;
  top: 0;
  left: 0;
}

@keyframes sirenaColor {
  0%   { background: red;  box-shadow: 0 0 12px red;  }
  50%  { background: blue; box-shadow: 0 0 12px blue; }
  100% { background: red;  box-shadow: 0 0 12px red;  }
}

@keyframes pulso {
  0%   { transform: scale(1);   opacity: 0.7; }
  70%  { transform: scale(2.2); opacity: 0;   }
  100% { transform: scale(1);   opacity: 0;   }
}

@keyframes pulso-lento {
  0%   { transform: scale(1);   opacity: 0.6; }
  70%  { transform: scale(2.5); opacity: 0;   }
  100% { transform: scale(1);   opacity: 0;   }
}


#app {
  height: 100vh;
  position: relative;
}

.patrulla-sirena {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  animation: sirena 0.6s infinite;
}

@keyframes sirena {
  0% { background: #3b82f6; }
  50% { background: #ef4444; }
  100% { background: #3b82f6; }
}

.tooltip-patrulla {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  color: #111827;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.16);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 9px;
  white-space: nowrap;
  backdrop-filter: blur(6px);
}

.tooltip-patrulla::before {
  border-top-color: rgba(255, 255, 255, 0.82);
}
</style>
