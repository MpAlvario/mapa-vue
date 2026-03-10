import L from "leaflet"

const incidenciaIcon = L.icon({
  iconUrl: "/IconIncidencia.png",
  iconSize: [40, 45],
  iconAnchor: [20, 45],
  popupAnchor: [0, -45]
})

export function useIncidencias(map, markersLayer, trazarRuta, asignarPatrullaAPI, despachar) {

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

          const btnRuta = popup.querySelector(".btnRuta")
          const btnAsignar = popup.querySelector(".btnAsignar")

          if (btnRuta) {
            btnRuta.onclick = () => trazarRuta(lat, lon)
          }

          if (btnAsignar) {
            btnAsignar.onclick = async () => {
              await asignarPatrullaAPI(lat, lon, inc.id) // 👈 asigna y anima hacia la incidencia
              await despachar(inc.id, lat, lon)          // 👈 luego regresa y queda disponible
            }
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