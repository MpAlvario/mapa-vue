import { ref } from "vue"
import { API } from "@/config/api"

export function useDashboard(apiUrl = API.terrestre.incidencias()) {
  const cargando = ref(false)
  const stats    = ref(null)

  const TIPOS = [
    "asalto","atropellamiento","choque","incendio",
    "inundacion","robo","vehiculo_descompuesto","volcadura"
  ]

  const COLORES_TIPO = {
    robo:               { color: "#E24B4A", borde: "#A32D2D" },
    asalto:             { color: "#A32D2D", borde: "#7a1e1e" },
    choque:             { color: "#EF9F27", borde: "#BA7517" },
    atropellamiento:    { color: "#BA7517", borde: "#8a5510" },
    volcadura:          { color: "#FAC775", borde: "#BA7517" },
    incendio:           { color: "#D85A30", borde: "#a03d1c" },
    inundacion:         { color: "#378ADD", borde: "#1f5fa8" },
    inundación:         { color: "#378ADD", borde: "#1f5fa8" },
    vehiculo_descompuesto:{ color: "#888780", borde: "#5a5955" },
  }

  function _nivelRiesgo(sev) {
    const s = Number(sev)
    if (s >= 4) return "alto"
    if (s >= 3) return "medio"
    return "bajo"
  }

  async function cargarStats(minutos = 1440) {
    cargando.value = true
    console.log('Dashboard fetching:', `${apiUrl}?minutos=${minutos}`)

    try {
      const res  = await fetch(`${apiUrl}?minutos=${minutos}`)
      const json = await res.json()
      const data = json.data ?? []

      console.log('Dashboard total:', data.length)
      console.log('Dashboard primeros 3:', data.slice(0,3))
      console.log("DATA DASHBOARD:", data)

      const porTipo      = {}
      const porZona      = {}
      const porSeveridad = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

      let sevTotal = 0

      for (const inc of data) {
        const tipo = (inc.tipo ?? "otro").toLowerCase().trim()
        const zona = (inc.zona ?? "").toLowerCase().trim()
        const sev  = Number(inc.severidad) || 1

        // 🔹 Conteo por tipo
        porTipo[tipo] = (porTipo[tipo] ?? 0) + 1

        //  SOLO usamos zona del backend
        if (zona) {
          if (!porZona[zona]) {
            porZona[zona] = {
              total: 0,
              sevSum: 0,
              tipos: {}
            }
          }

          porZona[zona].total++
          porZona[zona].sevSum += sev
          porZona[zona].tipos[tipo] =
            (porZona[zona].tipos[tipo] ?? 0) + 1
        }

        porSeveridad[Math.min(sev, 5)]++
        sevTotal += sev
      }

      console.log("POR ZONA:", porZona)

      // 🔹 Ranking zonas
      const zonasRanking = Object.entries(porZona)
        .map(([nombre, d]) => {
          const tipoDom =
            Object.entries(d.tipos)
              .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-"

          const sevProm = d.total ? d.sevSum / d.total : 0

          return {
            nombre,
            total: d.total,
            tipoDom,
            sevProm,
            riesgo: _nivelRiesgo(sevProm)
          }
        })
        .sort((a, b) => b.total - a.total)

      // 🔹 Tipos
      const tipoLabels  = TIPOS.filter(t => porTipo[t])
      const tipoCounts  = tipoLabels.map(t => porTipo[t] ?? 0)
      const tipoColores = tipoLabels.map(
        t => COLORES_TIPO[t]?.color ?? "#888780"
      )

      const tipoMasFrecuente =
        tipoLabels[tipoCounts.indexOf(Math.max(...tipoCounts))] ?? "-"

      const sevPromGlobal =
        data.length ? (sevTotal / data.length).toFixed(1) : "0"

      const zonaMasActiva = zonasRanking[0]?.nombre ?? "-"

      stats.value = {
        total: data.length,
        sevPromGlobal,
        tipoMasFrecuente,
        zonaMasActiva,
        tipoLabels,
        tipoCounts,
        tipoColores,
        porSeveridad,
        zonasRanking,
        COLORES_TIPO,
      }

    } catch (err) {
      console.error("ERROR DASHBOARD:", err)
    } finally {
      cargando.value = false
    }
  }

  return { stats, cargando, cargarStats }
}