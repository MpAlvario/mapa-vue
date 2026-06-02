import { ref } from "vue"
import L from "leaflet"
import "leaflet.heat"
import { API } from "@/config/api"
import { usePolygonZones } from "@/composables/usePolygonZones"

const { getZoneForCoords } = usePolygonZones()

export function useMapHeatmap(map) {
  const heatLayer = ref(null)

  async function cargarHeatmap(minutos) {
    //  FIX 1: No intentar dibujar si el mapa no existe
    if (!map.value) return

    // FIX 2: No intentar dibujar si el contenedor tiene ancho 0
    // (ocurre cuando el componente está oculto con v-show)
    const container = map.value.getContainer()
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) return

    try {
      const url = `${API.terrestre.heatmap()}?minutos=${minutos}&limit=1000&ts=${Date.now()}` //link Url
      const res = await fetch(url)
      if (!res.ok) return

      const response = await res.json()

      //  FIX 3: Segunda verificación post-await por si el mapa
      // fue destruido o el componente se ocultó mientras esperábamos
      if (!map.value) return
      const containerCheck = map.value.getContainer()
      if (!containerCheck || containerCheck.offsetWidth === 0) return

      if (!response.ok) return

      // Transformar objetos a arrays que leaflet.heat entiende
      const puntos = response.data
        .map(item => {
          const lat = parseFloat(item.lat)
          const lng = parseFloat(item.lng)
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !getZoneForCoords(lat, lng)) return null

          return [
            lat,
            lng,
            item.severidad ? item.severidad / 5 : 0.1
          ]
        })
        .filter(Boolean)

      if (heatLayer.value && map.value.hasLayer(heatLayer.value)) {
        map.value.removeLayer(heatLayer.value)
        heatLayer.value = null
      }

      heatLayer.value = L.heatLayer(puntos, {
        radius: map.value.getZoom() < 14 ? 45 : 28,
        blur: 28,
        maxZoom: 18,
        minOpacity: 0.25,
        max: 3,
        gradient: {
          0.15: "blue",
          0.35: "lime",
          0.6: "yellow",
          0.85: "orange",
          1.0: "red"
        }
      }).addTo(map.value)

    } catch (error) {
      console.error("Error cargando heatmap:", error)
    }
  }

  return {
    heatLayer,
    cargarHeatmap
  }
}
