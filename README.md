# Control Gastos v2

Versión 2 de Control Gastos, basada en la versión 1 estable.

Novedades:
- Tipo de control: Camino de Santiago, Viaje, Vacaciones, Gastos del mes o Personalizado.
- Cada control tiene sus propias categorías e iconos.
- Categorías configurables: añadir, renombrar, cambiar icono y eliminar categorías sin uso.
- Las categorías elegidas aparecen automáticamente en Nuevo gasto.
- Se conserva toda la funcionalidad anterior, incluida la localización GPS, tarjetas de detalle, título en mayúsculas y exportación.
- La estructura existente de localStorage se conserva para no perder los datos de la versión 1.


## V2.6.1 — Instalación guiada de la app web

- Detecta automáticamente si la aplicación ya se está ejecutando como PWA instalada.
- En navegadores Chromium compatibles, ofrece el diálogo nativo de instalación mediante `beforeinstallprompt`.
- En iPhone/iPad muestra una guía visual específica para añadir la web a Inicio y abrirla como app web.
- En Android muestra instrucciones adaptadas al navegador.
- En escritorio muestra las instrucciones correspondientes cuando el navegador permite instalar la PWA y, cuando no, una alternativa de acceso.
- La guía se muestra una sola vez por dispositivo/navegador y queda disponible mediante el botón de instalación.
- No modifica los datos de gastos ni la configuración existente.
