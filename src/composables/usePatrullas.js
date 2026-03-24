import { ref } from "vue"
import L from "leaflet"

const patrullaIcon = L.icon({
  iconUrl: "/IconPatrulla.png",
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [0, -45]
})

export function useMapPatrullas(map, patrullasLayer, trazarRutaDesdePatrulla, onRefrescar, onActualizarHeatmap, onRefrescarIncidencias) {

  const animacionesActivas = new Set()

  async function asignarPatrullaAPI(latIncidencia, lngIncidencia, incidenciaId) {
    try {
      const res = await fetch("http://192.168.71.200:8080/terrestre/api_despacho.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: latIncidencia, lng: lngIncidencia })
      })

      const data = await res.json()
      if (!data.success) { alert("No hay patrullas disponibles"); return }

      const resPatrullas = await fetch("http://192.168.71.200:8080/terrestre/api_patrullas.php?ts=" + Date.now())
      const jsonPatrullas = await resPatrullas.json()
      const lista = Array.isArray(jsonPatrullas) ? jsonPatrullas : jsonPatrullas.data
      const patrulla = lista.find(p => String(p.id) === String(data.patrulla_id))

      if (!patrulla) return console.error("No se encontró la patrulla asignada")

      const latOrigen = parseFloat(patrulla.lat)
      const lngOrigen = parseFloat(patrulla.lng)

      //  Quitar marker estático antes de animar  //se modifico
      const layersAEliminar = []

      patrullasLayer.value.eachLayer(layer => {
      const id = layer?.options?.patrullaId
        if (!id || !animacionesActivas.has(String(id))) {
        layersAEliminar.push(layer)
  }
})

layersAEliminar.forEach(layer => {
  patrullasLayer.value.removeLayer(layer)
})

      const resRuta = await fetch("http://192.168.71.200:8080/terrestre/api_ruta.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat1: latOrigen,
          lng1: lngOrigen,
          lat2: latIncidencia,
          lng2: lngIncidencia
        })
      })

      const dataRuta = await resRuta.json()
      if (!dataRuta.routes || dataRuta.routes.length === 0) return alert("No se encontró ruta")

      const coordenadas = dataRuta.routes[0].geometry.coordinates

      if (map.value) map.value.closePopup()

      const rutaLayer = L.polyline(coordenadas.map(c => [c[1], c[0]]), {
        color: "#3b82f6",
        weight: 4,
        opacity: 0.8,
        dashArray: "8, 8"
      }).addTo(map.value)

      const marker = L.marker([latOrigen, lngOrigen], {
        icon: patrullaIcon,
        patrullaId: String(patrulla.id),
        zIndexOffset: 1000
      })
        .bindPopup(`<b>🚓 Patrulla ${patrulla.id}</b><br><span style="color:#3b82f6">En camino a incidencia...</span>`)
        .addTo(patrullasLayer.value)

      animacionesActivas.add(String(patrulla.id))

      // Guardar zoom y centro originales para restaurar al terminar
      const zoomOriginal = map.value.getZoom()
      const centroOriginal = map.value.getCenter()

      // ── Fase 1: ir ──
      await moverMarcador(marker, coordenadas)

      await fetch("http://192.168.71.200:8080/terrestre/api_resolver_incidencia.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: incidenciaId })
      })

      // Solo actualiza incidencias y heatmap 
      onRefrescarIncidencias?.()
      onActualizarHeatmap?.()

      rutaLayer.setStyle({ color: "#10b981", dashArray: null, opacity: 1 })
      marker.getPopup().setContent(`<b>🚓 Patrulla ${patrulla.id}</b><br><span style="color:#10b981">Atendiendo incidencia...</span>`)
      marker.openPopup()

      await esperar(3000)

      // ── Fase 2: regresar ──
      marker.closePopup()
      rutaLayer.setStyle({ color: "#f59e0b", dashArray: "8, 8", opacity: 0.7 })
      marker.getPopup().setContent(`<b>🚓 Patrulla ${patrulla.id}</b><br><span style="color:#f59e0b">Regresando a base...</span>`)

      await moverMarcador(marker, [...coordenadas].reverse())

      marker.setLatLng([latOrigen, lngOrigen])

      if (map.value && map.value.hasLayer(rutaLayer)) map.value.removeLayer(rutaLayer)
      if (patrullasLayer.value) patrullasLayer.value.removeLayer(marker)

      await fetch("http://192.168.71.200:8080/terrestre/api_actualizar_estado.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: patrulla.id, estado: "Disponible" })
      })

      animacionesActivas.delete(String(patrulla.id))

      // Restaurar zoom y centro originales al terminar la animación
      if (map.value) {
        map.value.setView(centroOriginal, zoomOriginal, {
          animate: true,
          duration: 1.2
        })
      }

      //  Ahora sí refresca todo — la animación ya terminó
      onRefrescar()

    } catch (error) {
      console.error("Error asignando patrulla:", error)
    }
  }

  async function cargarPatrullasVisual() {
    try {
      const res = await fetch("http://192.168.71.200:8080/terrestre/api_patrullas.php?ts=" + Date.now())
      const json = await res.json()

      const lista = Array.isArray(json) ? json : json.data
      if (!lista) return

      patrullasLayer.value.eachLayer(layer => {
        const id = layer?.options?.patrullaId
        if (!id || !animacionesActivas.has(String(id))) {
          patrullasLayer.value.removeLayer(layer)
        }
      })

      lista.forEach(p => {
        if (animacionesActivas.has(String(p.id))) return

        const lat = parseFloat(p.lat)
        const lng = parseFloat(p.lng)
        if (isNaN(lat) || isNaN(lng)) return

        const marker = L.marker([lat, lng], {
          icon: patrullaIcon,
          patrullaId: String(p.id)
        }).bindPopup(`
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

  function seguirMarcador(marker, mapInstance, zoom = 16) {
    if (!mapInstance) return
    mapInstance.setView(marker.getLatLng(), zoom, {
      animate: true,
      duration: 0.8,
      easeLinearity: 0.5
    })
  }

  function moverMarcador(marker, coordenadas) {
    return new Promise((resolve) => {
      let i = 0
      let ultimoTiempo = null
      const intervalo = 120 // ms entre cada paso

      function paso(timestamp) {
        if (!map.value) { resolve(); return }
        if (i >= coordenadas.length) { resolve(); return }

        // Solo avanza si ya pasaron los ms del intervalo
        if (!ultimoTiempo || timestamp - ultimoTiempo >= intervalo) {
          const [lng, lat] = coordenadas[i]
          marker.setLatLng([lat, lng])
          seguirMarcador(marker, map.value, 16)
          ultimoTiempo = timestamp
          i++
        }

        requestAnimationFrame(paso)
      }

      requestAnimationFrame(paso)
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