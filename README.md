# Control de gastos · propuesta visual

Aplicación web estática y PWA para controlar un presupuesto dentro de un periodo cerrado. No requiere servidor, compilación ni dependencias.

## Publicar en GitHub Pages

1. Sube **todo el contenido de esta carpeta** a la raíz de un repositorio de GitHub.
2. En el repositorio, abre **Settings → Pages**.
3. Selecciona **Deploy from a branch**, la rama `main` y la carpeta `/(root)`.
4. Guarda. GitHub mostrará la URL pública cuando termine el despliegue.

Al abrir esa URL en un navegador compatible se podrá instalar como aplicación web.

## Archivos incluidos

- `index.html`: estructura de la interfaz.
- `styles.css`: diseño adaptable para móvil y escritorio.
- `app.js`: lógica, datos locales, cálculos y exportación CSV.
- `manifest.webmanifest`, `sw.js`: instalación PWA y uso sin conexión.
- `icon.svg`, `icon-192.png`, `icon-512.png`: iconos de la aplicación.

## Datos y privacidad

Los datos se guardan solamente en el navegador mediante `localStorage`; no se envían a ningún servidor. El CSV exportado contiene únicamente los movimientos del periodo configurado.

## Regla de cálculo

Todos los indicadores usan exclusivamente los gastos cuya fecha cae entre el inicio y el final establecidos. Al terminar el periodo, la media diaria queda congelada y el presupuesto diario pasa a cero.
