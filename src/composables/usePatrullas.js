import { ref } from "vue"
import L from "leaflet"

const patrullaIcon = L.icon({
  iconUrl: "/IconPatrulla.png",
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [0, -45]
})

export function useMapPatrullas(map, patrullasLayer, trazarRutaDesdePatrulla, onRefrescar) {

  async function asignarPatrullaAPI(latIncidencia, lngIncidencia, incidenciaId) {
    try {
      const res = await fetch("http://192.168.71.54:8080/terrestre/api_despacho.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: latIncidencia, lng: lngIncidencia })
      })

      const data = await res.json()
      if (!data.success) { alert("No hay patrullas disponibles"); return }

      const resPatrullas = await fetch("http://192.168.71.54:8080/terrestre/api_patrullas.php?ts=" + Date.now())
      const jsonPatrullas = await resPatrullas.json()
      const lista = Array.isArray(jsonPatrullas) ? jsonPatrullas : jsonPatrullas.data
      const patrulla = lista.find(p => String(p.id) === String(data.patrulla_id))

      if (!patrulla) return console.error("No se encontró la patrulla asignada")

      const resRuta = await fetch("http://192.168.71.54:8080/terrestre/api_ruta.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat1: parseFloat(patrulla.lat),
          lng1: parseFloat(patrulla.lng),
          lat2: latIncidencia,
          lng2: lngIncidencia
        })
      })

      const dataRuta = await resRuta.json()
      if (!dataRuta.routes || dataRuta.routes.length === 0) return alert("No se encontró ruta")

      const coordenadas = dataRuta.routes[0].geometry.coordinates

      map.value.closePopup()

      const rutaLayer = L.polyline(coordenadas.map(c => [c[1], c[0]]), {
        color: "blue",
        weight: 4
      }).addTo(map.value)

      // ✅ Agregar al layerGroup, no directo al mapa
      const [primerLng, primerLat] = coordenadas[0]
      const marker = L.marker([primerLat, primerLng], { icon: patrullaIcon })
        .bindPopup(`🚓 Patrulla ${patrulla.id} en camino...`)
        .addTo(patrullasLayer.value)

      await moverMarcador(marker, coordenadas)

      await fetch("http://192.168.71.54:8080/terrestre/api_resolver_incidencia.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: incidenciaId })
      })

      marker.bindPopup(`🚓 Patrulla ${patrulla.id} atendiendo...`).openPopup()
      await esperar(5000)

      marker.bindPopup(`🚓 Patrulla ${patrulla.id} regresando...`).openPopup()
      await moverMarcador(marker, [...coordenadas].reverse())

      // ✅ Remover del layerGroup
      patrullasLayer.value.removeLayer(marker)
      map.value.removeLayer(rutaLayer)

      await fetch("http://192.168.71.54:8080/terrestre/api_actualizar_estado.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: patrulla.id, estado: "Disponible" })
      })

      onRefrescar()

    } catch (error) {
      console.error("Error asignando patrulla:", error)
    }
  }

  async function cargarPatrullasVisual() {
    try {
      const res = await fetch("http://192.168.71.54:8080/terrestre/api_patrullas.php?ts=" + Date.now())
      const json = await res.json()

      patrullasLayer.value.clearLayers()

      const lista = Array.isArray(json) ? json : json.data
      if (!lista) return

      lista.forEach(p => {
        const lat = parseFloat(p.lat)
        const lng = parseFloat(p.lng)
        if (isNaN(lat) || isNaN(lng)) return

        const marker = L.marker([lat, lng], { icon: patrullaIcon })
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 4px 0;">
              <b style="font-size:13px;">🚓 Patrulla ${p.id}</b>
              <p style="margin: 4px 0; font-size:12px; color:#6b7280;">
                Estado: ${p.estado}
              </p>
            </div>
          `)

        patrullasLayer.value.addLayer(marker)
      })

    } catch (error) {
      console.error("Error cargando patrullas:", error)
    }
  }

  function moverMarcador(marker, coordenadas) {
    return new Promise((resolve) => {
      let i = 0
      const intervalo = setInterval(() => {
        if (i >= coordenadas.length) {
          clearInterval(intervalo)
          resolve()
          return
        }
        const [lng, lat] = coordenadas[i]
        marker.setLatLng([lat, lng])
        i++
      }, 40)
    })
  }

  function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  return {
    asignarPatrullaAPI,
    cargarPatrullasVisual
  }
}