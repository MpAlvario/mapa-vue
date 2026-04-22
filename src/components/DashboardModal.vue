<template>
  <Teleport to="body">
    <div v-if="visible" class="dm-overlay" @click.self="cerrar">
      <div class="dm-modal">

        <div class="dm-header">
          <span class="dm-title">Estadísticas de incidencias</span>
          <div class="dm-header-right">
            <select v-model="minutos" @change="recargar" class="dm-select">
              <option value="60">Última hora</option>
              <option value="180">3 horas</option>
              <option value="720">12 horas</option>
              <option value="1440">24 horas</option>
            </select>
            <button class="dm-close" @click="cerrar">✕</button>
          </div>
        </div>

        <div v-if="cargando" class="dm-skeleton">

  <div class="sk-header"></div>

  <div class="sk-metrics">
    <div class="sk-box"></div>
    <div class="sk-box"></div>
    <div class="sk-box"></div>
    <div class="sk-box"></div>
  </div>

  <div class="sk-chart"></div>
  <div class="sk-chart"></div>

</div>
        <template v-else-if="stats">

          <div class="dm-metrics">
            <div class="dm-metric">
              <span class="dm-metric-label">Total incidencias</span>
              <span class="dm-metric-value">{{ stats.total }}</span>
            </div>
            <div class="dm-metric">
              <span class="dm-metric-label">Severidad promedio</span>
              <span class="dm-metric-value">{{ stats.sevPromGlobal }}<span class="dm-metric-sub"> / 5</span></span>
            </div>
            <div class="dm-metric">
              <span class="dm-metric-label">Tipo más frecuente</span>
              <span class="dm-metric-value dm-metric-value--sm">{{ stats.tipoMasFrecuente }}</span>
            </div>
            <div class="dm-metric">
              <span class="dm-metric-label">Zona más activa</span>
              <span class="dm-metric-value dm-metric-value--sm">{{ stats.zonaMasActiva }}</span>
            </div>
          </div>

          <div class="dm-charts">

            <div class="dm-card">
              <p class="dm-card-title">Incidencias por tipo</p>
              <div class="dm-legend">
                <span
                  v-for="(label, i) in stats.tipoLabels"
                  :key="label"
                  class="dm-legend-item"
                >
                  <span class="dm-legend-dot" :style="{ background: stats.tipoColores[i] ?? '#888' }"></span>
                  {{ label }} ({{ stats.tipoCounts[i] }})
                </span>
              </div>
              <div style="position:relative;height:200px;">
                <canvas ref="chartTipo"></canvas>
              </div>
            </div>

            <div class="dm-card">
              <p class="dm-card-title">Distribución de severidad</p>
              <div class="dm-legend">
                <span class="dm-legend-item"><span class="dm-legend-dot" style="background:#1d9e75"></span>Baja (1-2)</span>
                <span class="dm-legend-item"><span class="dm-legend-dot" style="background:#ef9f27"></span>Media (3)</span>
                <span class="dm-legend-item"><span class="dm-legend-dot" style="background:#e24b4a"></span>Alta (4-5)</span>
              </div>
              <div style="position:relative;height:200px;">
                <canvas ref="chartSev"></canvas>
              </div>
            </div>

            <div class="dm-card dm-card--full">
              <p class="dm-card-title">Zonas con más incidencias</p>
              <div class="dm-zona-table-wrap">
                <table class="dm-zona-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Zona (cuadrante)</th>
                      <th>Total</th>
                      <th>Tipo dominante</th>
                      <th>Sev. prom.</th>
                      <th>Riesgo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(z, i) in stats.zonasRanking" :key="z.nombre">
                      <td>{{ i + 1 }}</td>
                      <td>{{ z.nombre }}</td>
                      <td>{{ z.total }}</td>
                      <td>
                        <span class="dm-tipo-dot" :style="{ background: stats.COLORES_TIPO?.[z.tipoDom]?.color ?? '#888' }"></span>
                        {{ z.tipoDom }}
                      </td>
                      <td>{{ z.sevProm.toFixed(1) }}</td>
                      <td>
                        <span :class="['dm-badge', `dm-badge--${z.riesgo}`]">{{ z.riesgo }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style="position:relative;height:220px;margin-top:16px;">
                <canvas ref="chartZona"></canvas>
              </div>
            </div>

          </div>
        </template>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { API } from "@/config/api"
import { ref, watch, nextTick } from "vue"
import { useDashboard } from "../composables/useDashboard"

const props = defineProps({
  visible:  { type: Boolean, default: false },
  apiUrl:   { type: String,  default: API.terrestre.incidencias() }, //api link
})

const emit = defineEmits(["update:visible"])

const minutos    = ref("1440")
const chartTipo  = ref(null)
const chartSev   = ref(null)
const chartZona  = ref(null)

let instTipo = null
let instSev  = null
let instZona = null

const { stats, cargando, cargarStats } = useDashboard(props.apiUrl)

function cerrar() {
  emit("update:visible", false)
}

function destruirCharts() {
  instTipo?.destroy(); instTipo = null
  instSev?.destroy();  instSev  = null
  instZona?.destroy(); instZona = null
}

async function renderCharts() {
  await nextTick()
  if (!window.Chart || !stats.value) return
  destruirCharts()

  const s = stats.value

  instTipo = new window.Chart(chartTipo.value, {
    type: "doughnut",
    data: {
      labels: s.tipoLabels,
      datasets: [{
        data: s.tipoCounts,
        backgroundColor: s.tipoColores,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  })

  const sevLabels = ["Sev 1", "Sev 2", "Sev 3", "Sev 4", "Sev 5"]
  const sevColors = ["#1d9e75", "#5dcaa5", "#ef9f27", "#e24b4a", "#a32d2d"]
  instSev = new window.Chart(chartSev.value, {
    type: "bar",
    data: {
      labels: sevLabels,
      datasets: [{
        data: [s.porSeveridad[1], s.porSeveridad[2], s.porSeveridad[3], s.porSeveridad[4], s.porSeveridad[5]],
        backgroundColor: sevColors,
        borderRadius: 4,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#888" } },
        y: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { color: "#888", precision: 0 } },
      },
    },
  })

  instZona = new window.Chart(chartZona.value, {
    type: "bar",
    data: {
      labels: s.zonasRanking.map(z => z.nombre),
      datasets: [{
        label: "Incidencias",
        data: s.zonasRanking.map(z => z.total),
        backgroundColor: s.zonasRanking.map(z =>
          z.riesgo === "alto" ? "#e24b4a" : z.riesgo === "medio" ? "#ef9f27" : "#1d9e75"
        ),
        borderRadius: 4,
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { color: "#888", precision: 0 } },
        y: { grid: { display: false }, ticks: { color: "#888" } },
      },
    },
  })
}

async function recargar() {
  await cargarStats(Number(minutos.value))
  renderCharts()
}

watch(() => props.visible, async (val) => {
  if (val) {
    if (!window.Chart) {
      await new Promise((resolve) => {
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"
        script.onload = resolve
        document.head.appendChild(script)
      })
    }
    await recargar()
  } else {
    destruirCharts()
  }
})
</script>

<style scoped>
/* ===== OVERLAY (fondo moderno con blur) ===== */
.dm-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* ===== MODAL ===== */
.dm-modal {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;

  box-shadow:
    0 10px 25px rgba(0,0,0,0.15),
    0 4px 10px rgba(0,0,0,0.05);

  animation: fadeInUp 0.25s ease;
}

/* ===== HEADER ===== */
.dm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.dm-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.dm-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dm-select {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
}

.dm-close {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.dm-close:hover {
  color: #ef4444;
  transform: scale(1.1);
}

/* ===== LOADING ===== */
.dm-loading {
  text-align: center;
  padding: 40px 0;
  color: #64748b;
  font-size: 14px;
}

/* ===== METRICS ===== */
.dm-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.dm-metric {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dm-metric-label {
  font-size: 12px;
  color: #64748b;
}

.dm-metric-value {
  font-size: 24px;
  font-weight: 600;
  color: #020617;
}

.dm-metric-value--sm {
  font-size: 15px;
  padding-top: 4px;
}

.dm-metric-sub {
  font-size: 13px;
  color: #64748b;
}

/* ===== CARDS ===== */
.dm-charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.dm-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;

  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);

  transition: all 0.2s ease;
}

.dm-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0,0,0,0.08);
}

.dm-card--full {
  grid-column: 1 / -1;
}

.dm-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 10px;
}

/* ===== LEGEND ===== */
.dm-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.dm-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 8px;
  color: #334155;
}

.dm-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

/* ===== TABLE ===== */
.dm-zona-table-wrap {
  overflow-x: auto;
}

.dm-zona-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.dm-zona-table th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

.dm-zona-table td {
  padding: 8px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  color: #0f172a;
}

.dm-zona-table tr:hover {
  background: #f8fafc;
}

/* ===== DOT ===== */
.dm-tipo-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

/* ===== BADGES ===== */
.dm-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.dm-badge--alto {
  background: #fee2e2;
  color: #991b1b;
}

.dm-badge--medio {
  background: #fef3c7;
  color: #92400e;
}

.dm-badge--bajo {
  background: #dcfce7;
  color: #166534;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 600px) {
  .dm-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dm-charts {
    grid-template-columns: 1fr;
  }

  .dm-card--full {
    grid-column: 1;
  }
}

/* ===== ANIMACIÓN ===== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/*===== LOADING ======*/

.dm-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sk-header {
  height: 20px;
  width: 200px;
  border-radius: 6px;
  background: #e2e8f0;
  animation: pulse 1.4s infinite ease-in-out;
}

.sk-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.sk-box {
  height: 60px;
  border-radius: 10px;
  background: #e2e8f0;
  animation: pulse 1.4s infinite ease-in-out;
}

.sk-chart {
  height: 180px;
  border-radius: 12px;
  background: #e2e8f0;
  animation: pulse 1.4s infinite ease-in-out;
}

@keyframes pulse {
  0%   { opacity: 0.6; }
  50%  { opacity: 1; }
  100% { opacity: 0.6; }
}

</style>