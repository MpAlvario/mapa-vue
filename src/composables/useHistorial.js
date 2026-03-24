import L from "leaflet"

export function useHistorial(map){

  let rutas = {}
  let barcoSeleccionado = null
  let primerZoomHecho = false

  function cerrarHistorial(){

    if(barcoSeleccionado && rutas[barcoSeleccionado]){
      map.removeLayer(rutas[barcoSeleccionado])
      delete rutas[barcoSeleccionado]
    }

    barcoSeleccionado = null
    primerZoomHecho = false
  }

  async function verHistorial(codigo, hacerZoom = true){

    barcoSeleccionado = codigo

    try{

      console.log("CODIGO ENVIADO:", codigo)

      const res = await fetch(
        "http://192.168.71.200:8080/proyecto/api_historial.php?codigo="
        + encodeURIComponent(codigo)
        + "&ts="
        + Date.now()
      )

      const json = await res.json()

      if(!json.ok){
        return "Error: " + json.error
      }

      if(json.historial.length === 0){
        return "Sin historial todavía."
      }

      const html = json.historial.map((p,i)=>`
        <div class="historial-item">
          <b>#${i+1}</b><br>
          ${p.timestamp}<br>
          (${p.latitud}, ${p.longitud})
        </div>
      `).join("")

      const puntos = json.historial
        .slice()
        .reverse()
        .map(p=>[
          parseFloat(p.latitud),
          parseFloat(p.longitud)
        ])

      if(rutas[codigo]){
        rutas[codigo].setLatLngs(puntos)
      }else{
        rutas[codigo] = L.polyline(puntos,{weight:4}).addTo(map)
      }

      if(hacerZoom && !primerZoomHecho){
        primerZoomHecho = true
        map.fitBounds(
          rutas[codigo].getBounds(),
          {padding:[30,30]}
        )
      }

      return html

    }catch(err){
      console.error(err)
      return "Error cargando historial"
    }
  }

  return {
    verHistorial,
    cerrarHistorial
  }
}