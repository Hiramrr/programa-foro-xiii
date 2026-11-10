// Taza de café en arte ASCII para los recesos: el vapor sube animado y cada bloque lleva su color.
const vapor = String.raw`
                              ░░              ░░              ░░
                              ░░              ░░              ░░
                                ░░              ░░              ░░
                                ░░              ░░              ░░
                              ░░              ░░              ░░
                              ░░              ░░              ░░
                            ░░              ░░              ░░
                            ░░              ░░              ░░
                              ░░              ░░              ░░
                              ░░              ░░              ░░
                                ░░              ░░              ░░
                                ░░              ░░              ░░
                              ░░              ░░              ░░
                              ░░              ░░              ░░
`.split('\n').slice(1, -1);

const taza = String.raw`

                                    ▓▓██████████████████████
                            ████████                        ████████
                        ████        ████████████████████████        ████
                      ██░░    ██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒██▓▓██  ░░░░██
                    ██    ████▒▒▓▓▓▓▓▓▓▓░░░░░░▓▓▓▓░░░░░░▓▓▓▓▒▒▓▓▓▓████    ██
                  ██    ██▓▓▓▓▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓░░░░▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓▒▒▓▓██    ██
                  ██  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓▓▓▒▒▓▓▓▓  ██  ██▓▓▓▓▓▓██
                  ██  ██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒██  ████          ██
                  ██    ██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██    ██              ██
                    ██  ░░████▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓████░░  ██░░    ████      ██
                    ██        ██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██████        ██  ████    ██    ██
                    ██              ████████████████████████              ████        ██    ██
                    ██                ░░  ░░░░░░░░░░░░░░░░░░              ██          ██    ██
                ██████                                                    ██████    ██      ██
            ████    ██                                                    ██    ██  ██    ██
        ░░██▒▒░░    ▒▒▓▓                                                ▓▓▒▒    ░░██▒▒    ██
      ▓▓  ░░          ██                                                ██  ██████      ▓▓
    ██                ██                                                ████        ████  ██
  ██                  ░░██                                            ██░░░░    ████░░░░  ░░██
  ██                ██████                                            ██████████░░░░        ██
██                ██▒▒░░▒▒██                                        ██▒▒▒▒██                  ██
██              ██▒▒██▒▒▒▒██                                        ██▒▒▒▒▒▒██                ██
██              ██░░▓▓████▒▒▓▓                                    ▓▓▒▒██░░▒▒██                ██
  ██            ██▒▒██▓▓░░▒▒▒▒██                                ██▒▒░░▒▒████                ██
  ██              ██░░██▒▒████▒▒████                        ████▒▒██▒▒██▒▒██                ██
    ██            ██▒▒▒▒██▓▓░░▒▒░░▒▒██▓▓▓▓            ▓▓▓▓██▒▒██▒▒░░██▒▒░░██              ██
      ██            ██████▒▒▒▒▒▒██████▒▒▒▒████████████▒▒██▒▒▒▒▓▓██▒▒▒▒████░░            ██
        ██                ██████░░▒▒██░░▒▒██▒▒▒▒░░▒▒██▒▒▒▒██░░▒▒▒▒████                ██
          ████                ██▒▒▒▒▓▓▒▒▒▒██░░▒▒████▒▒░░▒▒▒▒██████                ████
          ░░  ████              ████  ████░░████░░░░████████    ░░            ████
                  ████                                                    ████
                      ██▓▓▓▓██                                    ▓▓▓▓▓▓██
                              ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
`.split('\n').slice(1, -1);

const ancho = 96;
// Filas de la superficie del café (dentro del borde de la taza): ahí ▓ es café y ░ es la crema.
// El asa de la derecha (desde la columna 76) no lleva café.
const cafe = (fila, columna) => fila >= 4 && fila <= 11 && columna < 76;
const tono = (caracter, fila, columna) => caracter === '█' ? 'tz-borde'
  : caracter === '▓' ? (cafe(fila, columna) ? 'tz-cafe' : 'tz-sombra')
  : caracter === '▒' ? (cafe(fila, columna) ? 'tz-reflejo' : 'tz-plato')
  : caracter === '░' ? (cafe(fila, columna) ? 'tz-crema' : 'tz-brillo') : '';

function pintar(lineas) {
  const pre = document.createElement('pre');
  pre.className = 'tz-cuerpo';
  lineas.forEach((linea, fila) => {
    // Agrupa los caracteres iguales seguidos en un solo span del mismo color.
    for (const { 0: tramo, index: columna } of linea.padEnd(ancho).matchAll(/(.)\1*/gu)) {
      const clase = tono(tramo[0], fila, columna);
      if (!clase) { pre.append(tramo); continue; }
      const span = document.createElement('span');
      span.className = clase;
      span.textContent = tramo;
      pre.append(span);
    }
    pre.append('\n');
  });
  return pre;
}

export function tazaAnimada() {
  const nodo = document.createElement('div');
  nodo.className = 'taza';
  nodo.setAttribute('aria-hidden', 'true');
  const humo = document.createElement('pre');
  humo.className = 'tz-vapor';
  let cuadro = 0;
  // Cada cuadro sube una fila el vapor; al repetirse el patrón parece que el humo ondula hacia arriba.
  const dibujar = () => {
    humo.textContent = vapor.map((_, i) => vapor[(i + cuadro) % vapor.length].padEnd(ancho)).join('\n');
  };
  dibujar();
  nodo.append(humo, pintar(taza));
  let intervalo = null;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    intervalo = setInterval(() => {
      // Si la taza ya no está en pantalla, deja de animarse sola.
      if (cuadro > 2 && !nodo.isConnected) return clearInterval(intervalo);
      cuadro = (cuadro + 1) % vapor.length;
      dibujar();
    }, 180);
  }
  return { nodo, detener: () => { clearInterval(intervalo); nodo.classList.add('detenida'); } };
}
