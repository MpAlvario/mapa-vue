<template>
  <div id="app">

    <Navbar
      v-model="opcionSeleccionada"
      v-model:mapaSeleccionado="mapaSeleccionado"
      v-model:panelActivo="panelActivo"
      v-model:vistaActiva="vistaActiva"
      v-model:dashboard-visible="dashboardVisible"
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
      v-model:dashboard-visible="dashboardVisible"
      @update:dashboard-visible="dashboardVisible = $event"
    />

    <!-- LEYENDA SOLO PARA MÉXICO -->
    <PopulationLegend
      v-if="mapaSeleccionado === 'mexico' && percentiles"
      :percentiles="percentiles"
      :opcion="opcionSeleccionada"
    />

   <!-- Graficas -->
     <DashboardModal
      v-model:visible="dashboardVisible"
    />


  </div>
</template>

<script>
import MapaRutas from './components/MapaRutas.vue'
import MexicoMap from './components/MexicoMap.vue'
import MonitoreoMap from './components/MonitoreoMap.vue'
import Navbar from './components/navbar.vue'
import PopulationLegend from './components/PopulationLegend.vue'
import DashboardModal from './components/DashboardModal.vue'


export default {
  components: {
    MexicoMap,
    MonitoreoMap,
    MapaRutas,
    Navbar,
    PopulationLegend,
    DashboardModal
  },

  data() {
    return {
      opcionSeleccionada: 'poblacion',
      mapaSeleccionado: 'mexico',
      percentiles: null,
      panelActivo:null,
      vistaActiva:'markers', //antes estaba null
      dashboardVisible: false 

    }
  }
}
</script>

<style>
#app {
  height: 100vh;
  box-sizing: border-box;
}

</style>
