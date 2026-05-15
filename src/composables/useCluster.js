// composables/useCluster.js
//
// Agrega clustering de Leaflet a las incidencias SIN duplicar lógica.
// Reutiliza cargarIncidencias y toda la animación de useIncidencias.js,
// simplemente swapea el markersLayer por un MarkerClusterGroup.
//
// ─── Instalación requerida ────────────────────────────────────────
//   npm install leaflet.markercluster
//
// ─── En main.js (una sola vez) ───────────────────────────────────
//   import 'leaflet.markercluster/dist/MarkerCluster.css'
//   import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
// ─────────────────────────────────────────────────────────────────

import L from "leaflet"
import "leaflet.markercluster"
import { ref } from "vue"
import { useIncidencias } from "./useIncidencias"

export function useCluster(map, trazarRuta, asignarPatrullaAPI, miUbicacion, miMarker) {

  // ── Crear el MarkerClusterGroup ──────────────────────────────────
  // Este ref hace el papel de "markersLayer" pero con clustering
  const clusterLayer = ref(null)

  function crearClusterGroup() {
    return L.markerClusterGroup({
      chunkedLoading:      true,   // no bloquea el hilo al cargar muchos markers
      chunkInterval:       200,
      chunkDelay:          50,
      maxClusterRadius:    80,     // px: radio de agrupación
      spiderfyOnMaxZoom:   true,   // en zoom máximo abre en araña
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,

      // ── Icono del cluster con tu imagen base ───────────────────
   iconCreateFunction(cluster) {
  const count = cluster.getChildCount()

  let color = "#10b981"
  if (count >= 50)      color = "#ef4444"
  else if (count >= 20) color = "#f59e0b"
  else if (count >= 10) color = "#3b82f6"

  //  Aumentamos tamaño
  const size = count >= 50 ? 44 : count >= 20 ? 40 : count >= 10 ? 36 : 32

  return L.divIcon({
    html: `
      <div style="
        width:           ${size}px;
        height:          ${size}px;
        border-radius:   50%;
        background:      ${color}cc;   /* menos transparente */
        border:          2.5px solid ${color}; /* borde sólido */
        display:         flex;
        align-items:     center;
        justify-content: center;
        font-size:       13px;  /* texto más visible */
        font-weight:     700;
        font-family:     sans-serif;
        color:           #fff; /* mejor contraste */
        box-shadow:      0 0 8px ${color}; /* efecto glow */
      ">${count}</div>
    `,
    className:  "",
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
},
    })
  }

  // ── Inicializar: crea el cluster y lo añade al mapa ──────────────
  // Llama esto una vez cuando map.value ya exista
  function inicializarCluster() {
    if (!map.value) return

    if (clusterLayer.value) {
      clusterLayer.value.clearLayers()
      map.value.removeLayer(clusterLayer.value)
    }

    clusterLayer.value = crearClusterGroup()
    clusterLayer.value.addTo(map.value)
  }

  // ── Reutilizar useIncidencias pasándole clusterLayer como markersLayer ──
  // Toda la lógica de popups, botones y animación vive únicamente
  // en useIncidencias.js — aquí no se duplica ni una línea.
  const {
    cargarIncidencias,
    quitarMarkerIncidencia,
    colorPorSeveridad,
  } = useIncidencias(map, clusterLayer, trazarRuta, asignarPatrullaAPI, miUbicacion, miMarker)

  // ── Wrapper que garantiza que el cluster existe antes de cargar ──
  async function cargarIncidenciasCluster(tipo, minutos) {
    if (!clusterLayer.value) inicializarCluster()
    return await cargarIncidencias(tipo, minutos)
  }

  // ── Mostrar / ocultar (para el watch de vistaActiva) ────────────
  function mostrarCluster() {
    if (clusterLayer.value && map.value && !map.value.hasLayer(clusterLayer.value)) {
      clusterLayer.value.addTo(map.value)
    }
  }

  function ocultarCluster() {
    if (clusterLayer.value && map.value && map.value.hasLayer(clusterLayer.value)) {
      map.value.removeLayer(clusterLayer.value)
    }
  }

  // ── Limpiar al desmontar ─────────────────────────────────────────
  function destruirCluster() {
    if (clusterLayer.value) {
      clusterLayer.value.clearLayers()
      if (map.value) map.value.removeLayer(clusterLayer.value)
      clusterLayer.value = null
    }
  }

  return {
    clusterLayer,             // ref al MarkerClusterGroup (reemplaza markersLayer)
    inicializarCluster,
    cargarIncidenciasCluster,
    quitarMarkerIncidencia,
    mostrarCluster,
    ocultarCluster,
    destruirCluster,
    colorPorSeveridad,        // re-exportado por si lo necesitas en el componente
  }
}
