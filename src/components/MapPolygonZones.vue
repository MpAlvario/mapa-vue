<!-- src/components/MapPolygonZones.vue -->
<template>
  <!-- Renderless -->
</template>

<script setup>
import { watch, onUnmounted, computed } from 'vue'
import * as turf from '@turf/turf'
import { usePolygonZones } from '@/composables/usePolygonZones'

const props = defineProps({
  map: { type: Object, required: true },
  visible: { type: Boolean, default: true },
  incidencias: { type: Array, default: () => [] }
})

let polygonLayers = []
let labelMarkers  = []
let zoomHandler   = null
let debounceTimer = null

const { getVisualZoneCollections } = usePolygonZones()
const zonasCache = computed(() => getVisualZoneCollections())

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

function drawPolygons() {
  if (!props.map) return
  clearPolygons()

  zonasCache.value.forEach(zona => {
    const id = zona.properties.zona
    const total = contarIncidenciasEnZona(id)

    const layer = L.geoJSON(zona, {
      style: {
        color:       colores[id],
        fillColor:   colores[id],
        fillOpacity: 0.15,
        weight:      2
      }
    }).addTo(props.map)

    layer.bindTooltip(
      `<div class="tooltip-zona">
        <strong>${nombres[id]}</strong><br/>
        Incidencias: <b>${total}</b>
      </div>`,
      { sticky: true, opacity: 1 }
    )

    polygonLayers.push(layer)

    const center = turf.center(zona).geometry.coordinates
    const label  = L.marker([center[1], center[0]], {
      icon: L.divIcon({
        className: 'zona-label',
        html: `<div class="zona-badge ${id}">${nombres[id]}</div>`,
        iconSize: [120, 30]
      }),
      interactive: false
    }).addTo(props.map)

    labelMarkers.push(label)
  })

  setupZoomHandler()
}

function contarIncidenciasEnZona(id) {
  return props.incidencias.filter(inc => inc.zona === id).length
}

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
  zoomHandler()
}

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

watch(
  () => props.visible,
  val => {
    if (!props.map) return
    val ? drawPolygons() : clearPolygons()
  },
  { immediate: true }
)

watch(
  () => props.incidencias,
  data => {
    if (!props.visible || !props.map || !Array.isArray(data)) return

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
