// const BASE_URL = "http://192.168.71.200:8080"
const BASE_URL = "http://localhost:8080"
const URL_BARCO = "http://172.20.10.5:8080"

export const API = {
  // TERRESTRE
  terrestre: {
    patrullas: () => `${BASE_URL}/terrestre/api_patrullas.php`,
    despacho: () => `${BASE_URL}/terrestre/api_despacho.php`,
    ruta: () => `${BASE_URL}/terrestre/api_ruta.php`,
    resolverIncidencia: () => `${BASE_URL}/terrestre/api_resolver_incidencia.php`,
    actualizarEstado: () => `${BASE_URL}/terrestre/api_actualizar_estado.php`,
    incidencias: () => `${BASE_URL}/terrestre/api_incidencias.php`,
    heatmap: () => `${BASE_URL}/terrestre/api_heatmap.php`,
    centroides: () => `${BASE_URL}/api_centroides.php`,
    actualizarPosicion: () => `${BASE_URL}/actualizar_posicion.php`,
  },

  // TERRESTRE DASHBOARD
  terrestre2: {
    incidencias: () => `${BASE_URL}/terrestre2/api_incidencias.php`,
  },

  // MONITOREO MARINO
  marino: {
    barcos: () => `${URL_BARCO}/proyecto/api_barco.php`,
    historial: (codigo) => `${URL_BARCO}/proyecto/api_historial.php?codigo=${codigo}`,
    heatmap: (codigo = null) =>
      codigo
        ? `${URL_BARCO}/proyecto/api_heatmap.php?codigo=${codigo}`
        : `${URL_BARCO}/proyecto/api_heatmap.php`,
    ubicaciones: () => `${URL_BARCO}/proyecto/api_ubicaciones.php`,
    datos: () => `${URL_BARCO}/proyecto/datos.php`,
  }
}