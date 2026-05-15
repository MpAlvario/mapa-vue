import L from "leaflet"
import { ref } from "vue"
import { API } from "@/config/api"
import { usePolygonZones } from "@/composables/usePolygonZones"

const incidenciasData = ref([])
const { getZoneForCoords } = usePolygonZones()

// ── Colores por tipo de incidencia ─────────────────────────────
const COLORES_INCIDENCIA = {
  robo:                 { color: "#E24B4A", borde: "#A32D2D" },
  asalto:               { color: "#A32D2D", borde: "#7a1e1e" },
  choque:               { color: "#EF9F27", borde: "#BA7517" },
  atropellamiento:      { color: "#BA7517", borde: "#8a5510" },
  volcadura:            { color: "#FAC775", borde: "#BA7517" },
  incendio:             { color: "#D85A30", borde: "#a03d1c" },
  inundacion:           { color: "#378ADD", borde: "#1f5fa8" },
  inundación:           { color: "#378ADD", borde: "#1f5fa8" },
  vehiculo_descompuesto:{ color: "#888780", borde: "#5a5955" },
}

const COLOR_DEFAULT = { color: "#888780", borde: "#5a5955" }

function iconoPorTipo(tipo) {
  const tipoNorm = tipo?.toLowerCase().trim() ?? ""
  const { color, borde } = COLORES_INCIDENCIA[tipoNorm] ?? COLOR_DEFAULT

  // Figuras SVG por categoría
  const figuras = {
    // ── Círculo: accidentes viales ──────────────────────────────
    choque:          `<circle cx="14" cy="14" r="11" fill="${color}" stroke="${borde}" stroke-width="2.5"/>`,
    atropellamiento: `<circle cx="14" cy="14" r="11" fill="${color}" stroke="${borde}" stroke-width="2.5"/>`,
    volcadura:       `<circle cx="14" cy="14" r="11" fill="${color}" stroke="${borde}" stroke-width="2.5"/>`,

    // ── Triángulo: violencia / seguridad ────────────────────────
    robo:   `<polygon points="14,2 26,25 2,25" fill="${color}" stroke="${borde}" stroke-width="2.5" stroke-linejoin="round"/>`,
    asalto: `<polygon points="14,2 26,25 2,25" fill="${color}" stroke="${borde}" stroke-width="2.5" stroke-linejoin="round"/>`,

    // ── Rombo: fuego ────────────────────────────────────────────
    incendio: `<polygon points="14,2 26,14 14,26 2,14" fill="${color}" stroke="${borde}" stroke-width="2.5" stroke-linejoin="round"/>`,

    // ── Cuadrado: fenómenos hídricos ────────────────────────────
    inundacion: `<rect x="3" y="3" width="22" height="22" rx="3" fill="${color}" stroke="${borde}" stroke-width="2.5"/>`,
    inundación: `<rect x="3" y="3" width="22" height="22" rx="3" fill="${color}" stroke="${borde}" stroke-width="2.5"/>`,

    // ── Rectángulo plano: operativos menores ────────────────────
    vehiculo_descompuesto: `<rect x="2" y="8" width="24" height="12" rx="3" fill="${color}" stroke="${borde}" stroke-width="2.5"/>`,
  }

  const shape = figuras[tipoNorm] ?? `<circle cx="14" cy="14" r="11" fill="${color}" stroke="${borde}" stroke-width="2.5"/>`

  return L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 28 28">${shape}</svg>`,
    iconSize:    [20, 20], //Tamaño del área del marker
    iconAnchor:  [10, 10], //Debe ser siempre la mitad de iconSize
    popupAnchor: [0, -18]  //Ajusta donde aparece el popup
  })
}

// Reutiliza el mismo icono de patrulla para el marcador animado
const patrullaIcon = L.icon({
  iconUrl: "/IconPatrulla.png",
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [0, -45]
})

export function useIncidencias(map, markersLayer, trazarRuta, asignarPatrullaAPI, miUbicacion, miMarker, bloquearRefresh) {

  // ── Animación "Ir a incidencia" ────────────────────────────────
  const animacionActiva = ref(false)

  function quitarMarkerIncidencia(incidenciaId) {
    if (!markersLayer.value) return false

    let markerRemovido = false

    markersLayer.value.eachLayer(layer => {
      if (String(layer?.options?.incidenciaId) === String(incidenciaId)) {
        if (layer.closePopup) layer.closePopup()
        markersLayer.value.removeLayer(layer)
        markerRemovido = true
      }
    })

    incidenciasData.value = incidenciasData.value.filter(
      inc => String(inc.id) !== String(incidenciaId)
    )

    return markerRemovido
  }

  async function irAIncidencia(latIncidencia, lngIncidencia, incidenciaId) {
    if (animacionActiva.value) return
    if (!miUbicacion.value) return alert("No se pudo obtener tu ubicación")

    const latOrigen = miUbicacion.value.lat
    const lngOrigen = miUbicacion.value.lng

    animacionActiva.value = true

    
    // Guardar zoom y centro originales para restaurar al terminar
    const zoomOriginal = map.value.getZoom()
    const centroOriginal = map.value.getCenter()

    // Ocultar pin estático
    if (miMarker.value && map.value.hasLayer(miMarker.value)) {
      map.value.removeLayer(miMarker.value)
    }

    // Pedir ruta
    const resRuta = await fetch(API.terrestre.ruta(), { //Link Url
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
    const resResolver = await fetch(API.terrestre.resolverIncidencia(), { //Link Url
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: incidenciaId })
    })
    if (resResolver.ok) quitarMarkerIncidencia(incidenciaId)

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

    // Restaurar zoom y centro originales al terminar la animación
    if (map.value) {
      map.value.setView(centroOriginal, zoomOriginal, {
        animate: true,
        duration: 1.2
      })
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
    return new Promise(resolve => {
      let i = 0
      let ultimoTiempo = null
      const intervalo = 120 // ms entre cada paso

      function paso(timestamp) {
        if (!map.value || !map.value.hasLayer(marker)) { resolve(); return }
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
      //link
      const url = `${API.terrestre.incidencias()}?tipo=${encodeURIComponent(tipo)}&minutos=${minutos}&limit=400&ts=${Date.now()}`
     console.log("URL FINAL:", url)
      const res = await fetch(url)
      if (!res.ok) throw new Error("Servidor no responde")

      const json = await res.json()
    //  console.log("RESPUESTA API:", json)
     // console.log("TOTAL DATA:", json?.data?.length)
     // console.log("INCIDENCIAS CON ZONA:", json.data.slice(0,5))

      if (!json.ok || !json.data) return 0

      const incidenciasEnPoligonos = json.data
        .map(inc => {
          const lat = parseFloat(inc.latitud)
          const lon = parseFloat(inc.longitud)
          const zona = getZoneForCoords(lat, lon)

          if (!Number.isFinite(lat) || !Number.isFinite(lon) || !zona) return null

          return {
            ...inc,
            latitud: lat,
            longitud: lon,
            zona
          }
        })
        .filter(Boolean)

      incidenciasData.value = incidenciasEnPoligonos

     if (markersLayer.value) {
     if (bloquearRefresh?.value) return incidenciasData.value.length  // ← no tocar markers
     markersLayer.value.clearLayers()
}

      incidenciasEnPoligonos.forEach(inc => {
        const lat = parseFloat(inc.latitud)
        const lon = parseFloat(inc.longitud)
        const sev = parseInt(inc.severidad)

        // ── Marker con ícono circular por tipo ──────────────────
        const marker = L.marker([lat, lon], {
          icon: iconoPorTipo(inc.tipo),
          incidenciaId: String(inc.id)
        })
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
          const btnRuta    = popup.querySelector(".btnRuta")
          const btnAsignar = popup.querySelector(".btnAsignar")

          if (btnRuta) {
            btnRuta.onclick = () => irAIncidencia(lat, lon, inc.id)
          }

          if (btnAsignar) {
            btnAsignar.onclick = async () => {
              if (!map.value) return

              map.value.closePopup()

              btnAsignar.disabled = true
              btnAsignar.innerText = "Asignando..."

              console.time("asignarPatrulla")

              try {
                const res = await asignarPatrullaAPI(lat, lon, inc.id)
                //await irAIncidencia(lat, lon, inc.id)
              } catch (e) {
                console.error(e)
              }

              console.timeEnd("asignarPatrulla")

              btnAsignar.innerText = "Asignado"
            }
          }
        })

        markersLayer.value.addLayer(marker)
      })

      return incidenciasEnPoligonos.length

    } catch (error) {
      console.error(error)
      return 0
    }
  }

  return {
    cargarIncidencias,
    quitarMarkerIncidencia,
    colorPorSeveridad,
    incidenciasData
  }
}
