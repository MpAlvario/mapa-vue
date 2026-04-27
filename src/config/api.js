//const BASE_URL = "http://192.168.71.200:8080"

const BASE_URL = "http://localhost:8080"
export const API = {
  //  TERRESTRE
  terrestre: {
    patrullas: () => `${BASE_URL}/terrestre/api_patrullas.php`,
    despacho: () => `${BASE_URL}/terrestre/api_despacho.php`,
    ruta: () => `${BASE_URL}/terrestre/api_ruta.php`,
    resolverIncidencia: () => `${BASE_URL}/terrestre/api_resolver_incidencia.php`,
    actualizarEstado: () => `${BASE_URL}/terrestre/api_actualizar_estado.php`,
    incidencias: () => `${BASE_URL}/terrestre/api_incidencias.php`,
    heatmap: () => `${BASE_URL}/terrestre/api_heatmap.php`,
  },

  //  TERRESTRE 2 (dashboard)
  terrestre2: {
    incidencias: () => `${BASE_URL}/terrestre2/api_incidencias.php`,
  },

  //  PROYECTO (barcos, historial)
  proyecto: {
    barcos: () => `${BASE_URL}/proyecto/api_barco.php`,
    historial: () => `${BASE_URL}/proyecto/api_historial.php`,
  }
}