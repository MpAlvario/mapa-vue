<template>
  <div class="map-wrapper">
    
<div class="panel" v-show="panelActivo === 'incidencias'">
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
  <LeyendaIncidencias />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue"

import { useLeafletMap }   from "../composables/useLeafletMap"
import { useRouting }      from "../composables/useRouting"
import { useMapPatrullas } from "../composables/usePatrullas"
import { useIncidencias }  from "../composables/useIncidencias"
import { useMapHeatmap }   from "../composables/useHeatmap"
import LeyendaIncidencias from "../components/LeyendaIncidencias.vue"

const props = defineProps({
  activo:      { type: Boolean, default: false },
  panelActivo: { type: String,  default: null  },
  vistaActiva: { type: String,  default: 'markers' }

})

const mapContainer = ref(null)
const tipo    = ref("todos")
const minutos = ref("1440")
const info    = ref("Cargando...")
const hayRuta = ref(false)

// Flag para saber si ya se hizo la carga inicial
let cargaInicialHecha = false
let autoRefresh = null

const { map, markersLayer, patrullasLayer, miUbicacion, miMarker, invalidateSize } = useLeafletMap(mapContainer)

const { routingControl, trazarRuta, trazarRutaDesdePatrulla, quitarRuta } = useRouting(map, miUbicacion, miMarker, hayRuta)

const { asignarPatrullaAPI, cargarPatrullasVisual } = useMapPatrullas(
  map,
  patrullasLayer,
  trazarRutaDesdePatrulla,
  () => refrescarTodo(),
  () => cargarHeatmap(minutos.value),
  () => cargarIncidencias(tipo, minutos)
)

const { cargarIncidencias, colorPorSeveridad } = useIncidencias(map, markersLayer, trazarRuta, asignarPatrullaAPI, miUbicacion, miMarker)

const { heatLayer, cargarHeatmap } = useMapHeatmap(map)

//  FIX PRINCIPAL: cuando el componente se vuelve visible
// 1. Invalidar tamaño del mapa
// 2. Cargar incidencias + patrullas + heatmap (refrescarTodo)
// 3. Arrancar autoRefresh
watch(() => props.activo, async (val) => {
  if (val && map.value) {
    await nextTick()
    invalidateSize()

    // Cargar todo al hacerse visible
    await refrescarTodo()

    // Arrancar autoRefresh si no está corriendo
    if (!autoRefresh) {
      autoRefresh = setInterval(refrescarTodo, 10000)
    }
  } else {
    // Pausar autoRefresh cuando está oculto
    if (autoRefresh) {
      clearInterval(autoRefresh)
      autoRefresh = null
    }
  }
})

watch(() => props.vistaActiva, (vista) => {
  if (!map.value) return

  if (vista === 'heatmap') {
    if (markersLayer.value) map.value.removeLayer(markersLayer.value)
    if (heatLayer.value) map.value.addLayer(heatLayer.value)
  } else {
    if (heatLayer.value) map.value.removeLayer(heatLayer.value)
    if (markersLayer.value) map.value.addLayer(markersLayer.value)
  }
})

async function refrescarTodo() {
  if (!map.value || !patrullasLayer.value) return

  info.value = "Actualizando..."
  map.value.closePopup()

  const totalMarkers = await cargarIncidencias(tipo, minutos)
  await cargarPatrullasVisual()

  // SOLO cargar lo que corresponde a la vista activa
  if (props.vistaActiva === 'heatmap') {
    await cargarHeatmap(minutos.value)
  }

  info.value = `
    Incidencias: ${totalMarkers}<br>
    Auto refresh: 10s
  `
}

onMounted(() => {
  const stop = watch(map, async (nuevoMapa) => {
    if (nuevoMapa) {
      if (props.vistaActiva === 'heatmap') {
  if (markersLayer.value) markersLayer.value.remove()
  if (heatLayer.value) heatLayer.value.addTo(map.value)
} else {
  if (heatLayer.value) heatLayer.value.remove()
  if (markersLayer.value) markersLayer.value.addTo(map.value)
}
      stop()

      // Cierra popups antes del zoom para evitar error
      nuevoMapa.on("zoomstart", () => {
        nuevoMapa.closePopup()

        if (markersLayer.value) {
          markersLayer.value.eachLayer(layer => {
            if (layer.closePopup) layer.closePopup()
          })
        }

        if (patrullasLayer.value) {
          patrullasLayer.value.eachLayer(layer => {
            if (layer.closePopup) layer.closePopup()
          })
        }
      })

      // FIX: si ya es visible al montar (ej: es el mapa por defecto),
      // cargar todo inmediatamente. Si no, el watch de "activo" lo hará
      // cuando el usuario navegue a este mapa.
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

    if (markersLayer.value) {
      markersLayer.value.clearLayers()
    }

    if (patrullasLayer.value) {
      patrullasLayer.value.clearLayers()
    }

    if (hayRuta.value) {
      quitarRuta()
    }

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

/* BASE */
.patrulla {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  position: relative;
}

/*  DISPONIBLE (con pulso tipo radar) */
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

/* 🟠 ATENDIENDO (pulso más lento y suave) */
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

/* 🔵🔴 EN CAMINO (SIRENA REAL + PULSO) */
.patrulla-en-camino {
  background: linear-gradient(90deg, red 50%, blue 50%);
  animation: sirenaColor 0.5s infinite;
}

/* pulso externo */
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

/* 🔴🔵 CAMBIO DE COLOR tipo sirena */
@keyframes sirenaColor {
  0% {
    background: red;
    box-shadow: 0 0 12px red;
  }
  50% {
    background: blue;
    box-shadow: 0 0 12px blue;
  }
  100% {
    background: red;
    box-shadow: 0 0 12px red;
  }
}

/* 💚 Pulso rápido */
@keyframes pulso {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  70% {
    transform: scale(2.2);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* 🟠 Pulso lento */
@keyframes pulso-lento {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  70% {
    transform: scale(2.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}
</style>