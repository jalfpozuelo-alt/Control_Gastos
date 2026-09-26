# Control Gastos v7

Versión móvil de Control Gastos.

Cambios de esta versión:
- El selector de categoría no recibe el foco al abrir «Nuevo gasto» y no se abre automáticamente.
- «Elegir» es solo un indicador visual; el selector contiene únicamente las categorías reales.
- El campo Fecha tiene la misma altura y estética que los demás campos.
- Nuevo campo «Localización», opcional y editable manualmente.
- Botón GPS con indicador visual y lectura de precisión en metros.
- Busca con alta precisión durante un máximo de 20 segundos y acepta automáticamente una lectura de 10 m o mejor.
- Si no alcanza esa precisión, permite reintentar o escribir la localidad a mano.
- La localidad se obtiene mediante geocodificación inversa a partir de las coordenadas.
- La localización se guarda con cada gasto y se incluye en la exportación CSV.
- Se mantiene la clave localStorage existente para conservar los datos.
