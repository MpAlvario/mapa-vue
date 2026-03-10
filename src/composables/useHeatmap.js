import { ref } from "vue"
import L from "leaflet"
import "leaflet.heat"

export function useMapHeatmap(map) {
  const heatLayer = ref(null)

  async function cargarHeatmap(minutos) {
    const url = "http://192.168.71.54:8080/terrestre/api_heatmap.php?minutos=1440&limit=5000"

    const res = await fetch(url)
    const json = await res.json()

    if (!json.ok) return

    const puntos = json.data
      .filter(item => {
        const lng = parseFloat(item.lng)
        return lng < -96.08  // ← excluye el mar al este
      })
      .map(item => [
        parseFloat(item.lat),
        parseFloat(item.lng),
        item.severidad ? parseFloat(item.severidad) / 5 : 0.1
      ])

    if (heatLayer.value) {
      map.value.removeLayer(heatLayer.value)
    }

    heatLayer.value = L.heatLayer(puntos, {
      radius: map.value.getZoom() < 14 ? 90 : 50,
      blur: 50,
      maxZoom: 18,
      minOpacity: 0.6,
      max: 5,
      gradient: {
        0.1: "blue",
        0.3: "lime",
        0.5: "yellow",
        0.7: "orange",
        1.0: "red"
      }
    }).addTo(map.value)
  }

  return {
    heatLayer,
    cargarHeatmap
  }
}