const tintes = ['azul', 'azul', 'verde', 'verde', 'acento'];
const barrido = 420;
const desfase = 160;
const bloque = 240;
const pausa = 520;
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const azar = lista => lista[Math.floor(Math.random() * lista.length)];
const espera = ms => new Promise(listo => setTimeout(listo, ms));
const vivas = new Set();
let cubriendo = null;

function anfitrion() {
  return document.fullscreenElement || document.body;
}

function colocar(capa) {
  const host = anfitrion();
  if (capa.parentNode !== host) host.append(capa);
}

document.addEventListener('fullscreenchange', () => vivas.forEach(colocar));

// Cubre la pantalla con bloques, ejecuta el cambio debajo y la vuelve a descubrir.
// Si llega otro cambio mientras la pantalla sigue cubierta, se ejecuta en la misma transición.
export function transicion(cambio, rotulo = '') {
  if (cubriendo) {
    if (cambio) cubriendo.cambios.push(cambio);
    if (rotulo) rotular(cubriendo, rotulo);
    return cubriendo.fin;
  }
  if (reducido()) return Promise.resolve().then(cambio);
  const actual = crear(rotulo);
  actual.cambios = cambio ? [cambio] : [];
  cubriendo = actual;
  actual.fin = correr(actual);
  return actual.fin;
}

function rotular({ rotulo }, texto) {
  rotulo.firstChild.textContent = texto;
  rotulo.hidden = !texto;
}

function crear(texto) {
  const lado = Math.max(72, Math.round(Math.min(innerWidth, innerHeight) / 6));
  const columnas = Math.ceil(innerWidth / lado);
  const filas = Math.ceil(innerHeight / lado);
  const diagonal = Math.max(1, columnas + filas - 2);
  // Cada transición barre desde una esquina distinta.
  const [derecha, abajo] = [Math.random() < 0.5, Math.random() < 0.5];
  const capa = document.createElement('div');
  capa.className = 'transicion';
  capa.setAttribute('aria-hidden', 'true');
  capa.style.setProperty('--lado', `${lado}px`);
  capa.style.gridTemplateColumns = `repeat(${columnas}, var(--lado))`;
  for (let fila = 0; fila < filas; fila++) {
    for (let columna = 0; columna < columnas; columna++) {
      const cuadro = document.createElement('i');
      cuadro.className = azar(tintes);
      const orden = (derecha ? columnas - 1 - columna : columna) + (abajo ? filas - 1 - fila : fila);
      cuadro.style.animationDelay = `${Math.round(orden / diagonal * barrido + Math.random() * desfase)}ms`;
      capa.append(cuadro);
    }
  }
  const rotulo = document.createElement('p');
  rotulo.className = 'transicion-rotulo';
  const cursor = document.createElement('span');
  cursor.textContent = '█';
  rotulo.append(document.createTextNode(''), cursor);
  const actual = { capa, rotulo };
  rotular(actual, texto);
  capa.append(rotulo);
  colocar(capa);
  vivas.add(capa);
  return actual;
}

async function correr(actual) {
  const { capa } = actual;
  const recorrido = barrido + desfase + bloque;
  const ejecutar = async () => {
    while (actual.cambios.length) {
      // Un cambio que tarda (por ejemplo, la pantalla completa) no deja la pantalla cubierta.
      try { await Promise.race([actual.cambios.shift()(), espera(2000)]); } catch (error) { console.error(error); }
    }
  };
  try {
    await espera(recorrido);
    capa.classList.add('cubierta');
    await Promise.all([ejecutar(), espera(pausa)]);
    await ejecutar();
  } finally {
    cubriendo = null;
    colocar(capa);
    capa.classList.remove('cubierta');
    capa.classList.add('saliendo');
    await espera(recorrido);
    capa.remove();
    vivas.delete(capa);
  }
}
