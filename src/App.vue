<template>
  <div id="app">

    <Navbar
      v-model="opcionSeleccionada"
      v-model:mapaSeleccionado="mapaSeleccionado"
    />

    <!-- MAPA MÉXICO -->
    <MexicoMap
      v-if="mapaSeleccionado === 'mexico'"
      :opcion="opcionSeleccionada"
      @update-percentiles="percentiles = $event"
    />

    <!-- MAPA MONITOREO -->
    <MonitoreoMap
      v-if="mapaSeleccionado === 'monitoreo'"
    />
    
    <!-- MAPA RUTAS -->
    <MapaRutas
    v-if="mapaSeleccionado === 'rutas'"
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
      percentiles: null
    }
  }
}
</script>



<style>
#app {
  height: 100vh;
}
</style>

