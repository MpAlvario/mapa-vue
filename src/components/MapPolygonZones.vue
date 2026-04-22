<!-- src/components/MapPolygonZones.vue -->
<template>
  <!-- Renderless -->
</template>

<script setup>
import { watch, onUnmounted, computed } from 'vue'
import * as turf from '@turf/turf'
import veracruz from '@/assets/veracruz-zonas.js'
import bbox from '@turf/bbox'

const props = defineProps({
  map: { type: Object, required: true },
  visible: { type: Boolean, default: true },
  incidencias: { type: Array, default: () => [] }
})

// ── Estado interno ────────────────────────────────────────
let polygonLayers = []
let labelMarkers  = []
let zoomHandler   = null

// ── Pre-procesar zonas UNA SOLA VEZ (no en cada render) ──
const zonasCache = computed(() => dividirEstadoEnZonas())

const colores = {
  'norte-oriente':  '#3B82F6',
  'norte-poniente': '#22C55E',
  'sur-oriente':    '#F97316',
  'sur-poniente':   '#A855F7'
}

const nombres = {
  'norte-oriente':  'Norte-Oriente',
  'norte-poniente': 'Norte-Poniente',
  'sur-oriente':    'Sur-Oriente',
  'sur-poniente':   'Sur-Poniente'
}

// ── Dibuja zonas ──────────────────────────────────────────
function drawPolygons() {
  if (!props.map) return
  clearPolygons()
/*
  //  DEBUG: obtener límites de cada zona (para backend)
zonasCache.value.forEach(zona => {
  const bounds = bbox(zona)

  console.log("ZONA:", zona.properties.zona)
  console.log("BBOX:", {
    minLng: bounds[0],
    minLat: bounds[1],
    maxLng: bounds[2],
    maxLat: bounds[3]
  })
})
*/
  zonasCache.value.forEach(zona => {
    const id = zona.properties.zona
    const total = contarIncidenciasEnZona(zona)

    // 🔹 Polígono
    const layer = L.geoJSON(zona, {
      style: {
        color:       colores[id],
        fillColor:   colores[id],
        fillOpacity: 0.15,
        weight:      2
      }
    }).addTo(props.map)

    //  Tooltip — se abre con el conteo ya calculado
    layer.bindTooltip(
      `<div class="tooltip-zona">
        <strong>${nombres[id]}</strong><br/>
        Incidencias: <b>${total}</b>
      </div>`,
      { sticky: true, opacity: 1 }
    )

    polygonLayers.push(layer)

    //  Label centrado
    const center = turf.center(zona).geometry.coordinates
    const label  = L.marker([center[1], center[0]], {
      icon: L.divIcon({
        className: 'zona-label',
        html: `<div class="zona-badge ${id}">${nombres[id]}</div>`,
        iconSize: [120, 30]
      }),
      interactive: false   // ← no interfiere con eventos del mapa
    }).addTo(props.map)

    labelMarkers.push(label)
  })

  setupZoomHandler()
//imprimir coordenadas
 
}

// ── Contar incidencias — FIX: iterar features individuales ──
function contarIncidenciasEnZona(zona) {
  const id = zona.properties.zona
  
  // DEBUG TEMPORAL
  console.log(`Zona: ${id}, incidencias con esa zona:`, 
    props.incidencias.filter(inc => inc.zona === id).length,
    'de un total de:', props.incidencias.length
  )
  
  return props.incidencias.filter(inc => inc.zona === id).length
}

// ── Zoom handler sin duplicar listeners ──────────────────
function setupZoomHandler() {
  if (zoomHandler) {
    props.map.off('zoomend', zoomHandler)
  }

  const ZOOM_MIN = 8

  zoomHandler = () => {
    const mostrar = props.map.getZoom() >= ZOOM_MIN
    labelMarkers.forEach(label => {
      mostrar ? label.addTo(props.map) : props.map.removeLayer(label)
    })
  }

  props.map.on('zoomend', zoomHandler)
  zoomHandler() // ejecutar inmediatamente
}

// ── Limpiar capas y listeners ─────────────────────────────
function clearPolygons() {
  polygonLayers.forEach(layer => props.map.removeLayer(layer))
  labelMarkers.forEach(label  => props.map.removeLayer(label))

  if (zoomHandler) {
    props.map.off('zoomend', zoomHandler)
    zoomHandler = null
  }

  polygonLayers = []
  labelMarkers  = []
}

// ── Watch: visibilidad ────────────────────────────────────
watch(
  () => props.visible,
  val => {
    if (!props.map) return
    val ? drawPolygons() : clearPolygons()
  },
  { immediate: true }
)

// ── Watch: incidencias — ÚNICO, con debounce manual ──────
let debounceTimer = null
watch(
  () => props.incidencias,
  (data) => {
    if (!props.visible || !props.map || !Array.isArray(data)) return

    // Debounce: espera 300ms antes de redibujar para no saturar
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      drawPolygons()
    }, 300)
  },
  { deep: true }
)

onUnmounted(() => {
  clearTimeout(debounceTimer)
  clearPolygons()
})
// ── SOLO CIUDAD DE VERACRuz ────────
function estaEnVeracruz(feature) {
  const [minLng, minLat, maxLng, maxLat] = feature.bbox || turf.bbox(feature)

  return (
    minLat >= 19.0 &&
    maxLat <= 19.3 &&
    minLng >= -96.3 &&
    maxLng <= -96.0
  )
}

// ── Divide zonas (resultado cacheado por computed) ────────
function dividirEstadoEnZonas() {
  const zonas = {
    'norte-oriente':  [],
    'norte-poniente': [],
    'sur-oriente':    [],
    'sur-poniente':   []
  }

  veracruz.features.forEach(feature => {
  // FILTRO PARA SOLO VERACRUZ CIUDAD
  if (!estaEnVeracruz(feature)) return

  const id = getZonaId(feature)
  if (zonas[id]) zonas[id].push(feature)
})
  return Object.entries(zonas).map(([id, features]) => ({
    type:       'FeatureCollection',
    properties: { zona: id },
    features
  }))
}

function getZonaId(feature) {
  const [lng, lat] = turf.center(feature).geometry.coordinates
  const esNorte   = lat >= 19.15
  const esOriente = lng >= -96.14

  if (esNorte  && esOriente)  return 'norte-oriente'
  if (esNorte  && !esOriente) return 'norte-poniente'
  if (!esNorte && esOriente)  return 'sur-oriente'
  return 'sur-poniente'
}
</script>

<style>
.tooltip-zona {
  font-size: 12px;
  padding: 4px 8px;
  line-height: 1.5;
}

.zona-label {
  background: transparent;
  border: none;
}

.zona-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  white-space: nowrap;
}

.zona-badge.norte-oriente  { background: rgba(59,130,246,0.85); }
.zona-badge.norte-poniente { background: rgba(34,197,94,0.85);  }
.zona-badge.sur-oriente    { background: rgba(249,115,22,0.85); }
.zona-badge.sur-poniente   { background: rgba(168,85,247,0.85); }
</style>