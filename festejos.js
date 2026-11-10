import { tazaAnimada } from './receso.js?v=11';

const simbolos = [...'*+·•✦✧×◆◇▪░▒'];
const tintes = ['azul', 'verde', 'acento'];
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const azar = lista => lista[Math.floor(Math.random() * lista.length)];
const centrar = (texto, ancho) => {
  const libre = Math.max(0, ancho - [...texto].length);
  return ' '.repeat(Math.floor(libre / 2)) + texto + ' '.repeat(Math.ceil(libre / 2));
};

const cohete = [
  ['', '', '', '', '|'],
  ['', '', '', '|', '·'],
  ['', '', '|', '·', ''],
  ['', '*', '', '', ''],
  ['\\ | /', '-- * --', '/ | \\', '', ''],
  ['·  ·  ·', '·   ✦   ·', '·  ·  ·', '', ''],
  ['', '.  ·  .', '·     ·', '.     .', ''],
  ['', '', '.     .', '', '.     .'],
  ['', '', '', '', ''],
  ['', '', '', '', '']
].map(filas => filas.map(fila => centrar(fila, 9)).join('\n'));

export const artes = {
  carga: { ms: 140, columnas: [Array.from({ length: 9 }, (_, i) => `[${'='.repeat(i)}>${' '.repeat(8 - i)}]  en curso`)] },
  aplausos: { ms: 260, columnas: [['\\o/  \\o/  \\o/', '_o_  \\o/  _o_', '\\o/  _o_  \\o/', '_o_  _o_  _o_']] },
  cafe: { crear: tazaAnimada },
  estrellas: { ms: 300, columnas: [['·   ✦   ·   ✦', '✦   ·   ✦   ·', '·   ✧   ·   ✧']] },
  fuegos: { ms: 150, columnas: [0, 4, 7].map(fase => cohete.map((_, i) => cohete[(i + fase) % cohete.length])) },
  sesion: ponencias => ({
    ms: 280,
    columnas: [Array.from({ length: ponencias + 4 }, (_, k) => Array.from({ length: ponencias }, (_, i) => i < k ? '[✓]' : '[ ]').join(''))]
  })
};

const cola = [];
const capas = new Set();
let actual = null;
let anuncio = null;
let pausado = false;

export function iniciarFestejos(region) {
  anuncio = region;
  document.addEventListener('fullscreenchange', () => {
    const host = anfitrion();
    capas.forEach(capa => host.append(capa));
    if (actual) host.append(actual.nodo);
  });
}

// En pausa nada se dibuja encima ; los festejos esperan en la cola.
export function pausarFestejos(pausa) {
  if (pausado === pausa) return;
  pausado = pausa;
  if (!pausa) return siguiente();
  if (actual) {
    actual.intervalos.forEach(clearInterval);
    clearTimeout(actual.timer);
    actual.nodo.remove();
    cola.unshift(actual.festejo);
    actual = null;
  }
  capas.forEach(capa => capa.remove());
  capas.clear();
}

export function festejar(festejo) {
  cola.push(festejo);
  if (pausado) return;
  if (!actual) siguiente();
  else {
    // Si llegan varios hitos juntos, cada uno se ve al menos 2.5 s (5 s los grandes).
    clearTimeout(actual.timer);
    actual.timer = setTimeout(cerrar, Math.max(0, actual.inicio + actual.minimo - Date.now()));
  }
}

function anfitrion() {
  return document.fullscreenElement || document.body;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function siguiente() {
  if (pausado) { actual = null; return; }
  const festejo = cola.shift();
  actual = festejo ? mostrar(festejo) : null;
}

function cerrar() {
  if (!actual) return;
  const { nodo, timer, intervalos } = actual;
  clearTimeout(timer);
  intervalos.forEach(clearInterval);
  nodo.classList.add('saliendo');
  setTimeout(() => nodo.remove(), 200);
  siguiente();
}

function mostrar(festejo) {
  const { rotulo, titulo, detalle, progreso, arte, grande = false, lluvia = grande, pista = grande } = festejo;
  const intervalos = [];
  const quieto = reducido();
  const nodo = el('div', `festejo panel${grande ? ' grande' : ''}`);
  nodo.setAttribute('aria-hidden', 'true');
  nodo.append(el('span', 'rotulo', rotulo));

  if (arte) {
    const lienzo = el('div', 'festejo-arte');
    if (arte.crear) lienzo.append(arte.crear().nodo);
    else {
      const columnas = arte.columnas.map((cuadros, i) => {
        const pre = el('pre', `tinte-${arte.columnas.length > 1 ? tintes[i % tintes.length] : 'verde'}`, cuadros[0]);
        lienzo.append(pre);
        return pre;
      });
      if (!quieto) {
        let cuadro = 0;
        intervalos.push(setInterval(() => {
          cuadro++;
          columnas.forEach((pre, i) => { pre.textContent = arte.columnas[i][cuadro % arte.columnas[i].length]; });
        }, arte.ms));
      }
    }
    nodo.append(lienzo);
  }

  const linea = el('p', 'festejo-titulo');
  const texto = el('span');
  linea.append(texto, el('span', 'festejo-cursor', '█'));
  nodo.append(linea);
  if (quieto) texto.textContent = titulo;
  else {
    const letras = [...titulo];
    let escritas = 0;
    const id = setInterval(() => {
      texto.textContent = letras.slice(0, ++escritas).join('');
      if (escritas >= letras.length) clearInterval(id);
    }, 24);
    intervalos.push(id);
  }
  if (detalle) nodo.append(el('p', 'festejo-detalle', detalle));
  if (progreso) {
    const [valor, total] = progreso;
    const lleno = Math.round(valor / total * 20);
    nodo.append(el('p', 'festejo-progreso', `[${'█'.repeat(lleno)}${'░'.repeat(20 - lleno)}] ${String(valor).padStart(String(total).length, '0')}/${total}`));
  }
  if (pista) nodo.append(el('p', 'festejo-pista', '[ clic para continuar ]'));
  nodo.addEventListener('click', () => { if (actual?.nodo === nodo) cerrar(); });

  anfitrion().append(nodo);
  if (anuncio) anuncio.textContent = [titulo, detalle].filter(Boolean).join('. ');
  if (!quieto) confeti(lluvia ? 'lluvia' : 'estallido', nodo.getBoundingClientRect(), grande ? 80 : 26);
  return { festejo, nodo, intervalos, inicio: Date.now(), minimo: grande ? 5000 : 2500, timer: setTimeout(cerrar, grande ? 8000 : 5000) };
}

function confeti(modo, caja, cantidad) {
  const capa = el('div', `confeti ${modo}`);
  capa.setAttribute('aria-hidden', 'true');
  const piezas = [];
  let duracion = 0;
  for (let i = 0; i < cantidad; i++) {
    const pieza = el('span', `tinte-${tintes[i % tintes.length]}`, azar(simbolos));
    const dur = modo === 'lluvia' ? 2.4 + Math.random() * 2.4 : 0.8 + Math.random() * 0.8;
    const espera = modo === 'lluvia' ? Math.random() * 1.8 : Math.random() * 0.12;
    duracion = Math.max(duracion, dur + espera);
    pieza.style.animationDuration = `${dur}s`;
    pieza.style.animationDelay = `${espera}s`;
    pieza.style.fontSize = `${14 + Math.random() * 16}px`;
    if (modo === 'lluvia') {
      pieza.style.left = `${Math.random() * 100}%`;
      pieza.style.setProperty('--dx', `${(Math.random() - 0.5) * 18}vw`);
      pieza.style.setProperty('--giro', `${(Math.random() - 0.5) * 720}deg`);
    } else {
      const angulo = Math.PI * (1.08 + Math.random() * 0.84);
      const distancia = 70 + Math.random() * 130;
      pieza.style.left = `${caja.left + Math.random() * caja.width}px`;
      pieza.style.top = `${caja.top + 8}px`;
      pieza.style.setProperty('--dx', `${Math.cos(angulo) * distancia}px`);
      pieza.style.setProperty('--dy', `${Math.sin(angulo) * distancia}px`);
    }
    piezas.push(pieza);
  }
  capa.append(...piezas);
  anfitrion().append(capa);
  capas.add(capa);
  // Los símbolos cambian mientras caen, como en una terminal.
  const parpadeo = setInterval(() => {
    for (const pieza of piezas) if (Math.random() < 0.25) pieza.textContent = azar(simbolos);
  }, 120);
  setTimeout(() => { clearInterval(parpadeo); capa.remove(); capas.delete(capa); }, duracion * 1000 + 200);
}
