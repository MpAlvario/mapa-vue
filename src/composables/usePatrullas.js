// src/composables/useMapPatrullas.js
import { ref } from "vue"
import L from "leaflet"
import { API } from "@/config/api"
import { usePolygonZones } from "@/composables/usePolygonZones"

const { getZoneForCoords } = usePolygonZones()

// ─── helpers de distancia ─────────────────────────────────────────────────────
function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── iconos ───────────────────────────────────────────────────────────────────
function crearIconoPatrulla(estado = "Disponible", sirena = false) {
  let clase = "patrulla-disponible"
  if (estado === "En camino")  clase = "patrulla-en-camino"
  if (estado === "Atendiendo") clase = "patrulla-atendiendo"
  if (estado === "Regresando") clase = "patrulla-regresando"
  const claseSirena = sirena ? " sirena" : ""
  return L.divIcon({
    className: "contenedor-patrulla",
    html: `<div class="patrulla ${clase}${claseSirena}"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })
}

// ─── popups ───────────────────────────────────────────────────────────────────
const popupEnCamino      = (id, dest)  => `<b>🚓 Patrulla ${id}</b><br>🔴 En camino a: <i>${dest}</i>`
const popupFinalizadoYendo = id        => `<b>🚓 Patrulla ${id}</b><br>✅ Finalizado<br>➡️ Yendo a incidencia más cercana…`
const popupResuelta      = id          => `<b>🚓 Patrulla ${id}</b><br>✅ Incidencia resuelta`
const popupDisponible    = id          => `<b>🚓 Patrulla ${id}</b><br>🟢 Disponible`

// ─── composable ───────────────────────────────────────────────────────────────
export function useMapPatrullas(
  map,
  patrullasLayer,
  trazarRutaDesdePatrulla,
  onRefrescar,
  onActualizarHeatmap,
  onRefrescarIncidencias,
  onIncidenciaResuelta
) {
  const animacionesActivas = new Set()
  const bloquearRefresh    = ref(false)
  const posicionesFinales  = new Map()

  // ── asignar (entrada principal) ──────────────────────────────────────────
  async function asignarPatrullaAPI(latIncidencia, lngIncidencia, incidenciaId) {
    try {
      const zonaIncidencia = getZoneForCoords(latIncidencia, lngIncidencia)
      if (!zonaIncidencia) {
        alert("La incidencia no esta dentro de un poligono asignado")
        return
      }

      const patrulla = await buscarPatrullaDisponibleMasCercana(
        latIncidencia,
        lngIncidencia,
        zonaIncidencia
      )

      if (!patrulla) {
        alert("No hay patrullas disponibles dentro del poligono de esta incidencia")
        return
      }

      const res = await fetch(API.terrestre.despacho(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: latIncidencia,
          lng: lngIncidencia,
          incidencia_id: incidenciaId,
          patrulla_id: patrulla.id,
          zona: zonaIncidencia
        })
      })
      const data = await res.json()
      if (!data.success) { alert("No hay patrullas disponibles"); return }

      if (data.patrulla_id && String(data.patrulla_id) !== String(patrulla.id)) {
        console.warn(
          `El backend devolvio patrulla ${data.patrulla_id}, pero se usara la patrulla ${patrulla.id} por cercania y zona.`
        )
      }

      limpiarMarkerPatrulla(patrulla.id)
      const marker = crearMarkerActivo(patrulla)
      animacionesActivas.add(String(patrulla.id))

      await cicloPatrulla(
        patrulla, marker,
        parseFloat(latIncidencia), parseFloat(lngIncidencia),
        incidenciaId
      )
    } catch (error) {
      console.error(error)
    }
  }

  // ── ciclo completo ────────────────────────────────────────────────────────
  async function cicloPatrulla(patrulla, marker, latDestino, lngDestino, incidenciaId) {
    // Bloquear refresh durante TODO el ciclo de la patrulla  
    bloquearRefresh.value = true 
    // 1) ir a la incidencia asignada
    actualizarPopup(marker, popupEnCamino(patrulla.id, `#${incidenciaId}`))
    marker.setIcon(crearIconoPatrulla("En camino", true))
    const llegoAIncidencia = await moverPatrullaARuta(marker, latDestino, lngDestino, "#3b82f6")
    if (!llegoAIncidencia) {
      await finalizarPatrulla(patrulla, marker)
      return
    }

    marker.setIcon(crearIconoPatrulla("Atendiendo", false))
    actualizarPopup(marker, popupResuelta(patrulla.id))
    const resResolver = await fetch(API.terrestre.resolverIncidencia(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: incidenciaId })
    })
    if (resResolver.ok) onIncidenciaResuelta?.(incidenciaId)
    await esperar(600)
    onRefrescarIncidencias?.()
    await esperar(1900)

    // 2) buscar siguiente en su zona
    const siguiente = await buscarIncidenciaDeSuPoligono(patrulla, marker, incidenciaId)

    if (siguiente) {
      actualizarPopup(marker, popupFinalizadoYendo(patrulla.id))
      marker.setIcon(crearIconoPatrulla("En camino", true))

      const llegoASiguiente = await moverPatrullaARuta(
        marker,
        parseFloat(siguiente.latitud),
        parseFloat(siguiente.longitud),
        "#f59e0b"
      )

      if (!llegoASiguiente) {
        await finalizarPatrulla(patrulla, marker)
        return
      }

      marker.setIcon(crearIconoPatrulla("Atendiendo", false))
      actualizarPopup(marker, popupResuelta(patrulla.id))
      const resResolverSiguiente = await fetch(API.terrestre.resolverIncidencia(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: siguiente.id })
      })
      if (resResolverSiguiente.ok) onIncidenciaResuelta?.(siguiente.id)
      await esperar(600)
      onRefrescarIncidencias?.()
      await esperar(1900)
    }

    // 3) quedar disponible donde está
    await finalizarPatrulla(patrulla, marker)
  }

  // ── buscar siguiente incidencia EN LA MISMA ZONA ─────────────────────────
  async function buscarIncidenciaDeSuPoligono(patrulla, marker, incidenciaAnteriorId = null) {
    try {
      const res  = await fetch(API.terrestre.incidencias())
      const json = await res.json()
      const lista = Array.isArray(json) ? json : json.data
      if (!lista?.length) return null

      const pos = marker.getLatLng()

      // Zona de la patrulla según su posición actual
      const zonaPatrulla = getZoneForCoords(pos.lat, pos.lng)
      if (!zonaPatrulla) return null

      const candidatas = lista
        .filter(inc => {
          // Excluir la que acabamos de resolver
          if (String(inc.id) === String(incidenciaAnteriorId)) return false
          // Solo incidencias pendientes (ajusta el campo según tu modelo)
          if (inc.estado && inc.estado !== "pendiente") return false
          // Verificar que pertenezca a la misma zona
          const zonaInc = getZoneForCoords(
            parseFloat(inc.latitud),
            parseFloat(inc.longitud)
          )
          return zonaInc && zonaInc === zonaPatrulla
        })
        .sort((a, b) => {
          const sevA = parseInt(a.severidad) || 0
          const sevB = parseInt(b.severidad) || 0
          if (sevA !== sevB) return sevB - sevA

          const dA = distanciaKm(pos.lat, pos.lng, parseFloat(a.latitud), parseFloat(a.longitud))
          const dB = distanciaKm(pos.lat, pos.lng, parseFloat(b.latitud), parseFloat(b.longitud))
          return dA - dB
        })

      console.log(`[Patrulla ${patrulla.id}] zona: ${zonaPatrulla}, candidatas: ${candidatas.length}`)
      return candidatas[0] ?? null

    } catch (e) {
      console.error(e)
      return null
    }
  }

  // ── finalizar ─────────────────────────────────────────────────────────────
  async function finalizarPatrulla(patrulla, marker) {
    const pos = marker.getLatLng()

    bloquearRefresh.value = true
    posicionesFinales.set(String(patrulla.id), pos)

    await fetch(API.terrestre.actualizarEstado(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: patrulla.id, estado: "disponible", lat: pos.lat, lng: pos.lng })
    })

    marker.setIcon(crearIconoPatrulla("Disponible", false))
    actualizarPopup(marker, popupDisponible(patrulla.id))
    animacionesActivas.delete(String(patrulla.id))

    setTimeout(() => { bloquearRefresh.value = false }, 4000)
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  function crearMarkerActivo(patrulla) {
    return L.marker([parseFloat(patrulla.lat), parseFloat(patrulla.lng)], {
      icon: crearIconoPatrulla("En camino", false),
      patrullaId: String(patrulla.id),
      zIndexOffset: 1000
    }).addTo(patrullasLayer.value)
  }

  function actualizarPopup(marker, html) {
    if (marker.getPopup()) marker.getPopup().setContent(html)
    else marker.bindPopup(html)
    if (marker.isPopupOpen()) marker.openPopup()
  }

  function limpiarMarkerPatrulla(idBuscado) {
    patrullasLayer.value.eachLayer(layer => {
      if (String(layer?.options?.patrullaId) === String(idBuscado))
        patrullasLayer.value.removeLayer(layer)
    })
  }

  async function buscarPatrullaDisponibleMasCercana(latIncidencia, lngIncidencia, zonaIncidencia) {
    const resPat  = await fetch(`${API.terrestre.patrullas()}?ts=${Date.now()}`)
    const jsonPat = await resPat.json()
    const lista   = Array.isArray(jsonPat) ? jsonPat : jsonPat.data
    if (!lista?.length) return null

    return lista
      .filter(p => {
        const lat = parseFloat(p.lat)
        const lng = parseFloat(p.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
        if (!estaDisponible(p)) return false
        return getZoneForCoords(lat, lng) === zonaIncidencia
      })
      .sort((a, b) => {
        const dA = distanciaKm(latIncidencia, lngIncidencia, parseFloat(a.lat), parseFloat(a.lng))
        const dB = distanciaKm(latIncidencia, lngIncidencia, parseFloat(b.lat), parseFloat(b.lng))
        return dA - dB
      })[0] ?? null
  }

  function estaDisponible(patrulla) {
    const estado = String(patrulla.estado ?? "disponible").toLowerCase().trim()
    return estado === "disponible"
  }

  async function moverPatrullaARuta(marker, latDestino, lngDestino, colorRuta) {
    const origen = marker.getLatLng()
    const zonaOrigen = getZoneForCoords(origen.lat, origen.lng)
    const zonaDestino = getZoneForCoords(latDestino, lngDestino)

    if (!zonaOrigen || !zonaDestino || zonaOrigen !== zonaDestino) {
      alert("La patrulla no puede salir de su poligono asignado")
      return false
    }

    const resRuta = await fetch(API.terrestre.ruta(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat1: origen.lat, lng1: origen.lng, lat2: latDestino, lng2: lngDestino })
    })
    const data = await resRuta.json()
    if (!data.routes?.length) return false

    const coords = data.routes[0].geometry.coordinates
    const ruta = L.polyline(coords.map(c => [c[1], c[0]]), {
      color: colorRuta, weight: 4, opacity: 0.8, dashArray: "8,8"
    }).addTo(map.value)

    await moverMarcador(marker, coords)
    if (map.value.hasLayer(ruta)) map.value.removeLayer(ruta)
    return true
  }

  async function cargarPatrullasVisual() {
    try {
      const res  = await fetch(`${API.terrestre.patrullas()}?ts=${Date.now()}`)
      const json = await res.json()
      const lista = Array.isArray(json) ? json : json.data

      lista.forEach(p => {
        if (animacionesActivas.has(String(p.id))) return
        const lat = parseFloat(p.lat)
        const lng = parseFloat(p.lng)
        if (isNaN(lat) || isNaN(lng)) return

        let markerExistente = null
        patrullasLayer.value.eachLayer(layer => {
          if (String(layer?.options?.patrullaId) === String(p.id)) markerExistente = layer
        })

        if (markerExistente) {
          markerExistente.setIcon(crearIconoPatrulla(p.estado))
          const posActual = markerExistente.getLatLng()
          if (Math.abs(posActual.lat - lat) > 0.0001 || Math.abs(posActual.lng - lng) > 0.0001)
            markerExistente.setLatLng([lat, lng])
        } else {
          L.marker([lat, lng], {
            icon: crearIconoPatrulla(p.estado),
            patrullaId: String(p.id)
          }).bindPopup(popupDisponible(p.id)).addTo(patrullasLayer.value)
        }
      })
    } catch (error) {
      console.error(error)
    }
  }

  function moverMarcador(marker, coordenadas) {
    return new Promise(resolve => {
      let i = 0, ultimo = null
      const intervalo = 120
      function paso(t) {
        if (i >= coordenadas.length) { resolve(); return }
        if (!ultimo || t - ultimo >= intervalo) {
          const [lng, lat] = coordenadas[i]
          marker.setLatLng([lat, lng])
          ultimo = t; i++
        }
        requestAnimationFrame(paso)
      }
      requestAnimationFrame(paso)
    })
  }

  function esperar(ms) { return new Promise(r => setTimeout(r, ms)) }

  return { asignarPatrullaAPI, cargarPatrullasVisual, bloquearRefresh }
}
