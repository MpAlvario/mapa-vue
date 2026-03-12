import { ref } from "vue"
import L from "leaflet"
import "leaflet.heat"

export function useMapHeatmap(map) {
  const heatLayer = ref(null)

  async function cargarHeatmap(minutos) {
    try {
      const url = `http://192.168.71.54:8080/terrestre/api_heatmap.php?minutos=${minutos}&limit=1000&ts=${Date.now()}`
      const res = await fetch(url)
      if (!res.ok) return

      const response = await res.json()
      if (!response.ok) return

      // Transformar objetos a arrays que leaflet.heat entiende
      const puntos = response.data.map(item => [
        item.lat,
        item.lng,
        item.severidad ? item.severidad / 5 : 0.1
      ])

      if (heatLayer.value && map.value.hasLayer(heatLayer.value)) {
        map.value.removeLayer(heatLayer.value)
        heatLayer.value = null
      }

      heatLayer.value = L.heatLayer(puntos, {
        radius: map.value.getZoom() < 14 ? 90 : 50,
        blur: 50,
        maxZoom: 18,
        minOpacity: 0.6,
        max: 1,
        gradient: {
          0.1: "blue",
          0.3: "lime",
          0.5: "yellow",
          0.7: "orange",
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