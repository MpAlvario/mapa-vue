import { ref } from "vue"
import L from "leaflet"

export function useMapPatrullas(map, patrullasLayer, trazarRutaDesdePatrulla, onRefrescar) {

  async function asignarPatrullaAPI(latIncidencia, lngIncidencia) {
    try {
      const res = await fetch("http://192.168.71.15:8080/terrestre/api_patrullas.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lat: latIncidencia,
          lng: lngIncidencia
        })
      })

      const data = await res.json()
      console.log("Asignar patrulla:", data)

      if (!data.success) {
        alert(data.error)
        return
      }

      const patrulla = data.patrulla

      await trazarRutaDesdePatrulla(
        parseFloat(patrulla.lat),
        parseFloat(patrulla.lng),
        latIncidencia,
        lngIncidencia
      )

      map.value.closePopup()
      onRefrescar()

    } catch (error) {
      console.error("Error asignando patrulla:", error)
    }
  }

  async function cargarPatrullasVisual() {
    try {
      const res = await fetch("http://192.168.71.15:8080/terrestre/api_patrullas.php?ts=" + Date.now())
      const json = await res.json()

      patrullasLayer.value.clearLayers()

      const lista = Array.isArray(json) ? json : json.data

      if (!lista) return

      lista.forEach(p => {
        const lat = parseFloat(p.lat)
        const lng = parseFloat(p.lng)

        if (isNaN(lat) || isNaN(lng)) return

        let color = "blue"
        if (p.estado?.toLowerCase() === "disponible") color = "green"
        if (p.estado?.toLowerCase() === "en camino") color = "red"

        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          color: color,
          fillOpacity: 0.9
        }).bindPopup(`
          🚓 Patrulla ${p.id}<br>
          Estado: ${p.estado}
        `)

        patrullasLayer.value.addLayer(marker)
      })

    } catch (error) {
      console.error("Error cargando patrullas:", error)
    }
  }

  return {
    asignarPatrullaAPI,
    cargarPatrullasVisual
  }
}