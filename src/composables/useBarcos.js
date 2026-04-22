import L from "leaflet"
import { API } from "@/config/api"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "",
  iconUrl: "",
  shadowUrl: "",
})


const barcoIcon = L.icon({
  iconUrl: "/Barco.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
})

export function useBarcos(map, popupBase, eventosPopup) {

  let markers = {}

  async function cargarBarcos() {

    try {

      const res = await fetch(
        `${API.proyecto.barcos()}?ts=${Date.now()}`//link Url
      )

      const json = await res.json()

      console.log("Datos barcos:", json)

      if (!json.ok) return

      json.data.forEach(barco => {

        const lat = parseFloat(barco.latitud)
        const lon = parseFloat(barco.longitud)

        if (!lat || !lon) return

        if (markers[barco.codigo]) {

          markers[barco.codigo].setLatLng([lat, lon])

          if (!markers[barco.codigo].isPopupOpen()) {
            markers[barco.codigo].setPopupContent(popupBase(barco))
          }

        } else {

          const marker = L.marker([lat, lon], { icon: barcoIcon })
            .addTo(map)
            .bindPopup(popupBase(barco))

          marker.on("popupopen", e => {
            eventosPopup(e, barco)
          })

          markers[barco.codigo] = marker
        }

      })

    } catch (error) {
      console.error("Error cargando barcos:", error)
    }

  }

  return { cargarBarcos, markers }
}