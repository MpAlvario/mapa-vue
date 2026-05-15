<template>
  <nav class="Navbar">

    <!-- IZQUIERDA -->
    <div class="left">
      <img src="/LogoClaro.png" alt="MapHub Logo" class="navbar-logo" />
      <select v-model="localMap" @change="emitMapChange">
        <option value="mexico">Mapa de México</option>
        <option value="monitoreo">Mapa Monitoreo Marino</option>
        <option value="rutas">Mapa de rutas</option>
      </select>
    </div>

    <!-- CENTRO -->
    <div class="center">
      <h2>
        {{ localMap === 'mexico'
          ? 'Mapa de México'
          : localMap === 'monitoreo'
          ? 'Mapa de Monitoreo Marino'
          : 'Mapa de Rutas'
        }}
      </h2>
    </div>

    <!-- DERECHA -->
    <div class="right">

      <!-- Select de capa solo en México -->
      <select
        v-if="localMap === 'mexico'"
        v-model="localLayer"
        @change="emitChange"
      >
        <option value="poblacion">Población</option>
        <option value="recursoFinanciero">Recursos financieros</option>
        <option value="recursoHumano">Recursos humanos</option>
        <option value="personalActivo">Personal activo</option>
      </select>

      <!-- Botones solo en Rutas -->
      <div v-if="localMap === 'rutas'" class="rutas-controls">

        <!-- Botón Incidencias -->
        <button
          class="nav-btn"
          :class="{ active: panelActivo === 'incidencias' }"
          @click="togglePanel('incidencias')"
        >
          Incidentes
          <span class="btn-arrow">▼</span>
        </button>

        <!--  Botón Estadísticas (nuevo) -->
        <button
          class="nav-btn"
          :class="{ active: dashboardVisible }"
          @click="$emit('update:dashboardVisible', !dashboardVisible)"
        >
          📊
          <span class="btn-arrow">▼</span>
        </button>

        <!-- Botón + con dropdown -->
        <div class="dropdown-wrapper" ref="dropdownRef">
          <button
            class="nav-btn nav-btn-plus"
            :class="{ active: dropdownAbierto }"
            @click="toggleDropdown"
          >
            +
            <span class="btn-arrow">▼</span>
          </button>

          <!-- Menú desplegable -->
          <transition name="slide-down">
            <div v-if="dropdownAbierto" class="dropdown-menu">
              <p class="dropdown-label">Modo de visualización</p>

              <button
                class="dropdown-item"
                :class="{ selected: vistaActiva === 'markers' }"
                @click="seleccionarVista('markers')"
              >
                <span class="item-icon">📍</span>
                <span>Markers</span>
                <span v-if="vistaActiva === 'markers'" class="check">✓</span>
              </button>

              <button
                class="dropdown-item"
                :class="{ selected: vistaActiva === 'heatmap' }"
                @click="seleccionarVista('heatmap')"
              >
                <span class="item-icon">🔥</span>
                <span>Heatmap</span>
                <span v-if="vistaActiva === 'heatmap'" class="check">✓</span>
              </button>

              <button
                class="dropdown-item"
                :class="{ selected: vistaActiva === 'cluster' }"
                @click="seleccionarVista('cluster')"
              >
                <span class="item-icon">🔵</span>
                <span>Clusters</span>
                <span v-if="vistaActiva === 'cluster'" class="check">✓</span>
              </button>

              <!--Botón nuevo Poligonos-->
              <button
              class="dropdown-item"
              :class="{ selected: vistaActiva === 'poligonos' }"
              @click="seleccionarVista('poligonos')"
              >
                 <span class="item-icon">🔷</span>
                 <span>Polígonos</span>
                 <span v-if="vistaActiva === 'poligonos'" class="check">✓</span>
              </button>

              <button
              class="dropdown-item"
              :class="{ selected: vistaActiva === 'prediccion' }"
              @click="seleccionarVista('prediccion')"
                    >

                <span class="item-icon">🔮</span>
                <span>Predicción</span>
                <span v-if="vistaActiva === 'prediccion'" class="check">✓</span>
                </button>
              
            </div>
          </transition>
        </div>

      </div>
    </div>

  </nav>

  <!-- Barra azul inferior -->
  <div class="bottom-bar"></div>
</template>

<script>
export default {
  name: 'Navbar',

  props: {
    modelValue:       { type: String,  required: true },
    mapaSeleccionado: { type: String,  required: true },
    panelActivo:      { type: String,  default: null  },
    vistaActiva:      { type: String,  default: 'markers' },
    dashboardVisible: { type: Boolean, default: false },   //  nuevo prop
  },

  emits: [
    'update:modelValue',
    'update:mapaSeleccionado',
    'update:panelActivo',
    'update:vistaActiva',
    'update:dashboardVisible',   //  nuevo emit
  ],

  data() {
    return {
      localLayer: this.modelValue,
      localMap: this.mapaSeleccionado,
      dropdownAbierto: false
    }
  },

  methods: {
    emitChange() {
      this.$emit('update:modelValue', this.localLayer)
    },

    emitMapChange() {
      this.$emit('update:mapaSeleccionado', this.localMap)
      this.$emit('update:panelActivo', null)
      this.$emit('update:dashboardVisible', false)   // cerrar dashboard al cambiar mapa
      this.dropdownAbierto = false
    },

    togglePanel(nombre) {
      const nuevo = this.panelActivo === nombre ? null : nombre
      this.$emit('update:panelActivo', nuevo)
    },

    toggleDropdown() {
      this.dropdownAbierto = !this.dropdownAbierto
    },

    seleccionarVista(vista) {
      this.$emit('update:vistaActiva', vista)
      this.dropdownAbierto = false
    },

    handleClickOutside(e) {
      if (this.$refs.dropdownRef && !this.$refs.dropdownRef.contains(e.target)) {
        this.dropdownAbierto = false
      }
    }
  },

  mounted() {
    document.addEventListener('click', this.handleClickOutside)
  },

  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  }
}
</script>

<style scoped>
.Navbar {
  height: 60px;
  background: rgba(5, 25, 55, 0.80);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 8px 25px rgba(0,0,0,0.35);
  position: relative;
  z-index: 10000;
}

.left  { width: 30%; display: flex; align-items: center; gap: 12px; }
.center { width: 40%; text-align: center; }
.right { width: 30%; display: flex; justify-content: flex-end; align-items: center; gap: 8px; }

.navbar-logo {
  height: 76px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 0 10px rgba(176, 224, 230, 0.6));
  transition: filter 0.3s ease, transform 0.3s ease;
  margin-left: -8px;
}
.navbar-logo:hover {
  filter: drop-shadow(0 0 16px rgba(176, 224, 230, 0.95));
  transform: scale(1.06);
}

.center h2 { margin: 0; font-size: 20px; font-weight: 600; }

.Navbar select {
  padding: 10px 42px 10px 16px;
  border-radius: 30px;
  border: none;
  font-size: 14px;
  background-color: white;
  color: #051937;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  box-shadow: 0 4px 10px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.8);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231b5e20'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 18px;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}
.Navbar select:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8);
}
.Navbar select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(27,94,32,0.25), 0 6px 16px rgba(0,0,0,0.2);
}

.rutas-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 30px;
  border: none;
  background-color: white;
  color: #051937;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.8);
  transition: box-shadow 0.25s ease, transform 0.25s ease, background 0.2s;
  white-space: nowrap;
}
.nav-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0,0,0,0.25);
}
.nav-btn.active {
  background-color: #083a88;
  color: white;
  box-shadow: 0 4px 14px rgba(8,58,136,0.45);
}
.nav-btn-plus {
  padding: 9px 14px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.btn-arrow {
  font-size: 10px;
  opacity: 0.6;
}

.dropdown-wrapper { position: relative; }

.dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1);
  padding: 10px 8px;
  min-width: 210px;
  z-index: 99999;
  border: 1px solid rgba(0,0,0,0.07);
}

.dropdown-label {
  font-size: 11px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 6px 8px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  transition: background 0.15s;
  text-align: left;
}
.dropdown-item:hover:not(:disabled) {
  background: #f0f4ff;
  color: #083a88;
}
.dropdown-item.selected {
  background: #eff6ff;
  color: #083a88;
  font-weight: 600;
}
.dropdown-item.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.item-icon { font-size: 16px; }

.check {
  margin-left: auto;
  color: #083a88;
  font-weight: 700;
  font-size: 15px;
}

.coming-soon {
  margin-left: auto;
  font-size: 10px;
  background: #f3f4f6;
  color: #9ca3af;
  padding: 2px 7px;
  border-radius: 20px;
  font-weight: 600;
}

.slide-down-enter-active { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-down-leave-active { transition: all 0.15s ease-in; }
.slide-down-enter-from  { opacity: 0; transform: translateY(-8px) scale(0.97); }
.slide-down-leave-to    { opacity: 0; transform: translateY(-4px) scale(0.98); }

.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 25px;
  background: rgba(5, 25, 55, 0.80);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 -8px 25px rgba(0,0,0,0.35);
  z-index: 10000;
}
</style>