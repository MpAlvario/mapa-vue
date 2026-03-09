<template>
  <div class="map-container">

    <!-- PANEL -->
    <div class="panel">
      <h3>Heatmap</h3>

      <button class="btn-global" @click="activarHeatmapGlobal">
        Heatmap Global
      </button>

      <button class="btn-barco" @click="activarHeatmapBarco">
        Heatmap Barco Seleccionado
      </button>

      <button class="btn-apagar" @click="apagarHeatmap">
        Apagar Heatmap
      </button>

      <div class="info">
        Modo actual: <b>{{ modoHeatmap === 'global' ? 'Global' : 'Barco' }}</b><br>
        Barco seleccionado: <b>{{ barcoSeleccionado ?? 'Ninguno' }}</b>
      </div>
    </div>

    <!-- MAPA -->
    <div ref="mapRef" class="map"></div>

  </div>
</template>

<script>

import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.heat/dist/leaflet-heat.js"

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
})

export default {
  name: "MonitoreoMap",

  data() {
    return {
      map: null,
      heatLayer: null,
      markers: {},
      rutas: {},
      barcoSeleccionado: null,
      primerZoomHecho: false,
      modoHeatmap: "global",
      intervalId: null
    }
  },

  mounted() {
    this.initMap()
    this.cargarBarcos()
    this.activarHeatmapGlobal()

    this.intervalId = setInterval(() => {
      this.cargarBarcos()
      this.actualizarHistorialSeleccionado()
      this.cargarHeatmap()
    }, 5000)
  },

  beforeUnmount() {
    clearInterval(this.intervalId)
  },

  methods: {

    initMap() {
      this.map = L.map(this.$refs.mapRef).setView([19.5, -95.5], 8)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap"
      }).addTo(this.map)
    },

    popupBase(barco) {
      return `
        <b>${barco.codigo}</b><br>
        <b>Timestamp:</b> ${barco.timestamp}<br>
        <b>Velocidad:</b> ${barco.velocidad ?? "N/A"}<br>
        <b>Rumbo:</b> ${barco.rumbo ?? "N/A"}<br>
        <b>Clima:</b> ${barco.clima ?? "N/A"}<br>
        <b>Riesgo:</b> ${barco.riesgo_colision ?? "N/A"}<br>

        <button class="btn-vermas">
          Ver más...
        </button>

        <button class="btn-cerrar">
          Cerrar
        </button>

        <div id="hist-${barco.codigo}" style="margin-top:8px;"></div>
      `
    },

    cerrarHistorial() {
      if (this.barcoSeleccionado && this.rutas[this.barcoSeleccionado]) {
        this.map.removeLayer(this.rutas[this.barcoSeleccionado])
        delete this.rutas[this.barcoSeleccionado]
      }

      this.barcoSeleccionado = null
      this.primerZoomHecho = false
    },

    async verHistorial(codigo, hacerZoom = true) {
      this.barcoSeleccionado = codigo

      const box = document.getElementById("hist-" + codigo)
      if (!box) return

      box.innerHTML = "Cargando..."

      try {
        const res = await fetch(
          "http://192.168.71.50:8080/proyecto/api_historial.php?codigo=" 
          + codigo + "&ts=" + Date.now(), {
           
            credentials: "omit" //para que viaje la sesión

          })

        const json = await res.json()
        const text = await res.text()
console.log("RESPUESTA CRUDA:", text)

        if (!json.ok) {
          box.innerHTML = "Error"
          return
        }

        if (!json.historial.length) {
          box.innerHTML = "Sin historial"
          return
        }

        box.innerHTML = json.historial.map((p, i) => `
          <div>
            <b>#${i + 1}</b><br>
            ${p.timestamp}<br>
            (${p.latitud}, ${p.longitud})
          </div>
        `).join("")

        const puntos = json.historial
          .slice()
          .reverse()
          .map(p => [parseFloat(p.latitud), parseFloat(p.longitud)])

        if (this.rutas[codigo]) {
          this.rutas[codigo].setLatLngs(puntos)
        } else {
          this.rutas[codigo] = L.polyline(puntos, { weight: 4 }).addTo(this.map)
        }

        if (hacerZoom && !this.primerZoomHecho) {
          this.primerZoomHecho = true
          this.map.fitBounds(this.rutas[codigo].getBounds(), { padding: [30, 30] })
        }

      } catch (err) {
        box.innerHTML = "Error cargando historial"
      }
    },

    async actualizarHistorialSeleccionado() {
      if (!this.barcoSeleccionado) return
      await this.verHistorial(this.barcoSeleccionado, false)
    },

   async cargarBarcos() {
  try {
    const url = "http://192.168.71.50:8080/proyecto/api_barco.php?ts=" + Date.now();
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("Error HTTP: " + res.status);
    }

    const json = await res.json();
    console.log("Datos barcos:", json);

    if (!json.ok) return;

    json.data.forEach(barco => {

      const lat = parseFloat(barco.latitud);
      const lon = parseFloat(barco.longitud);

      if (isNaN(lat) || isNaN(lon)) return;

      // Si el marker ya existe → solo lo movemos
      if (this.markers[barco.codigo]) {

        this.markers[barco.codigo].setLatLng([lat, lon]);
        this.markers[barco.codigo]
          .setPopupContent(this.popupBase(barco));

      } else {
        // Si no existe → lo creamos
        const marker = L.marker([lat, lon])
          .addTo(this.map)
          .bindPopup(this.popupBase(barco));

        this.markers[barco.codigo] = marker;
      }

    });

  } catch (error) {
    console.error("Error cargando barcos:", error);
  }
},

    apagarHeatmap() {
      if (this.heatLayer) {
        this.map.removeLayer(this.heatLayer)
        this.heatLayer = null
      }
    },

    activarHeatmapGlobal() {
      this.modoHeatmap = "global"
      this.cargarHeatmap()
    },

    activarHeatmapBarco() {
      if (!this.barcoSeleccionado) {
        alert("Selecciona un barco primero")
        return
      }

      this.modoHeatmap = "barco"
      this.cargarHeatmap()
    },

    interpolarRuta(puntos, pasos = 25) {
      let resultado = []

      for (let i = 0; i < puntos.length - 1; i++) {
        const p1 = puntos[i]
        const p2 = puntos[i + 1]

        for (let j = 0; j <= pasos; j++) {
          const t = j / pasos
          const lat = p1[0] + (p2[0] - p1[0]) * t
          const lon = p1[1] + (p2[1] - p1[1]) * t
          const inten = p1[2] + (p2[2] - p1[2]) * t
          resultado.push([lat, lon, inten])
        }
      }

      return resultado
    },

    async cargarHeatmap() {
      try {
        let url = "http://192.168.71.50:8080/proyecto/api_heatmap.php?ts=" 
          + Date.now()

        if (this.modoHeatmap === "barco" && this.barcoSeleccionado) {
          url += "&codigo=" + this.barcoSeleccionado
        }

        const res = await fetch(url)
        const json = await res.json()
        if (!json.ok) return

        let puntos = json.data.map(p => {
          let intensidad = parseFloat(p.riesgo_colision)
          if (isNaN(intensidad)) intensidad = 0.4

          return [
            parseFloat(p.latitud),
            parseFloat(p.longitud),
            intensidad
          ]
        })

        puntos = puntos.reverse()
        const puntosInterpolados = this.interpolarRuta(puntos, 35)

        if (this.heatLayer) {
          this.map.removeLayer(this.heatLayer)
        }

        this.heatLayer = L.heatLayer(puntosInterpolados, {
          radius: 8,
          blur: 8,
          maxZoom: 16
        }).addTo(this.map)

      } catch (err) {
        console.error(err)
      }
    }

  }
}
</script>

<style scoped>
.map-container {
  position: relative;
}

.map {
  height: 100vh;
  width: 100%;
}

.panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 9999;
  background: rgba(255,255,255,0.95);
  padding: 10px;
  border-radius: 12px;
  width: 260px;
}

.panel button {
  width: 100%;
  padding: 8px;
  margin-top: 6px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-global { background: #111; color: white; }
.btn-barco { background: #0a4aa6; color: white; }
.btn-apagar { background: #b00020; color: white; }

.info {
  margin-top: 8px;
  font-size: 13px;
}
</style>
