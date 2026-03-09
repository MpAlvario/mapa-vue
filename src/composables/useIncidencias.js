import L from "leaflet"

export function useIncidencias(map, markersLayer, trazarRuta, asignarPatrullaAPI) {

  function colorPorSeveridad(sev) {
    if (sev >= 5) return "darkred"
    if (sev === 4) return "red"
    if (sev === 3) return "orange"
    if (sev === 2) return "gold"
    return "green"
  }

  async function cargarIncidencias(tipo, minutos) {
    try {
      const url = `http://192.168.71.15:8080/terrestre/api_incidencias.php?tipo=${encodeURIComponent(tipo.value)}&minutos=${minutos.value}&limit=400&ts=${Date.now()}`

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

        const marker = L.circleMarker([lat, lon], {
          radius: 7,
          color: colorPorSeveridad(sev),
          fillOpacity: 0.9
        }).bindPopup(`
          <b>🚨 ${inc.tipo.toUpperCase()}</b><br>
          Severidad: ${sev}/5<br><br>
          <button class="btnRuta">Ir a incidencia</button>
          <button class="btnAsignar">Asinar patrulla </button>
        `)

        marker.on("popupopen", (e) => {
          const popup = e.popup.getElement()

          const btnRuta = popup.querySelector(".btnRuta")
          const btnAsignar = popup.querySelector(".btnAsignar")

          if (btnRuta) {
            btnRuta.onclick = () => trazarRuta(lat, lon)
          }

          if (btnAsignar) {
            btnAsignar.onclick = () => asignarPatrullaAPI(lat, lon)
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