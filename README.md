# Programa del XIII Foro

Publicado en https://hiramrr.github.io/programa-foro-xiii/.

Página independiente del contador publicado en https://hiramrr.github.io/contador-foro-xiii/. Conserva su tipografía monoespaciada, colores y paneles con bordes finos.

El programa tiene un contador por actividad. Antes de iniciar cuenta hasta el comienzo, durante la conferencia cuenta hasta el final y después indica que terminó. El contador de cada conferencia se puede mostrar en pantalla completa.

La página está pensada para que la opere cualquier persona: al inicio hay tres botones grandes con explicación («Proyectar en automático», «Abrir control de tiempos» y «Ensayo de 40 segundos») y una guía rápida desplegable.

El modo automático sigue el horario real y al terminar cada participación pasa directo al siguiente contador. El ensayo demuestra inicio, conferencia, aplausos y siguiente conferencia en unos cuarenta segundos, sin clics y sin cambiar los horarios reales. Cada animación termina antes de que empiece la siguiente.

Cada hito del foro tiene un mini festejo con estilo de terminal: arte ASCII animado, texto que se escribe con cursor, barra de progreso del foro y confeti de símbolos. Se festejan el inicio del foro y de cada día, el inicio y el fin de cada participación, cada sesión completada, la mitad del foro, el cierre de cada día y la clausura. Los últimos diez segundos antes de cada actividad se marcan como cuenta final. Los festejos aparecen en pantalla completa y respetan la preferencia de movimiento reducido. Tras una pausa larga del navegador no se festejan hitos atrasados.

Cada receso tiene su propia pantalla: una taza de café en arte ASCII a color con vapor animado (`dist/receso.js`), la cuenta para regresar y la actividad que sigue. El aviso pequeño usa la misma taza. Se abre sola al empezar el receso, también desde el botón «Proyectar receso» del programa, y al terminar pasa sola al contador de la siguiente actividad.

## Control de tiempos

Las participaciones pueden durar más o menos de lo programado. El botón «Control de tiempos» abre un panel para quien opera la proyección. El panel muestra la actividad en curso o la siguiente, su cuenta y el retraso o adelanto respecto al programa.

- **−5, −1, +1, +5 y +10 min** cambian la hora de término de la actividad en curso. Antes de que empiece, mueven su inicio. «Otra cantidad» permite quitar o agregar cualquier número de minutos (1 a 180).
- **Terminar ahora** cierra la actividad en curso y empieza la siguiente.
- **Iniciar ahora** arranca la siguiente actividad de inmediato. Si había algo en curso, lo termina.
- **Reiniciar desde ahora** cuenta de nuevo el tiempo completo, por ejemplo si el ponente tardó en conectarse.
- **Omitir** está en cada actividad del programa y la saca del horario (para ausencias). «Restaurar» la devuelve.
- **Deshacer** revierte el último ajuste. **Volver al horario original** pide confirmación, regresa al programa original y también se puede deshacer.

Con «Esperar a que termine», la actividad que agota su tiempo no se corta. La cuenta pasa a tiempo extra en rojo y lo que sigue queda en espera hasta que el operador pulsa «Terminar ahora». Los recesos terminan solos. Con «Avanzar automáticamente», cada actividad termina a su hora como antes. En los últimos cinco minutos (o el último cuarto de una actividad corta) la cuenta cambia a ámbar.

Los retrasos se arrastran a todo lo que sigue en el día. Terminar antes recupera el retraso, pero nada empieza antes de su hora programada, salvo con «Iniciar ahora». Cada actividad desplazada muestra su horario programado y el desfase. Los festejos, la pantalla de receso y el modo automático usan el horario ajustado. Los ajustes del horario real solo se habilitan el día del evento. La prueba rápida usa ajustes propios que no tocan el horario real.

Durante la proyección, al mover el ratón aparece abajo una barra grande con los mismos botones de tiempo y «Salir». También hay atajos que funcionan con un presentador inalámbrico: → o Avance de página para siguiente (terminar o iniciar), ← o Retroceso de página para deshacer, ↑/↓ para ±1 min (con Mayús ±5), R para reiniciar, F para pantalla completa y Esc para salir. En modo automático, salir de pantalla completa ya no detiene la presentación. La pantalla no se apaga mientras se proyecta o el control está activo.

Los ajustes se guardan en el navegador y se comparten al instante entre pestañas del mismo navegador. Así, una pestaña puede proyectar en modo automático mientras otra, en la laptop, opera el control. No se sincronizan con otros dispositivos: el público ve el programa original.

## Pruebas

`pruebas.html` carga la página con un reloj simulado (`?t=2026-11-12T11:39:56`, en hora del foro) y botones para saltar a cada hito, contador, receso y modo. Con reloj simulado los ajustes se guardan aparte de los reales.

Cada cambio de pantalla de la proyección, el inicio y el fin del foro y de cada día pasan por una transición con bloques grandes azules y verdes. Los bloques cubren la pantalla, muestran un rótulo y se retiran en diagonal. Con movimiento reducido el cambio es inmediato.

## Desarrollo

GitHub Pages publica la raíz de la rama `gh-pages`. Para actualizar la página después de guardar los cambios en `main`, ejecuta:

```sh
node --test tests/*.test.mjs
git push origin main
git subtree push --prefix dist origin gh-pages
```

La rama `gh-pages` contiene solo los archivos de `dist/`. El archivo `.nojekyll` permite que Pages los publique como archivos estáticos.

Ejecuta `python3 -m http.server 4173 --directory dist` para abrir la página localmente. Ejecuta `node --test tests/*.test.mjs` para comprobar los límites horarios del contador, el horario ajustado y los hitos que se festejan. El horario ajustado se calcula en `dist/contador.mjs` (`calcularHorario`). Los hitos se calculan en `dist/hitos.mjs` y los festejos se dibujan en `dist/festejos.js`.

Edita `dist/programa.js` para cambiar horarios, títulos y ponentes. La fuente es el cartel final en formato tabloide. Cada actividad puede llevar `institucion`, que se muestra junto al nombre. La inauguración del programa empieza a las 09:10. El contador general publicado utiliza las 09:00 y permanece en su página original.

La página utiliza HTML, CSS y JavaScript sin dependencias. No contiene un apartado de difusión ni imágenes generadas.
