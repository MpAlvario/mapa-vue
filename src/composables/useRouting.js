import { ref } from "vue"
import L from "leaflet"
import "leaflet-routing-machine"
import "leaflet-routing-machine/dist/leaflet-routing-machine.css"

export function useRouting(map, miUbicacion) {
  const routingControl = ref(null)

  async function trazarRuta(destLat, destLon) {
    if (!miUbicacion.value) {
      alert("No se pudo obtener tu ubicación")
      return
    }

    try {
      const res = await fetch("http://192.168.71.15:8080/terrestre/api_ruta.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lat1: miUbicacion.value.lat,
          lng1: miUbicacion.value.lng,
          lat2: destLat,
          lng2: destLon
        })
      })

      const data = await res.json()
      console.log("Respuesta API:", data)

      if (!data.routes || data.routes.length === 0) {
        alert("No se encontró ruta")
        return
      }

      const coordenadas = data.routes[0].geometry.coordinates.map(coord => [
        coord[1], // lat
        coord[0]  // lng
      ])

      if (routingControl.value) {
        map.value.removeLayer(routingControl.value)
      }

      routingControl.value = L.polyline(coordenadas, {
        weight: 5
      }).addTo(map.value)

      map.value.fitBounds(routingControl.value.getBounds())

    } catch (error) {
      console.error("Error obteniendo ruta:", error)
    }
  }

  async function trazarRutaDesdePatrulla(lat1, lng1, lat2, lng2) {
    try {
      const res = await fetch("http://192.168.71.15:8080/terrestre/api_ruta.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lat1: lat1,
          lng1: lng1,
          lat2: lat2,
          lng2: lng2
        })
      })

      const data = await res.json()

      if (!data.routes || data.routes.length === 0) {
        alert("No se encontró ruta")
        return
      }

      const coordenadas = data.routes[0].geometry.coordinates.map(coord => [
        coord[1],
        coord[0]
      ])

      if (routingControl.value) {
        map.value.removeLayer(routingControl.value)
      }

      routingControl.value = L.polyline(coordenadas, {
        weight: 6
      }).addTo(map.value)

      map.value.fitBounds(routingControl.value.getBounds())

    } catch (error) {
      console.error("Error trazando ruta:", error)
    }
  }

  return {
    routingControl,
    trazarRuta,
    trazarRutaDesdePatrulla
  }
}