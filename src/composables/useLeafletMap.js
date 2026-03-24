import { ref, onMounted, onBeforeUnmount, nextTick } from "vue"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export function useLeafletMap(mapContainer) {
  const map = ref(null)
  const markersLayer = ref(null)
  const patrullasLayer = ref(null)
  const miUbicacion = ref(null)
  const miMarker = ref(null)

  const pinIcon = L.icon({
    iconUrl: "/pin.png",
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
  })

  function initMap() {
    if (!mapContainer.value) return

    //  FIX 1: Si Leaflet ya ocupó este contenedor, limpiar el id
    // para que no lance "Map container is being reused by another instance"
    if (mapContainer.value._leaflet_id) {
      mapContainer.value._leaflet_id = null
    }

    map.value = L.map(mapContainer.value).setView([19.1738, -96.1342], 12)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(map.value)

    markersLayer.value = L.layerGroup().addTo(map.value)
    patrullasLayer.value = L.layerGroup().addTo(map.value)

    obtenerUbicacion()
  }

  //  FIX 2: Exponer invalidateSize para que MapaRutas.vue lo llame
  // cuando el componente se vuelve visible con v-show
  function invalidateSize() {
    if (map.value) {
      map.value.invalidateSize()
    }
  }

  function obtenerUbicacion() {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        miUbicacion.value = L.latLng(latitude, longitude)

        miMarker.value = L.marker(miUbicacion.value, { icon: pinIcon })
          .addTo(map.value)
          .bindPopup("📍 Mi ubicación")

        map.value.setView(miUbicacion.value, 14)
      }
    )
  }

  onMounted(async () => {
    await nextTick()
    initMap()
  })

  //  FIX 3: Limpieza completa al desmontar
  onBeforeUnmount(() => {
    if (map.value) {
      map.value.off()
      map.value.remove()
      map.value = null
    }
    markersLayer.value = null
    patrullasLayer.value = null
    miUbicacion.value = null
    miMarker.value = null
  })

  return {
    map,
    markersLayer,
    patrullasLayer,
    miUbicacion,
    miMarker,
    invalidateSize // exportar para usarlo en MapaRutas.vue
  }
}