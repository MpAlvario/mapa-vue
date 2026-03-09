import { ref } from "vue"
import L from "leaflet"
import "leaflet.heat"

export function useMapHeatmap(map) {
  const heatLayer = ref(null)

  async function cargarHeatmap() {
    const url = "http://192.168.71.15:8080/terrestre/api_heatmap.php?minutos=100000&limit=5000"

    const res = await fetch(url)
    const json = await res.json()

    console.log("Respuesta:", json)

    if (!json.ok) return

    const puntos = json.data.map(item => [
      parseFloat(item.lat),
      parseFloat(item.lng),
      item.severidad ? parseFloat(item.severidad) : 0.5
    ])

    if (heatLayer.value) {
      map.value.removeLayer(heatLayer.value)
    }

    heatLayer.value = L.heatLayer(puntos, {
      radius: 35,
      blur: 25,
      maxZoom: 18,
      minOpacity: 0.5
    }).addTo(map.value)
  }

  return {
    heatLayer,
    cargarHeatmap
  }
}