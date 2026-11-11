# Programa del XIII Foro

Publicado en https://hiramrr.github.io/programa-foro-xiii/.

Página independiente del contador publicado en https://hiramrr.github.io/contador-foro-xiii/. Conserva su tipografía monoespaciada, colores y paneles con bordes finos.

El programa tiene un contador por actividad. Antes de cada conferencia y durante sus primeros cinco minutos, el contador proyectado muestra junto a la cuenta el QR de registro (`dist/assets/qr-registro.png`; los minutos se cambian con `qrMinutos` en `dist/app.js`). El botón «▦ Mostrar QR» / «▦ Ocultar QR» de la proyección y del panel de control lo pone o lo quita en la actividad actual, también en los recesos; el cambio se comparte con todas las pantallas, se puede deshacer y al pasar a otra actividad vuelve el comportamiento automático. Antes de iniciar cuenta hasta el comienzo, durante la conferencia cuenta hasta el final y después indica que terminó. El contador de cada conferencia se puede mostrar en pantalla completa.

La página está pensada para que la opere cualquier persona: al inicio hay tres botones grandes con explicación («Proyectar en automático», «Abrir control de tiempos» y «Ensayo guiado») y una guía rápida desplegable.

El modo automático sigue el horario real y al terminar cada participación pasa directo al siguiente contador. El **ensayo guiado** corre una agenda corta de prueba (inauguración, conferencia, receso y otra conferencia) que no toca el horario real ni se comparte con las demás pantallas. Una tarjeta en la esquina superior izquierda explica cada situación en 15 pasos, resalta en verde el botón que hay que pulsar y avanza sola cuando la persona lo hace: esperar la hora, iniciar la inauguración, sumar y quitar minutos, otra cantidad, deshacer, tiempo extra, terminar, pasar a la siguiente, los demás botones, mostrar u ocultar el QR y el receso. Cada paso se puede saltar. Durante el ensayo los controles se quedan fijos en pantalla.

Cada hito del foro tiene un mini festejo con estilo de terminal: arte ASCII animado, texto que se escribe con cursor, barra de progreso del foro y confeti de símbolos. Se festejan el inicio del foro y de cada día, el inicio y el fin de cada participación, cada sesión completada, la mitad del foro, el cierre de cada día y la clausura. Los últimos diez segundos antes de cada actividad se marcan como cuenta final. Los festejos aparecen en pantalla completa y respetan la preferencia de movimiento reducido. Tras una pausa larga del navegador no se festejan hitos atrasados.

Cada receso tiene su propia pantalla: una taza de café en arte ASCII a color con vapor animado (`dist/receso.js`), la cuenta para regresar y la actividad que sigue. El aviso pequeño usa la misma taza. Se abre sola al empezar el receso, también desde el botón «Proyectar receso» del programa, y al terminar pasa sola al contador de la siguiente actividad.

## Códigos QR

Debajo de los botones principales está la sección «Códigos QR» con el registro al foro y los formularios de opinión de conferencias, evaluación general del foro y evaluación de carteles (`dist/assets/qr-*.png`, tomados de los PDF del foro; la lista está en `codigos`, en `dist/app.js`). «▶ Mostrar en pantalla» abre la proyección (en modo automático) con ese código en grande encima, y lo pone también en todas las demás pantallas; se queda hasta pulsar «■ Quitar QR grande» en los controles de la proyección (o «■ Quitar de pantallas» en la sección), y entonces se ve el contador o receso que toca. Se comparte por la misma sincronización que los tiempos.

## Control de tiempos

Las participaciones pueden durar más o menos de lo programado. El botón «Control de tiempos» abre un panel para quien opera la proyección. El panel muestra la actividad en curso o la siguiente, su cuenta y el retraso o adelanto respecto al programa.

- **−5, −1, +1, +5 y +10 min** cambian la hora de término de la actividad en curso. Antes de que empiece, mueven su inicio. «Otra cantidad» permite quitar o agregar cualquier número de minutos (1 a 180).
- **Terminar ahora** cierra la actividad en curso y empieza la siguiente.
- **Iniciar ahora** arranca la siguiente actividad de inmediato. Si había algo en curso, lo termina.
- **Reiniciar desde ahora** cuenta de nuevo el tiempo completo, por ejemplo si el ponente tardó en conectarse.
- **Omitir** está en cada actividad del programa y la saca del horario (para ausencias). «Restaurar» la devuelve.
- **Deshacer** revierte el último ajuste. **Volver al horario original** pide confirmación, regresa al programa original y también se puede deshacer.

Por defecto («Seguir contando tiempo extra»), la actividad que agota su tiempo no se corta: la cuenta sigue como tiempo extra y solo cambia de color (naranja, sin parpadeos). Lo que sigue queda en espera hasta que se pulsa «Terminar ahora» (o →); en ese momento la siguiente actividad empieza con su duración completa, así los tiempos se llevan en tiempo real. Esto funciona siempre, aunque el panel de control esté cerrado. Los recesos terminan solos. Con «Pasar sola a la siguiente actividad», cada actividad termina a su hora. En los últimos cinco minutos (o el último cuarto de una actividad corta) la cuenta cambia a ámbar.

Los retrasos se arrastran a todo lo que sigue en el día. Terminar antes recupera el retraso, pero nada empieza antes de su hora programada, salvo con «Iniciar ahora». Cada actividad desplazada muestra su horario programado y el desfase. Los festejos, la pantalla de receso y el modo automático usan el horario ajustado. Los ajustes del horario real solo se habilitan el día del evento. La prueba rápida usa ajustes propios que no tocan el horario real.

Todo se opera desde la pantalla proyectada, sin salir de ella y también en modo automático. Al mover el ratón aparecen en la esquina inferior derecha unos controles pequeños y translúcidos: −5, −1, +1 y +5 min, otra cantidad, «Terminar ahora» o «Iniciar ahora», «Reiniciar», «Deshacer», «◀ Anterior» y «Siguiente ▶» para cambiar de actividad, «Automático» para activar o pausar el modo automático, «Pantalla completa» y «Salir». A los tres segundos se ocultan solos, igual que el cursor. Sin modo automático, «Terminar ahora» pasa sola a lo que sigue. Los atajos no muestran nada en pantalla: → o Avance de página para terminar o iniciar, ← o Retroceso de página para deshacer, ↑/↓ para ±1 min (con Mayús ±5), R para reiniciar y F para pantalla completa. Esc solo quita la pantalla completa y no cierra la proyección. La pantalla no se apaga mientras se proyecta o el control está activo.

La primera actividad de cada día (la inauguración el jueves y la conferencia magistral el viernes) no arranca sola: hasta su hora muestra la cuenta para comenzar y después «Empezando…» hasta que alguien pulsa «Iniciar ahora» o →. Mientras tanto todo lo que sigue se recorre. Con «Pasar sola a la siguiente actividad» arranca a su hora.

## Sincronización entre pantallas

Los ajustes se guardan en el navegador y se comparten con todas las pantallas que tengan la página abierta, en cualquier dispositivo con internet. Lo que se hace en una (iniciar, terminar, sumar o quitar minutos, omitir, deshacer, la preferencia de tiempo extra) aparece en las demás en uno o dos segundos. Funciona con [ntfy.sh](https://ntfy.sh), un servicio público de mensajes que no pide cuenta (`dist/sync.js`). Cada cambio publica el horario ajustado completo en el canal fijado en `dist/app.js` (`canal`). Al abrir la página, cada pantalla recibe el último estado publicado (ntfy lo guarda 12 horas). Solo viajan horas de inicio y fin. Quien lea el código de la página puede ver el canal. Con reloj simulado se usa un canal aparte (`…-prueba`). Sin conexión, la pantalla sigue con su propio horario y el aviso «○ Sin conexión»; los cambios pendientes se envían al volver la red. El estado de la conexión aparece en la página principal, en el panel de control y en los controles de la proyección.

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
