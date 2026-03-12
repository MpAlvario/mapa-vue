import L from "leaflet"
import { ref } from "vue"

const incidenciaIcon = L.icon({
  iconUrl: "/IconIncidencia.png",
  iconSize: [40, 45],
  iconAnchor: [20, 45],
  popupAnchor: [0, -45]
})

// Reutiliza el mismo icono de patrulla para el marcador animado
const patrullaIcon = L.icon({
  iconUrl: "/IconPatrulla.png",
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [0, -45]
})

export function useIncidencias(map, markersLayer, trazarRuta, asignarPatrullaAPI, miUbicacion, miMarker) {

  // ── Animación "Ir a incidencia" ────────────────────────────────
  const animacionActiva = ref(false)

  async function irAIncidencia(latIncidencia, lngIncidencia, incidenciaId) {
    if (animacionActiva.value) return
    if (!miUbicacion.value) return alert("No se pudo obtener tu ubicación")

    const latOrigen = miUbicacion.value.lat
    const lngOrigen = miUbicacion.value.lng

    animacionActiva.value = true

    // Ocultar pin estático
    if (miMarker.value && map.value.hasLayer(miMarker.value)) {
      map.value.removeLayer(miMarker.value)
    }

    // Pedir ruta
    const resRuta = await fetch("http://192.168.71.54:8080/terrestre/api_ruta.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat1: latOrigen, lng1: lngOrigen, lat2: latIncidencia, lng2: lngIncidencia })
    })

    const dataRuta = await resRuta.json()
    if (!dataRuta.routes?.length) {
      animacionActiva.value = false
      return alert("No se encontró ruta")
    }

    const coordenadas = dataRuta.routes[0].geometry.coordinates
    map.value.closePopup()

    // FASE 1 -> azul punteado (en camino)
    const rutaLayer = L.polyline(
      coordenadas.map(c => [c[1], c[0]]),
      { color: "#3b82f6", weight: 4, opacity: 0.8, dashArray: "8, 8" }
    ).addTo(map.value)

    const marker = L.marker([latOrigen, lngOrigen], { icon: patrullaIcon, zIndexOffset: 1000 })
      .bindPopup(`<b>📍 Tú</b><br><span style="color:#3b82f6">En camino a incidencia...</span>`)
      .addTo(map.value)

    await moverMarcador(marker, coordenadas)

    // Resolver incidencia
    await fetch("http://192.168.71.54:8080/terrestre/api_resolver_incidencia.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: incidenciaId })
    })

    // FASE 2 -> verde sólido (atendiendo)
    rutaLayer.setStyle({ color: "#10b981", dashArray: null, opacity: 1 })
    marker.getPopup().setContent(`<b>📍 Tú</b><br><span style="color:#10b981">Atendiendo incidencia...</span>`)
    marker.openPopup()

    await esperar(3000)

    // FASE 3 -> ámbar punteado (regresando)
    marker.closePopup()
    rutaLayer.setStyle({ color: "#f59e0b", dashArray: "8, 8", opacity: 0.7 })
    marker.getPopup().setContent(`<b>📍 Tú</b><br><span style="color:#f59e0b">Regresando...</span>`)

    await moverMarcador(marker, [...coordenadas].reverse())

    // Limpiar y restaurar
    if (map.value?.hasLayer(rutaLayer)) map.value.removeLayer(rutaLayer)
    if (map.value?.hasLayer(marker))    map.value.removeLayer(marker)

    if (miMarker.value) {
      miMarker.value.setLatLng(miUbicacion.value)
      miMarker.value.addTo(map.value)
    }

    animacionActiva.value = false
  }

  function moverMarcador(marker, coordenadas) {
    return new Promise(resolve => {
      let i = 0
      const intervalo = setInterval(() => {
        if (!map.value) { clearInterval(intervalo); resolve(); return }
        if (i >= coordenadas.length) { clearInterval(intervalo); resolve(); return }
        const [lng, lat] = coordenadas[i]
        marker.setLatLng([lat, lng])
        i++
      }, 50)
    })
  }

  function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  // ── Fin animación ──────────────────────────────────────────────

  function colorPorSeveridad(sev) {
    if (sev >= 5) return "darkred"
    if (sev === 4) return "red"
    if (sev === 3) return "orange"
    if (sev === 2) return "gold"
    return "green"
  }

  async function cargarIncidencias(tipo, minutos) {
    try {
      const url = `http://192.168.71.54:8080/terrestre/api_incidencias.php?tipo=${encodeURIComponent(tipo.value)}&minutos=${minutos.value}&limit=400&ts=${Date.now()}`

      const res = await fetch(url)
      if (!res.ok) throw new Error("Servidor no responde")

      const json = await res.json()

      if (markersLayer.value) {
        map.value.closePopup()
        markersLayer.value.clearLayers()
      }

      if (!json.ok || !json.data) return 0

      json.data.forEach(inc => {
        const lat = parseFloat(inc.latitud)
        const lon = parseFloat(inc.longitud)
        const sev = parseInt(inc.severidad)

        const marker = L.marker([lat, lon], { icon: incidenciaIcon })
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 4px 0;">
              <b style="font-size:13px; color:#1a1a2e;">🚨 ${inc.tipo.toUpperCase()}</b>
              <p style="margin: 4px 0 10px 0; font-size:12px; color:#6b7280;">Severidad: ${sev}/5</p>
              <div style="display:flex; gap:6px;">
                <button class="btnRuta" style="
                  padding: 7px 12px;
                  border-radius: 8px;
                  border: none;
                  background: #3b82f6;
                  color: white;
                  font-size: 12px;
                  font-weight: 600;
                  cursor: pointer;
                  box-shadow: 0 2px 8px rgba(59,130,246,0.4);
                ">Ir a incidencia</button>
                <button class="btnAsignar" style="
                  padding: 7px 12px;
                  border-radius: 8px;
                  border: none;
                  background: #ef4444;
                  color: white;
                  font-size: 12px;
                  font-weight: 600;
                  cursor: pointer;
                  box-shadow: 0 2px 8px rgba(239,68,68,0.4);
                ">Asignar patrulla</button>
              </div>
            </div>
          `)

        marker.on("popupopen", (e) => {
          const popup = e.popup.getElement()
          const btnRuta   = popup.querySelector(".btnRuta")
          const btnAsignar = popup.querySelector(".btnAsignar")

          if (btnRuta) {
            // <- Ahora llama irAIncidencia en vez de trazarRuta
            btnRuta.onclick = () => irAIncidencia(lat, lon, inc.id)
          }

          if (btnAsignar) {
            btnAsignar.onclick = () => asignarPatrullaAPI(lat, lon, inc.id)
          }
        })

        markersLayer.value.addLayer(marker)
      })

      return json.count

    } catch (error) {
      console.error(error)
      return 0
    }
  }

  return {
    cargarIncidencias,
    colorPorSeveridad
  }
}