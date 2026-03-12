import { ref, onMounted, onBeforeUnmount, nextTick } from "vue"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export function useLeafletMap(mapContainer) {
  const map = ref(null)
  const markersLayer = ref(null)
  const patrullasLayer = ref(null)
  const miUbicacion = ref(null)
  const miMarker = ref(null) //  exportar referencia al marker

  const pinIcon = L.icon({
    iconUrl: "/pin.png",
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
  })

  function initMap() {
    if (!mapContainer.value) return

    map.value = L.map(mapContainer.value).setView([19.1738, -96.1342], 12)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(map.value)

    markersLayer.value = L.layerGroup().addTo(map.value)
    patrullasLayer.value = L.layerGroup().addTo(map.value)

    obtenerUbicacion()
  }

  function obtenerUbicacion() {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        miUbicacion.value = L.latLng(latitude, longitude)

        // guardar referencia al marker
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

  onBeforeUnmount(() => {
    if (map.value) map.value.remove()
  })

  return {
    map,
    markersLayer,
    patrullasLayer,
    miUbicacion,
    miMarker //  exportar
  }
}