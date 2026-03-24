<template>
  <nav class="Navbar">

    <!-- IZQUIERDA : LOGO + SELECT MAPA -->
    <div class="left">
      <img
        src="/LogoClaro.png"
        alt="MapHub Logo"
        class="navbar-logo"
      />
      <select v-model="localMap" @change="emitMapChange">
        <option value="mexico">Mapa de México</option>
        <option value="monitoreo">Mapa Monitoreo Marino</option>
        <option value="rutas">Mapa de rutas</option>
      </select>
    </div>

    <!-- CENTRO : TITULO DINAMICO -->
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

    <!-- DERECHA : VARIABLES SOLO MEXICO -->
    <div class="right">
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
    </div>

  </nav>
</template>

<script>
export default {

  name: 'Navbar',

  props: {
    modelValue: {
      type: String,
      required: true
    },
    mapaSeleccionado: {
      type: String,
      required: true
    }
  },

  emits: ['update:modelValue', 'update:mapaSeleccionado'],

  data() {
    return {
      localLayer: this.modelValue,
      localMap: this.mapaSeleccionado
    }
  },

  methods: {

    emitChange() {
      this.$emit('update:modelValue', this.localLayer)
    },

    emitMapChange() {
      this.$emit('update:mapaSeleccionado', this.localMap)
    }

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
}

/* ZONAS */
.left {
  width: 30%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.center {
  width: 40%;
  text-align: center;
}

.right {
  width: 30%;
  display: flex;
  justify-content: flex-end;
}

/* LOGO */
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

/* TITULO */
.center h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

/* SELECTS */
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
  -moz-appearance: none;
  box-shadow:
    0 4px 10px rgba(0,0,0,0.20),
    inset 0 1px 0 rgba(255,255,255,0.8);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231b5e20'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 18px;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

/* HOVER */
.Navbar select:hover {
  transform: translateY(-1px);
  box-shadow:
    0 8px 18px rgba(0,0,0,0.25),
    inset 0 1px 0 rgba(255,255,255,0.8);
}

/* FOCUS */
.Navbar select:focus {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(27,94,32,0.25),
    0 6px 16px rgba(0,0,0,0.2);
}

</style>