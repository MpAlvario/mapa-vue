// useAnimarPatrulla.js
import L from "leaflet"

const patrullaIcon = L.icon({
  iconUrl: "/IconPatrulla.png",
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [0, -45]
})

export function useAnimarPatrulla(map, patrullasLayer, onRefrescar) {

  async function animarPatrulla(patrullaData, incidenciaId, coordenadas) {
    // Crear marker de la patrulla en su posición inicial
    const [primerLng, primerLat] = coordenadas[0]
    const marker = L.marker([primerLat, primerLng], { icon: patrullaIcon })
      .bindPopup(`🚓 Patrulla ${patrullaData.id} en camino...`)
      .addTo(map.value)

    // Guardar referencia al marker para poder removerlo
    const patrulla = {
      id: patrullaData.id,
      marker,
      rutaLayer: null
    }

    let i = 0

    await new Promise((resolve) => {
      const intervalo = setInterval(async () => {

        //  Llegó al destino
        if (i >= coordenadas.length) {
          clearInterval(intervalo)

          // Remover línea de ruta si existe
          if (patrulla.rutaLayer) {
            map.value.removeLayer(patrulla.rutaLayer)
            patrulla.rutaLayer = null
          }

          // 1. Marcar incidencia como resuelta
          await fetch("http://192.168.71.200:8080/terrestre/api_resolver_incidencia.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: incidenciaId })
          })

          // 2. Cambiar estado patrulla a "Atendiendo"
          await fetch("http://192.168.71.200:8080/terrestre/api_actualizar_estado.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: patrulla.id, estado: "Atendiendo" })
          })

          // 3. Después de 10s volver a "Disponible" y refrescar mapa
          setTimeout(async () => {
            await fetch("http://192.168.71.200:8080/terrestre/api_actualizar_estado.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: patrulla.id, estado: "Disponible" })
            })

            // Remover marker de animación del mapa
            map.value.removeLayer(marker)

            // Refrescar incidencias y patrullas en el mapa
            onRefrescar()
          }, 10000)

          resolve()
          return
        }

        // 🚗 Mover marker al siguiente punto de la ruta
        const [lng, lat] = coordenadas[i]
        marker.setLatLng([lat, lng])
        i++

      }, 40) // velocidad de animación (ms por paso)
    })
  }

  return { animarPatrulla }
}