import { ref } from "vue"
import L from "leaflet"
import "leaflet-routing-machine"
import "leaflet-routing-machine/dist/leaflet-routing-machine.css"

export function useRouting(map, miUbicacion, miMarker, hayRuta) {

  const routingControl = ref(null)

  async function trazarRuta(destLat, destLon) {
    if (!miUbicacion.value) {
      alert("No se pudo obtener tu ubicación")
      return
    }

    try {
      const res = await fetch("http://192.168.71.200:8080/terrestre/api_ruta.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat1: miUbicacion.value.lat,
          lng1: miUbicacion.value.lng,
          lat2: destLat,
          lng2: destLon
        })
      })

      const data = await res.json()

      if (!data.routes || data.routes.length === 0) {
        alert("No se encontró ruta")
        return
      }

      if (routingControl.value) {
        map.value.removeLayer(routingControl.value)
      }

      const coordenadas = data.routes[0].geometry.coordinates

      routingControl.value = L.polyline(coordenadas.map(c => [c[1], c[0]]), {
        weight: 5
      }).addTo(map.value)

      map.value.fitBounds(routingControl.value.getBounds())

      hayRuta.value = true //  mostrar botón

      await animarMarcador(coordenadas)

    } catch (error) {
      console.error("Error obteniendo ruta:", error)
    }
  }

  async function animarMarcador(coordenadas) {
    if (!miMarker.value) return

    await new Promise((resolve) => {
      let i = 0
      const intervalo = setInterval(() => {
        if (i >= coordenadas.length) {
          clearInterval(intervalo)

          if (routingControl.value) {
            map.value.removeLayer(routingControl.value)
            routingControl.value = null
          }

          hayRuta.value = false 

          resolve()
          return
        }
        const [lng, lat] = coordenadas[i]
        miMarker.value.setLatLng([lat, lng])
        miUbicacion.value = L.latLng(lat, lng)
        i++
      }, 40)
    })
  }

  function quitarRuta() {
    if (routingControl.value) {
      map.value.removeLayer(routingControl.value)
      routingControl.value = null
    }
    hayRuta.value = false 
  }

  async function trazarRutaDesdePatrulla(lat1, lng1, lat2, lng2) {
    try {
      const res = await fetch("http://192.168.71.200:8080/terrestre/api_ruta.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat1, lng1, lat2, lng2 })
      })

      const data = await res.json()

      if (!data.routes || data.routes.length === 0) {
        alert("No se encontró ruta")
        return null
      }

      const coordenadas = data.routes[0].geometry.coordinates

      if (routingControl.value) {
        map.value.removeLayer(routingControl.value)
      }

      routingControl.value = L.polyline(coordenadas.map(c => [c[1], c[0]]), {
        weight: 6
      }).addTo(map.value)

      map.value.fitBounds(routingControl.value.getBounds())

      return coordenadas

    } catch (error) {
      console.error("Error trazando ruta:", error)
      return null
    }
  }

  return {
    routingControl,
    trazarRuta,
    trazarRutaDesdePatrulla,
    quitarRuta
  }
}