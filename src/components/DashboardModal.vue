<template>
  <Teleport to="body">
    <div v-if="visible" class="dm-overlay" @click.self="cerrar">
      <div class="dm-modal" ref="modalRef">

        <div class="dm-header">
          <span class="dm-title">📊 Estadísticas de incidentes</span>
          <div class="dm-header-right">
            <select v-model="minutos" @change="recargar" class="dm-select">
              <option value="60">Última hora</option>
              <option value="180">3 horas</option>
              <option value="720">12 horas</option>
              <option value="1440">24 horas</option>
            </select>
            <button class="dm-btn-pdf" @click="exportarPDF" :disabled="exportando">
              <span class="dm-btn-pdf-icon">📄</span>
              {{ exportando ? 'Generando...' : 'Exportar PDF' }}
            </button>
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
  tipo:     { type: String,  default: "todos" },
})


const emit = defineEmits(["update:visible"])

const minutos    = ref("1440")
const chartTipo  = ref(null)
const chartSev   = ref(null)
const chartZona  = ref(null)
// Agrega junto a tus otros refs
const exportando = ref(false)
const modalRef   = ref(null)  // ref al div dm-modal 

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
  plugins: [window.ChartDataLabels],
  data: {
    labels: s.tipoLabels,
    datasets: [{
      data: s.tipoCounts,
      backgroundColor: s.tipoColores,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          borderRadius: 3,
          padding: 8,
          font: { size: 10 },
          color: '#334155',
          // ← Sin porcentaje en la leyenda, solo el nombre
          generateLabels: (chart) => {
            return chart.data.labels.map((label, i) => ({
              text: `${label}  (${chart.data.datasets[0].data[i]})`,
              fillStyle: chart.data.datasets[0].backgroundColor[i],
              strokeStyle: '#fff',
              lineWidth: 1,
              index: i
            }))
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
            const pct   = Math.round(ctx.parsed / total * 100)
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`
          }
        }
      },
      datalabels: {
  display: true, // ← siempre mostrar
  color: '#ffffff',
  font: (ctx) => {
    // Fuente más pequeña para segmentos chicos
    const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0)
    const pct   = ctx.dataset.data[ctx.dataIndex] / total
    return { weight: 'bold', size: pct < 0.06 ? 8 : 11 }
  },
  formatter: (value, ctx) => {
    const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0)
    const pct   = Math.round(value / total * 100)
    return pct < 3 ? '' : `${pct}%` // ← si es muy chico, no muestra texto (evita overlap)
  },
  textShadowBlur: 4,
  textShadowColor: 'rgba(0,0,0,0.4)',
}
    },
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
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y} incidencias`
        }
      },
      // ← valores encima de cada barra
      datalabels: undefined
    },
    // En instSev, dentro de options:
    scales: {
    x: { grid: { display: false }, ticks: { color: "#888" } },
    y: {
    grid: { color: "rgba(0,0,0,0.06)" },
    ticks: { color: "#888", precision: 0 },
    beginAtZero: true,
    suggestedMax: Math.max(...[s.porSeveridad[1], s.porSeveridad[2], s.porSeveridad[3], s.porSeveridad[4], s.porSeveridad[5]]) * 1.2, // ← 20% extra arriba
  },
},
    // Plugin inline para labels sobre barras
    animation: {
      onComplete: function() {
        const chart = this
        const ctx   = chart.ctx
        ctx.font = 'bold 11px sans-serif'
        ctx.fillStyle = '#334155'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        chart.data.datasets.forEach((dataset, i) => {
          chart.getDatasetMeta(i).data.forEach((bar, j) => {
            const val = dataset.data[j]
            if (val > 0) ctx.fillText(val, bar.x, bar.y - 2)
          })
        })
      }
    }
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
//nueva funcion
async function exportarPDF() {
  if (!stats.value || exportando.value) return
  exportando.value = true

  try {
    // Cargar librerías si no están
    if (!window.jspdf) {
      await new Promise(resolve => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        s.onload = resolve
        document.head.appendChild(s)
      })
    }
    if (!window.html2canvas) {
      await new Promise(resolve => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        s.onload = resolve
        document.head.appendChild(s)
      })
    }

    const { jsPDF } = window.jspdf
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const s   = stats.value
    const now = new Date()
    const fecha = now.toLocaleDateString('es-MX', { 
      day: '2-digit', month: 'long', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    })
    const periodos = { 60: '1 hora', 180: '3 horas', 720: '12 horas', 1440: '24 horas' }
    const periodo  = periodos[minutos.value] ?? minutos.value + ' min'

    // ── Encabezado ──────────────────────────────────────────
    pdf.setFillColor(8, 58, 136)
    pdf.rect(0, 0, 210, 28, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Reporte de Incidencias — Veracruz', 14, 12)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Generado: ${fecha}  |  Período: últimas ${periodo}`, 14, 22)

    // ── Métricas principales ─────────────────────────────────
    pdf.setTextColor(15, 23, 42)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Resumen general', 14, 38)

    const metricas = [
      { label: 'Total incidencias',   valor: String(s.total) },
      { label: 'Severidad promedio',  valor: `${s.sevPromGlobal} / 5` },
      { label: 'Tipo más frecuente',  valor: s.tipoMasFrecuente },
      { label: 'Zona más activa',     valor: s.zonaMasActiva },
    ]

    metricas.forEach((m, i) => {
      const x = 14 + (i % 2) * 95
      const y = 44 + Math.floor(i / 2) * 20

      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(x, y, 88, 16, 3, 3, 'F')
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 116, 139)
      pdf.text(m.label, x + 4, y + 6)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(2, 6, 23)
      pdf.text(m.valor, x + 4, y + 13)
    })

    // ── Tabla de zonas ───────────────────────────────────────
    let y = 90
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(15, 23, 42)
    pdf.text('Ranking de zonas', 14, y)
    y += 6

    // Cabecera tabla
    pdf.setFillColor(8, 58, 136)
    pdf.rect(14, y, 182, 8, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    const cols = ['#', 'Zona', 'Total', 'Tipo dominante', 'Sev. prom.', 'Riesgo']
    const colX = [16, 24, 80, 100, 152, 172]
    cols.forEach((c, i) => pdf.text(c, colX[i], y + 5.5))
    y += 8

    // Filas
    s.zonasRanking.forEach((z, idx) => {
      const bg = idx % 2 === 0 ? [255,255,255] : [248,250,252]
      pdf.setFillColor(...bg)
      pdf.rect(14, y, 182, 8, 'F')
      pdf.setTextColor(15, 23, 42)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)

      pdf.text(String(idx + 1),           colX[0], y + 5.5)
      pdf.text(z.nombre,                  colX[1], y + 5.5)
      pdf.text(String(z.total),           colX[2], y + 5.5)
      pdf.text(z.tipoDom,                 colX[3], y + 5.5)
      pdf.text(z.sevProm.toFixed(1),      colX[4], y + 5.5)

      // Badge riesgo con color
      const riesgoCols = {
        alto:  [226, 75,  74],
        medio: [239,159,  39],
        bajo:  [ 29,158, 117],
      }
      const rc = riesgoCols[z.riesgo] ?? [136,135,128]
      pdf.setFillColor(...rc)
      pdf.roundedRect(colX[5], y + 1, 20, 6, 2, 2, 'F')
      pdf.setTextColor(255,255,255)
      pdf.setFont('helvetica', 'bold')
      pdf.text(z.riesgo, colX[5] + 2, y + 5.5)

      y += 8
    })

    // ── Capturar gráficas ────────────────────────────────────────
// ── Capturar gráficas ────────────────────────────────────────
    y += 10
    pdf.setTextColor(15, 23, 42)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Gráficas', 14, y)
    y += 6

    pdf.setDrawColor(226, 232, 240)
    pdf.setLineWidth(0.5)
    pdf.line(14, y, 196, y)
    y += 6

    const canvases = [
      { ref: chartTipo.value, titulo: 'Incidencias por tipo' },
      { ref: chartSev.value,  titulo: 'Distribución de severidad' },
      { ref: chartZona.value, titulo: 'Zonas con más incidencias', fullWidth: true },
    ]

    const graficasPares     = canvases.filter(c => !c.fullWidth)
    const graficasFullWidth = canvases.filter(c => c.fullWidth)

    if (y > 200) { pdf.addPage(); y = 14 }

    const anchoMitad = 86
    const altoMitad  = 55

    for (let i = 0; i < graficasPares.length; i++) {
      const { ref: canvas, titulo } = graficasPares[i]
      if (!canvas) continue
      const x = i === 0 ? 14 : 110
      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(x, y, anchoMitad, altoMitad + 10, 3, 3, 'F')
      pdf.setDrawColor(226, 232, 240)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(x, y, anchoMitad, altoMitad + 10, 3, 3, 'S')
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(100, 116, 139)
      pdf.text(titulo, x + 4, y + 6)
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', x + 3, y + 8, anchoMitad - 6, altoMitad - 4)
    }

    y += altoMitad + 18

    for (const { ref: canvas, titulo } of graficasFullWidth) {
      if (!canvas) continue
      if (y > 220) { pdf.addPage(); y = 14 }
      const anchoFull = 182
      const altoFull  = 65
      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(14, y, anchoFull, altoFull + 10, 3, 3, 'F')
      pdf.setDrawColor(226, 232, 240)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(14, y, anchoFull, altoFull + 10, 3, 3, 'S')
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(100, 116, 139)
      pdf.text(titulo, 18, y + 6)
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 17, y + 8, anchoFull - 6, altoFull - 4)
      y += altoFull + 16
    }

    // ── Pie de página ────────────────────────────────────────
    const totalPags = pdf.getNumberOfPages()
    for (let p = 1; p <= totalPags; p++) {
      pdf.setPage(p)
      pdf.setFontSize(7)
      pdf.setTextColor(148, 163, 184)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Sistema de Monitoreo — Veracruz', 14, 290)
      pdf.text(`Página ${p} de ${totalPags}`, 180, 290)
    }

    pdf.save(`reporte-incidencias-${now.toISOString().slice(0,10)}.pdf`)

  } catch (err) {
    console.error('Error generando PDF:', err)
  } finally {
    exportando.value = false
  }
}

async function recargar() {
  await cargarStats(Number(minutos.value), props.tipo)
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
//porcentaje dentro de la grafica
    if (!window.ChartDataLabels) {
      await new Promise((resolve) => {
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js"
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

/* ===== HEADER mejorado ===== */
.dm-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== BOTÓN PDF ===== */
.dm-btn-pdf {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 10px;
  border: none;
  background: #1e3a5f;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(30, 58, 95, 0.35);
  white-space: nowrap;
  width: fit-content;
}

.dm-btn-pdf:hover {
  background: #264d7a;
  box-shadow: 0 4px 10px rgba(30, 58, 95, 0.45);
  transform: translateY(-1px);
}

.dm-btn-pdf:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

</style>
