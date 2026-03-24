<template>
  <div class="map-container">

    <!-- PANEL HEATMAP (izquierdo) -->
    <div class="panel panel-left">
      <h3>Heatmap</h3>
      <button class="btn-global" @click="activarHeatmapGlobal">Heatmap Global</button>
      <button class="btn-barco" @click="activarHeatmapBarco">Heatmap Barco Seleccionado</button>
      <button class="btn-apagar" @click="apagarHeatmap">Apagar Heatmap</button>
      <div class="info">
        Modo: <b>{{ modoHeatmap === 'global' ? 'Global' : 'Barco' }}</b><br>
        Barco: <b>{{ barcoSeleccionado ?? 'Ninguno' }}</b>
      </div>
    </div>

    <!-- PANEL BARCO (derecho, colapsable) -->
    <transition name="slide">
      <div
        v-if="panelBarco"
        class="panel panel-right"
        :class="{ 'panel-collapsed': panelColapsado }"
      >

        <!-- MODO COLAPSADO: solo muestra código + botones -->
        <div class="panel-header">
          <span class="panel-titulo">{{ panelBarco.codigo }}</span>
          <div class="header-btns">
            <button
              class="btn-icon"
              :title="panelColapsado ? 'Expandir info' : 'Minimizar (ver ruta)'"
              @click="panelColapsado = !panelColapsado"
            >
              {{ panelColapsado ? '▲' : '▼' }}
            </button>
            <button class="btn-icon btn-cerrar-x" title="Cerrar" @click="cerrarPanel">✕</button>
          </div>
        </div>

        <!-- CONTENIDO (oculto cuando colapsado) -->
        <template v-if="!panelColapsado">
          <div class="panel-info">
            <div class="info-fila"><span class="label">Timestamp</span><span>{{ panelBarco.timestamp }}</span></div>
            <div class="info-fila"><span class="label">Velocidad</span><span>{{ panelBarco.velocidad ?? 'N/A' }}</span></div>
            <div class="info-fila"><span class="label">Rumbo</span><span>{{ panelBarco.rumbo ?? 'N/A' }}</span></div>
            <div class="info-fila"><span class="label">Clima</span><span>{{ panelBarco.clima ?? 'N/A' }}</span></div>
            <div class="info-fila"><span class="label">Riesgo</span><span>{{ panelBarco.riesgo_colision ?? 'N/A' }}</span></div>
          </div>

          <button class="btn-vermas" @click="verHistorial(panelBarco.codigo, true)">
            Ver ruta histórica
          </button>

          <div v-if="historialCargando" class="hist-loading">Cargando historial...</div>

          <div v-else-if="historialCargado && historialItems.length" class="hist-box">
            <div v-for="(p, i) in historialItems" :key="i" class="hist-item">
              <b>#{{ i + 1 }}</b> &nbsp;{{ p.timestamp }}<br>
              <span class="coord">({{ p.latitud }}, {{ p.longitud }})</span>
            </div>
          </div>

          <div v-else-if="historialCargado && !historialItems.length" class="hist-loading">
            Sin historial todavía.
          </div>
        </template>

      </div>
    </transition>

    <!-- MAPA -->
    <div ref="mapRef" class="map"></div>

  </div>
</template>

<script>
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.heat/dist/leaflet-heat.js"

delete L.Icon.Default.prototype._getIconUrl

const barcoIcon = L.icon({
  iconUrl: "/Barco.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

export default {
  name: "MonitoreoMap",

  props: {
    activo: { type: Boolean, default: false }
  },

  data() {
    return {
      map: null,
      heatLayer: null,
      barcosData: {},
      markers: {},
      rutas: {},
      panelBarco: null,
      panelColapsado: false,
      barcoSeleccionado: null,
      historialItems: [],
      historialCargado: false,
      historialCargando: false,
      zoomAnterior: null,
      centroAnterior: null,
      primerZoomHecho: false,
      modoHeatmap: "global",
      intervalId: null,
    }
  },

  watch: {
    activo(val) {
      if (val && this.map) {
        this.$nextTick(() => {
          this.map.invalidateSize()
          setTimeout(() => this.cargarHeatmap(), 200)
        })
      } else {
        if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null }
      }
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
    this.intervalId = null
    Object.values(this.markers).forEach(m => { m.off(); m.remove() })
    this.markers = {}
    Object.values(this.rutas).forEach(r => r.remove())
    this.rutas = {}
    if (this.heatLayer) { this.heatLayer.remove(); this.heatLayer = null }
    if (this.map) { this.map.off(); this.map.remove(); this.map = null }
  },

  methods: {

    initMap() {
      const el = this.$refs.mapRef
      if (el._leaflet_id) el._leaflet_id = null

      this.map = L.map(el, { zoomAnimation: false }).setView([19.5, -95.5], 8)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap"
      }).addTo(this.map)
    },

    abrirPanel(barco) {
      if (this.barcoSeleccionado && this.barcoSeleccionado !== barco.codigo) {
        if (this.rutas[this.barcoSeleccionado]) {
          this.map.removeLayer(this.rutas[this.barcoSeleccionado])
          delete this.rutas[this.barcoSeleccionado]
        }
        if (this.zoomAnterior !== null) {
          this.map.setView(this.centroAnterior, this.zoomAnterior, { animate: false })
          this.zoomAnterior = null
          this.centroAnterior = null
        }
      }
      this.panelBarco = { ...barco }
      this.panelColapsado = false
      this.barcoSeleccionado = barco.codigo
      this.historialItems = []
      this.historialCargado = false
      this.historialCargando = false
      this.primerZoomHecho = false
    },

    cerrarPanel() {
      if (this.zoomAnterior !== null && this.centroAnterior !== null) {
        this.map.setView(this.centroAnterior, this.zoomAnterior, { animate: false })
        this.zoomAnterior = null
        this.centroAnterior = null
      }
      if (this.barcoSeleccionado && this.rutas[this.barcoSeleccionado]) {
        this.map.removeLayer(this.rutas[this.barcoSeleccionado])
        delete this.rutas[this.barcoSeleccionado]
      }
      this.panelBarco = null
      this.panelColapsado = false
      this.barcoSeleccionado = null
      this.historialItems = []
      this.historialCargado = false
      this.historialCargando = false
      this.primerZoomHecho = false
    },

    async verHistorial(codigo, hacerZoom = true) {
      if (!this.map) return
      this.historialCargando = true
      this.historialCargado = false

      try {
        const res = await fetch(
          "http://192.168.71.200:8080/proyecto/api_historial.php?codigo="
          + encodeURIComponent(codigo) + "&ts=" + Date.now()
        )
        const json = JSON.parse(await res.text())
        if (!this.map) return

        this.historialCargando = false

        if (!json.ok || !json.historial?.length) {
          this.historialItems = []
          this.historialCargado = true
          return
        }

        this.historialItems = json.historial
        this.historialCargado = true

        const puntos = json.historial.slice().reverse()
          .map(p => [parseFloat(p.latitud), parseFloat(p.longitud)])

        if (this.rutas[codigo]) {
          this.rutas[codigo].setLatLngs(puntos)
        } else {
          this.rutas[codigo] = L.polyline(puntos, { weight: 4, color: "#0a4aa6" }).addTo(this.map)
        }

        if (hacerZoom && !this.primerZoomHecho) {
          this.primerZoomHecho = true
          this.zoomAnterior = this.map.getZoom()
          this.centroAnterior = this.map.getCenter()
          this.map.fitBounds(this.rutas[codigo].getBounds(), { padding: [30, 30], animate: false })
        }

      } catch (err) {
        console.error(err)
        this.historialCargando = false
      }
    },

    async actualizarHistorialSeleccionado() {
      if (!this.map || !this.barcoSeleccionado || !this.historialCargado) return
      await this.verHistorial(this.barcoSeleccionado, false)
    },

    async cargarBarcos() {
      if (!this.map) return
      try {
        const res = await fetch("http://192.168.71.200:8080/proyecto/api_barco.php?ts=" + Date.now())
        if (!res.ok) throw new Error("HTTP " + res.status)
        const json = await res.json()
        if (!this.map || !json.ok) return

        json.data.forEach(barco => {
          const lat = parseFloat(barco.latitud)
          const lon = parseFloat(barco.longitud)
          if (isNaN(lat) || isNaN(lon)) return

          this.barcosData[barco.codigo] = barco
          if (this.panelBarco?.codigo === barco.codigo) {
            this.panelBarco = { ...barco }
          }

          if (this.markers[barco.codigo]) {
            this.markers[barco.codigo].setLatLng([lat, lon])
          } else {
            const marker = L.marker([lat, lon], { icon: barcoIcon }).addTo(this.map)
            marker._codigoBarco = barco.codigo
            marker.on("click", () => this.abrirPanel(this.barcosData[barco.codigo]))
            this.markers[barco.codigo] = marker
          }
        })
      } catch (err) {
        console.error("Error cargando barcos:", err)
      }
    },

    apagarHeatmap() {
      if (this.heatLayer) { this.map.removeLayer(this.heatLayer); this.heatLayer = null }
    },
    activarHeatmapGlobal() { this.modoHeatmap = "global"; this.cargarHeatmap() },
    activarHeatmapBarco() {
      if (!this.barcoSeleccionado) { alert("Selecciona un barco primero"); return }
      this.modoHeatmap = "barco"; this.cargarHeatmap()
    },

    interpolarRuta(puntos, pasos = 25) {
      const r = []
      for (let i = 0; i < puntos.length - 1; i++) {
        const p1 = puntos[i], p2 = puntos[i + 1]
        for (let j = 0; j <= pasos; j++) {
          const t = j / pasos
          r.push([p1[0]+(p2[0]-p1[0])*t, p1[1]+(p2[1]-p1[1])*t, p1[2]+(p2[2]-p1[2])*t])
        }
      }
      return r
    },

    async cargarHeatmap() {
      if (!this.map) return
      const c = this.map.getContainer()
      if (!c || c.offsetWidth === 0 || c.offsetHeight === 0) return
      try {
        let url = "http://192.168.71.200:8080/proyecto/api_heatmap.php?ts=" + Date.now()
        if (this.modoHeatmap === "barco" && this.barcoSeleccionado)
          url += "&codigo=" + this.barcoSeleccionado
        const json = await (await fetch(url)).json()
        if (!this.map) return
        const c2 = this.map.getContainer()
        if (!c2 || c2.offsetWidth === 0 || !json.ok) return
        let puntos = json.data.map(p => {
          let i = parseFloat(p.riesgo_colision)
          return [parseFloat(p.latitud), parseFloat(p.longitud), isNaN(i) ? 0.4 : i]
        })
        const interp = this.interpolarRuta(puntos.reverse(), 35)
        if (this.heatLayer) { this.map.removeLayer(this.heatLayer); this.heatLayer = null }
        this.heatLayer = L.heatLayer(interp, { radius: 8, blur: 8, maxZoom: 16 }).addTo(this.map)
      } catch (err) { console.error(err) }
    }
  }
}
</script>

<style scoped>
.map-container { position: relative; }
.map { height: 100vh; width: 100%; }

/* ─── Panels base ─── */
.panel {
  position: absolute;
  z-index: 9999;
  background: rgba(255,255,255,0.96);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
}

/* ─── Panel izquierdo ─── */
.panel-left {
  top: 12px;
  left: 12px;
  width: 210px;
}
.panel-left h3 { margin: 0 0 6px; font-size: 14px; }
.panel-left button {
  width: 100%; padding: 8px; margin-top: 6px;
  border: none; border-radius: 8px; cursor: pointer; font-size: 13px;
}
.btn-global  { background: #051937; color: #fff; }
.btn-barco   { background: #0a4aa6; color: #fff; }
.btn-apagar  { background: #b00020; color: #fff; }
.info { margin-top: 8px; font-size: 12px; color: #555; }

/* ─── Panel derecho ─── */
.panel-right {
  top: 12px;
  right: 12px;
  width: 255px;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* Semitransparente cuando está colapsado para no distraer */
  transition: opacity 0.2s, width 0.2s;
}

/* Colapsado: más angosto y semitransparente */
.panel-collapsed {
  width: 190px;
  opacity: 0.75;
  background: rgba(255,255,255,0.82);
}
.panel-collapsed:hover {
  opacity: 1;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.panel-titulo { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.header-btns { display: flex; gap: 4px; flex-shrink: 0; }

.btn-icon {
  background: none; border: 1px solid #ddd; border-radius: 6px;
  cursor: pointer; font-size: 12px; color: #555;
  padding: 2px 7px; line-height: 1.4;
  transition: background 0.15s;
}
.btn-icon:hover { background: #f0f0f0; }
.btn-cerrar-x:hover { background: #fee; color: #b00020; border-color: #f5b5b5; }

.panel-info { display: flex; flex-direction: column; gap: 2px; }
.info-fila {
  display: flex; justify-content: space-between;
  font-size: 12px; border-bottom: 1px solid #f0f0f0; padding: 3px 0;
}
.label { color: #888; font-weight: 600; }

.btn-vermas {
  background: #083a88; color: #fff;
  border: none; border-radius: 8px;
  padding: 7px 14px; cursor: pointer; font-size: 13px;
  display: block; margin: 0 auto;
}
.btn-vermas:hover { background: #0d4fb3 }

.hist-loading { font-size: 12px; color: #888; text-align: center; padding: 6px 0; }

.hist-box { display: flex; flex-direction: column; font-size: 12px; }
.hist-item { padding: 5px 0; border-bottom: 1px solid #eee; line-height: 1.5; }
.coord { color: #666; }

/* ─── Transición entrada/salida del panel ─── */
.slide-enter-active, .slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(24px);
  opacity: 0;
}
</style>