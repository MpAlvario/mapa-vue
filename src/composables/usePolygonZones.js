// src/composables/usePolygonZones.js
import { ref } from 'vue'

// ── Límites reales del estado de Veracruz ──────────────────────────────────
const BOUNDS = {
  north: 22.47,   // Pánuco / Tampico frontera norte
  south: 17.12,   // Región Coatzacoalcos / Chiapas
  east:  -93.60,  // Costa del Golfo (Veracruz, Tuxpan, etc.)
  west:  -98.95   // Sierra Madre Occidental / Puebla
}

// ── Ejes divisores geográficamente justificados ────────────────────────────
//    LAT_DIV ~ 19.80 → divide en Tuxpan / Papantla (zona media del estado)
//    LNG_DIV ~ 97.10 → sigue aproximadamente la Sierra Madre Oriental
const LAT_DIV = 19.15
const LNG_DIV = -96.14

export function usePolygonZones() {

  const zones = ref([
    {
      id: 'norte-oriente',
      nombre: 'Norte-Oriente',
      color: '#3B82F6',
      fillOpacity: 0.12,
      bounds: {
        north: BOUNDS.north, south: LAT_DIV,
        east: BOUNDS.east,   west: LNG_DIV
      }
    },
    {
      id: 'norte-poniente',
      nombre: 'Norte-Poniente',
      color: '#22C55E',
      fillOpacity: 0.12,
      bounds: {
        north: BOUNDS.north, south: LAT_DIV,
        east: LNG_DIV,       west: BOUNDS.west
      }
    },
    {
      id: 'sur-oriente',
      nombre: 'Sur-Oriente',
      color: '#F97316',
      fillOpacity: 0.12,
      bounds: {
        north: LAT_DIV,      south: BOUNDS.south,
        east: BOUNDS.east,   west: LNG_DIV
      }
    },
    {
      id: 'sur-poniente',
      nombre: 'Sur-Poniente',
      color: '#A855F7',
      fillOpacity: 0.12,
      bounds: {
        north: LAT_DIV,      south: BOUNDS.south,
        east: LNG_DIV,       west: BOUNDS.west
      }
    }
  ])

  /**
   * Detecta a qué zona pertenece una coordenada
   * @param {number} lat
   * @param {number} lng
   * @returns {string} id de la zona
   */
  function getZoneForCoords(lat, lng) {
  const esNorte   = lat >= 19.15
  const esOriente = lng >= -96.14

  if (esNorte && esOriente) return 'norte-oriente'
  if (esNorte && !esOriente) return 'norte-poniente'
  if (!esNorte && esOriente) return 'sur-oriente'
  return 'sur-poniente'
}

  /**
   * Convierte bounds a array de LatLng para Leaflet
   * @param {object} bounds
   * @returns {Array} [[lat,lng], ...]
   */
  function boundsToLeafletPolygon(bounds) {
    return [
      [bounds.north, bounds.west],
      [bounds.north, bounds.east],
      [bounds.south, bounds.east],
      [bounds.south, bounds.west]
    ]
  }

  /**
   * Devuelve el objeto de zona completo dado un id
   * @param {string} zoneId
   * @returns {object|null}
   */
  function getZoneById(zoneId) {
    return zones.value.find(z => z.id === zoneId) ?? null
  }

  return {
    zones,
    getZoneForCoords,
    boundsToLeafletPolygon,
    getZoneById,
    LAT_DIV,
    LNG_DIV,
    BOUNDS
  }
}