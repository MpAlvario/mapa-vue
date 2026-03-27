<template>
  <div id="app">

    <Navbar
      v-model="opcionSeleccionada"
      v-model:mapaSeleccionado="mapaSeleccionado"
      v-model:panelActivo="panelActivo"
      v-model:vistaActiva="vistaActiva"
    />

    <!-- MAPA MÉXICO -->
    <MexicoMap
      v-show="mapaSeleccionado === 'mexico'"
      :opcion="opcionSeleccionada"
      @update-percentiles="percentiles = $event"
    />

    <!-- MAPA MONITOREO -->
    <MonitoreoMap
      v-show="mapaSeleccionado === 'monitoreo'"
      :activo="mapaSeleccionado === 'monitoreo'"
    />

    <!-- MAPA RUTAS -->
    <MapaRutas
      v-show="mapaSeleccionado === 'rutas'"
      :activo="mapaSeleccionado === 'rutas'"
      :panelActivo="panelActivo"
      :vistaActiva="vistaActiva"
    />

    <!-- LEYENDA SOLO PARA MÉXICO -->
    <PopulationLegend
      v-if="mapaSeleccionado === 'mexico' && percentiles"
      :percentiles="percentiles"
      :opcion="opcionSeleccionada"
    />

  </div>
</template>

<script>
import MapaRutas from './components/MapaRutas.vue'
import MexicoMap from './components/MexicoMap.vue'
import MonitoreoMap from './components/MonitoreoMap.vue'
import Navbar from './components/navbar.vue'
import PopulationLegend from './components/PopulationLegend.vue'

export default {
  components: {
    MexicoMap,
    MonitoreoMap,
    MapaRutas,
    Navbar,
    PopulationLegend
  },

  data() {
    return {
      opcionSeleccionada: 'poblacion',
      mapaSeleccionado: 'mexico',
      percentiles: null,
      panelActivo:null,
      vistaActiva:null

    }
  }
}
</script>

<style>
#app {
  height: 100vh;
  box-sizing: border-box;
}

/* Marcadores Leaflet - render optimizado */
.leaflet-marker-icon,
.leaflet-marker-shadow {
  transition: none !important;
  transform: translateZ(0);
  will-change: transform;
  image-rendering: auto;
}
</style>