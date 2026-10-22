# Página informativa del XIII Foro

Página independiente del contador publicado en https://hiramrr.github.io/contador-foro-xiii/.

Incluye programa por día con búsqueda, sede, calendario descargable, materiales originales y una invitación para copiar. Usa HTML, CSS y JavaScript sin dependencias.

Para revisar localmente, ejecuta `python3 -m http.server 4173 --directory dist` desde esta carpeta.

## Contenido

El programa se transcribió de `XIII_Actualizado.pdf`, proporcionado por el usuario. Se conservan sus horarios y ponentes. Los títulos de las conferencias magistrales y los participantes del panel siguen pendientes.

La invitación anterior tiene diferencias con ese programa. La página utiliza la versión actualizada. La inauguración figura a las 09:10 en el programa, mientras que el contador publicado utiliza las 09:00. No se modificó el contador.

Los PNG y PDF en `dist/assets/` son los archivos originales, copiados sin cambios. `campus.webp` proviene del contador existente. No se generaron imágenes.

Para modificar horarios, títulos o ponentes, edita `dist/programa.js`. Si cambian las fechas u horas de inicio o cierre, actualiza también `dist/assets/foro-2026.ics` y los datos de la sede en `dist/index.html`.

## Revisión

Comprueba las dos fechas del programa, la búsqueda con acentos, los enlaces de descarga, la copia de la invitación y el diseño en celular. Antes de difundir la URL, confirma los pendientes del programa con la coordinación.
