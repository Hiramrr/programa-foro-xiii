import { simulado } from './reloj.js?v=9';
import { programa } from './programa.js?v=2';
import { estadoActividad, estadoAutomatico, calcularHorario, desglose } from './contador.mjs?v=13';
import { hitosEntre } from './hitos.mjs?v=8';
import { artes, festejar, iniciarFestejos } from './festejos.js?v=10';
import { transicion } from './transicion.js?v=8';
import { tazaAnimada } from './receso.js?v=11';
import { crearSync } from './sync.js?v=1';

const $ = selector => document.querySelector(selector);
// Con reloj simulado (pruebas.html) los ajustes de horario se guardan aparte para no tocar los reales.
const horarioKey = simulado ? 'xiii-foro-horario-prueba' : 'xiii-foro-horario-v1';
const controlKey = 'xiii-foro-control-v1';
// Canal de ntfy.sh por el que se comparten los ajustes con todas las pantallas. Con reloj simulado se usa otro.
const canal = 'xiii-foro-dcc-2026-b86c97c36ea85009' + (simulado ? '-prueba' : '');
const syncKey = simulado ? 'xiii-foro-sync-prueba' : 'xiii-foro-sync-v1';
const codigoKey = simulado ? 'xiii-foro-codigo-prueba' : 'xiii-foro-codigo-v1';
// Códigos QR que se pueden poner en grande en todas las pantallas.
const codigos = [
  { id: 'registro', titulo: 'Registro al foro', detalle: 'También sale solo antes de cada conferencia.', imagen: 'assets/qr-registro.png', ancho: 960, alto: 1610 },
  { id: 'opinion', titulo: 'Opinión de conferencias', detalle: 'Para que el público opine de cada conferencia.', imagen: 'assets/qr-opinion-conferencias.png', ancho: 1105, alto: 1430 },
  { id: 'general', titulo: 'Evaluación general del foro', detalle: 'Ideal al cierre de cada día o en la clausura.', imagen: 'assets/qr-evaluacion-general.png', ancho: 1105, alto: 1430 },
  { id: 'carteles', titulo: 'Evaluación de carteles', detalle: 'Durante la presentación de carteles.', imagen: 'assets/qr-evaluacion-carteles.png', ancho: 1105, alto: 1430 }
];
const codigoPorId = id => codigos.find(c => c.id === id) || null;
// El código que está en grande en las pantallas (o null).
let codigoEnPantalla = codigoPorId(leer(codigoKey).id)?.id || null;
const minuto = 60000;
// El QR de registro se muestra antes de cada conferencia y durante sus primeros minutos.
const qrMinutos = 5;
const formatoHora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Mexico_City' });
const formatoFecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' });
// Las horas se redondean al minuto más cercano, igual que los desfases.
const hora = ms => formatoHora.format(Math.round(ms / 60000) * 60000);
const hoy = ms => formatoFecha.format(ms);
const records = new Map();
for (const [day, data] of Object.entries(programa)) {
  for (const activity of data.activities) {
    const key = `${day}-${activity.start}`;
    // La primera actividad de cada día arranca solo cuando el operador la inicia.
    records.set(key, { ...activity, key, day, manual: activity === data.activities[0],
      // En pantalla se muestra la institución; el agradecimiento lleva solo el nombre.
      speaker: [activity.speaker, activity.institucion].filter(Boolean).join(' · '),
      recipient: /^(Estudiantes|Participantes|Moderan)/.test(activity.speaker || '') ? '' : activity.speaker || '',
      startMs: Date.parse(`${data.date}T${activity.start}:00-06:00`),
      endMs: Date.parse(`${data.date}T${activity.end}:00-06:00`) });
  }
}

function leer(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch { return {}; } // La página funciona en esta pestaña si el almacenamiento está bloqueado.
}

function guardar(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

function leerAjustes(origen = leer(horarioKey)) {
  const valid = {};
  for (const [key, value] of Object.entries(origen && typeof origen === 'object' ? origen : {})) {
    if (!records.has(key) || !value || typeof value !== 'object') continue;
    const ajuste = {};
    for (const campo of ['inicio', 'fin', 'extra']) if (Number.isFinite(value[campo])) ajuste[campo] = value[campo];
    if (value.omitida === true) ajuste.omitida = true;
    if (typeof value.qr === 'boolean') ajuste.qr = value.qr;
    if (Object.keys(ajuste).length) valid[key] = ajuste;
  }
  return valid;
}

function leerControl() {
  const stored = leer(controlKey);
  return { activo: stored.activo === true, esperar: stored.esperar !== false };
}

let control = leerControl();
// El horario real: el programa más los ajustes del operador (retrasos, finales anticipados, omisiones).
const real = { lista: [...records.values()], ajustes: leerAjustes(), historial: [], persistente: true };

let day = Object.keys(programa).find(key => programa[key].date === hoy(Date.now())) || 'jueves';
let filas = [];
let vista = null;
let panelClock = null;
let lastTrigger = null;
let hadFullscreen = false;
let controlsTimeout;
let avisoTimeout;
let automatic = null;
let wakeLock = null;
let pidiendoPantalla = false;
let lastTick = Date.now();
const normalize = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function action(label, type, key) {
  const button = element('button', '', label);
  button.type = 'button';
  button.dataset.action = type;
  button.dataset.key = key;
  return button;
}

// Calcula el horario de cada día. Con espera activa, la actividad en curso se registra como iniciada
// para que, si agota su tiempo, quede en tiempo extra hasta que el operador la termine.
function horario(timeline, now) {
  const dias = new Map();
  for (const record of timeline.lista) dias.set(record.day, [...(dias.get(record.day) || []), record]);
  // El tiempo extra corre solo: al agotarse el tiempo la cuenta sigue (en otro color) hasta que se termina.
  const esperar = control.esperar;
  const lista = [...dias.values()].flatMap(actividades => calcularHorario(actividades, timeline.ajustes, now, { esperar }));
  if (!esperar) return lista;
  const iniciadas = lista.filter(r => r.kind !== 'break' && !r.omitida && !r.enEspera && !r.porIniciar && r.startMs <= now && now < r.endMs && timeline.ajustes[r.key]?.inicio == null);
  if (!iniciadas.length) return lista;
  for (const r of iniciadas) timeline.ajustes[r.key] = { ...timeline.ajustes[r.key], inicio: r.startMs };
  if (timeline.persistente) guardar(horarioKey, timeline.ajustes);
  return horario(timeline, now);
}

function estadoDe(record, now) {
  if (record.omitida) return 'omitida';
  if (record.tiempoExtra) return 'extra';
  if (record.porIniciar) return 'porIniciar';
  if (record.enEspera && record.startMs <= now) return 'espera';
  return estadoActividad(record.startMs, record.endMs, now).tipo;
}

const enCurso = (record, now) => ['durante', 'extra'].includes(estadoDe(record, now));

function objetivo(lista, now) {
  const activas = lista.filter(r => !r.omitida);
  return activas.find(r => enCurso(r, now)) || activas.find(r => ['antes', 'espera', 'porIniciar'].includes(estadoDe(r, now)));
}

// Fuera del día del evento los ajustes del horario real se bloquean; el ensayo siempre se puede ajustar.
function editable(timeline, record, now) {
  return !timeline.persistente || programa[record.day]?.date === hoy(now);
}

function createClock(record, progreso = false) {
  const root = element('div', 'contador-actividad');
  root.setAttribute('role', 'timer');
  root.setAttribute('aria-live', 'off');
  const label = element('span', 'cuenta-rotulo');
  const digits = element('div', 'cuenta');
  const values = {};
  for (const [unit, name] of [['dias', 'días'], ['horas', 'h'], ['minutos', 'min'], ['segundos', 's']]) {
    if (digits.childElementCount) {
      const separator = element('span', 'separador', ':');
      separator.setAttribute('aria-hidden', 'true');
      digits.append(separator);
    }
    const group = element('div', 'unidad');
    values[unit] = element('span', 'numero', '00');
    group.append(values[unit], element('span', 'nombre-unidad', name));
    digits.append(group);
  }
  const finished = element('p', 'cuenta-finalizada', 'Finalizada');
  root.append(label, digits, finished);
  const clock = { root, record, label, digits, values, finished, progreso: null };
  if (progreso) {
    clock.progreso = element('div', 'progreso');
    clock.progreso.setAttribute('aria-hidden', 'true');
    clock.progreso.append(element('span'));
    root.append(clock.progreso);
  }
  return clock;
}

const rotulos = { antes: '[ inicia en ]', durante: '[ termina en ]', extra: '[ tiempo extra ]', espera: '[ en espera ]', porIniciar: '[ por comenzar ]', despues: '[ finalizada ]', omitida: '[ omitida ]' };
const mensajes = { espera: 'Al terminar la anterior', porIniciar: 'Empezando…', despues: 'Finalizada', omitida: 'Omitida' };
const lecturas = { antes: 'Inicia en', durante: 'Termina en', extra: 'Tiempo extra de', espera: 'Inicia al terminar la actividad anterior', porIniciar: 'Empezando en unos momentos', despues: 'Actividad finalizada', omitida: 'Actividad omitida' };

function updateClock(clock, now) {
  const record = clock.record;
  const estado = estadoDe(record, now);
  const partes = estado === 'antes' || estado === 'durante' ? estadoActividad(record.startMs, record.endMs, now)
    : estado === 'extra' ? desglose((now - record.endMs) / 1000) : null;
  const duracion = record.endMs - record.startMs;
  const final = estado === 'antes' && !partes.dias && !partes.horas && !partes.minutos && partes.segundos <= 10;
  clock.root.dataset.estado = estado;
  clock.root.dataset.final = String(final);
  // Aviso en los últimos cinco minutos (o el último cuarto si la actividad es corta) y alerta en tiempo extra.
  clock.root.dataset.nivel = estado === 'extra' ? 'alerta' : estado === 'durante' && record.endMs - now <= Math.min(5 * minuto, duracion / 4) ? 'aviso' : '';
  clock.label.textContent = final ? '[ cuenta final ]' : estado === 'durante' && record.kind === 'break' ? '[ regresamos en ]' : rotulos[estado];
  clock.digits.hidden = !partes;
  clock.finished.hidden = Boolean(partes);
  clock.finished.textContent = mensajes[estado] || '';
  if (partes) {
    clock.digits.dataset.dias = String(partes.dias > 0);
    for (const unit of Object.keys(clock.values)) clock.values[unit].textContent = String(partes[unit]).padStart(2, '0');
  }
  if (clock.progreso) {
    clock.progreso.hidden = estado !== 'durante' && estado !== 'extra';
    const avance = estado === 'extra' || duracion <= 0 ? 100 : Math.min(100, Math.max(0, (now - record.startMs) / duracion * 100));
    clock.progreso.firstElementChild.style.width = `${avance}%`;
  }
  clock.root.setAttribute('aria-label', partes ? `${lecturas[estado]} ${partes.dias} días, ${partes.horas} horas, ${partes.minutos} minutos y ${partes.segundos} segundos` : lecturas[estado]);
}

function textoDesfase(record) {
  if (record.omitida) return '';
  const inicio = Math.round((record.startMs - record.plannedStartMs) / minuto);
  const fin = Math.round((record.endMs - record.plannedEndMs) / minuto);
  if (!inicio && !fin) return '';
  const signo = n => `${n > 0 ? '+' : '−'}${Math.abs(n)} min`;
  const cambio = inicio === fin ? signo(inicio) : [inicio && `inicio ${signo(inicio)}`, fin && `fin ${signo(fin)}`].filter(Boolean).join(' · ');
  return `Programada ${hora(record.plannedStartMs)} a ${hora(record.plannedEndMs)} · ${cambio}`;
}

function updateFila(fila, record, now) {
  fila.record = record;
  const estado = estadoDe(record, now);
  fila.row.dataset.estado = estado;
  const texto = record.omitida ? `${hora(record.plannedStartMs)} a ${hora(record.plannedEndMs)}` : `${hora(record.startMs)} a ${hora(record.endMs)}`;
  fila.rotulo.textContent = fila.clock ? `[ ${texto} ]` : texto;
  fila.original.textContent = textoDesfase(record);
  fila.original.hidden = !fila.original.textContent;
  fila.omitir.hidden = !control.activo || estado === 'despues';
  fila.omitir.textContent = record.omitida ? 'Restaurar' : 'Omitir';
  if (fila.clock) {
    fila.clock.record = record;
    updateClock(fila.clock, now);
  }
}

function setControlesTiempo(grupo, record, now, timeline, { permitido = true } = {}) {
  const estado = record ? estadoDe(record, now) : 'despues';
  const curso = estado === 'durante' || estado === 'extra';
  const botones = accion => [...grupo.querySelectorAll(`[data-control="${accion}"]`)];
  const ajustable = permitido && (curso || estado === 'antes');
  [...botones('ajustar'), ...botones('personalizado')].forEach(button => { button.disabled = !ajustable; });
  // Antes de empezar, sumar o restar minutos mueve el inicio; en curso cambia la hora de término.
  grupo.querySelectorAll('[data-que-ajusta]').forEach(nodo => {
    nodo.textContent = curso ? 'Cambiar la hora de término' : 'Mover la hora de inicio';
  });
  const [avanzar] = botones('avanzar');
  avanzar.textContent = curso ? '■ Terminar ahora' : '▶ Iniciar ahora';
  avanzar.disabled = !permitido || !(curso || ['antes', 'espera', 'porIniciar'].includes(estado));
  const [reiniciar] = botones('reiniciar');
  reiniciar.hidden = !curso;
  reiniciar.disabled = !permitido;
  botones('deshacer')[0].disabled = !timeline.historial.length;
}

function updateEnVivo(lista, now) {
  $('#en-vivo').hidden = !control.activo;
  if (!control.activo) return;
  const record = objetivo(lista, now);
  const permitido = Boolean(record) && editable(real, record, now);
  setControlesTiempo($('#ajustes-tiempo'), record, now, real, { permitido });
  $('#nota-control').hidden = !record || permitido;
  if (!record) {
    panelClock = null;
    $('#en-vivo-reloj').replaceChildren();
    $('#en-vivo-estado').textContent = 'Sin actividades pendientes';
    $('#en-vivo-titulo').textContent = 'Programa concluido';
    $('#en-vivo-ponente').hidden = true;
    $('#en-vivo-desfase').textContent = '';
    return;
  }
  if (panelClock?.record.key !== record.key) {
    panelClock = createClock(record, true);
    $('#en-vivo-reloj').replaceChildren(panelClock.root);
  }
  panelClock.record = record;
  updateClock(panelClock, now);
  $('#panel-qr').textContent = qrVisible(record, real, now) ? '▦ Ocultar QR en pantallas' : '▦ Mostrar QR en pantallas';
  const estado = estadoDe(record, now);
  $('#en-vivo-estado').textContent = `${{ durante: '● En curso', extra: '● Tiempo cumplido', antes: 'Siguiente', espera: 'Siguiente', porIniciar: '◌ Esperando a que la inicies' }[estado]} · ${hora(record.startMs)} a ${record.tiempoExtra ? 'ya' : hora(record.endMs)}`;
  $('#en-vivo-titulo').textContent = record.title;
  $('#en-vivo-ponente').textContent = record.speaker || '';
  $('#en-vivo-ponente').hidden = !record.speaker;
  const desfase = Math.round(((record.tiempoExtra ? now : record.endMs) - record.plannedEndMs) / minuto);
  $('#en-vivo-desfase').textContent = desfase > 0 ? `Retraso de ${desfase} min respecto al programa` : desfase < 0 ? `Adelanto de ${-desfase} min respecto al programa` : 'En horario';
  $('#en-vivo-desfase').dataset.retraso = String(desfase > 0);
}

// El QR sale antes de cada conferencia y en sus primeros minutos, salvo que se haya mostrado u ocultado a mano.
function qrVisible(record, timeline, now) {
  const manual = timeline.ajustes[record.key]?.qr;
  if (typeof manual === 'boolean') return manual;
  const estado = estadoDe(record, now);
  return record.kind !== 'break' && (['antes', 'espera', 'porIniciar'].includes(estado) || (estado === 'durante' && now - record.startMs < qrMinutos * minuto));
}

function crearQr() {
  const qr = element('figure', 'qr-registro');
  const imagen = element('img');
  imagen.src = 'assets/qr-registro.png';
  imagen.width = 960;
  imagen.height = 1610;
  imagen.alt = 'Código QR para el registro al XIII Foro de Divulgación Científica en Ciencias de la Computación 2026';
  qr.append(imagen);
  return qr;
}

function updateVista(now) {
  const grupo = $('#proyeccion-tiempo');
  const lista = vista ? horario(vista.timeline, now) : [];
  const record = lista.find(r => r.key === vista?.key);
  // Los controles siempre están a la mano (también en modo automático). Fuera del día del evento se ven desactivados.
  const permitido = Boolean(record) && editable(vista.timeline, record, now);
  grupo.hidden = !record;
  $('#proy-nota').hidden = !record || permitido;
  if (record) setControlesTiempo(grupo, record, now, vista.timeline, { permitido });
  $('#proy-qr').hidden = !record;
  if (record) $('#proy-qr').textContent = qrVisible(record, vista.timeline, now) ? '▦ Ocultar QR' : '▦ Mostrar QR';
  $('#proy-auto').setAttribute('aria-pressed', String(Boolean(automatic)));
  $('#proy-auto').textContent = automatic ? '⟳ Automático: sí' : '⟳ Automático: no';
  for (const id of ['#proy-auto', '#proy-anterior', '#proy-siguiente']) $(id).hidden = !vista;
  if (!record || !vista.clock) return;
  vista.clock.record = record;
  updateClock(vista.clock, now);
  if (vista.panel) vista.panel.dataset.qr = String(qrVisible(record, vista.timeline, now));
  const proxima = lista.slice(lista.indexOf(record) + 1).find(r => r.day === record.day && r.kind !== 'break' && !r.omitida);
  vista.siguiente.hidden = !proxima;
  if (proxima) vista.siguiente.textContent = ['A continuación', !proxima.enEspera && hora(proxima.startMs), proxima.title, proxima.speaker].filter(Boolean).join(' · ');
}

// Al terminar un receso que se vio en curso, la pantalla pasa sola al contador de lo que sigue.
// En modo automático este cambio lo decide advanceAutomatic.
function terminarReceso(now) {
  if (automatic || vista?.mode !== 'receso' || vista.saliendo) return;
  const lista = horario(vista.timeline, now);
  const record = lista.find(r => r.key === vista.key);
  const estado = record && estadoDe(record, now);
  if (estado === 'durante') vista.visto = true;
  if (!vista.visto || ['durante', 'antes'].includes(estado)) return;
  vista.saliendo = true;
  const proxima = lista.slice(lista.indexOf(record) + 1).find(r => r.day === record.day && r.kind !== 'break' && !r.omitida);
  transicion(() => proxima ? showProjection(records.get(proxima.key), 'contador') : closeProjection(), '[ siguiente actividad ]');
}

// El receso tiene su propia pantalla, salvo en modo automático (que ya la muestra).
function abrirReceso(hito) {
  if (automatic) return;
  transicion(() => showProjection(records.get(hito.record.key), 'receso'), '[ receso ]');
}

// Las actividades omitidas no se festejan; la que está en tiempo extra todavía no termina
// y las que esperan a que termine todavía no empiezan.
function paraHitos(lista) {
  return lista.filter(r => !r.omitida && !r.enEspera && !r.porIniciar).map(r => r.tiempoExtra ? { ...r, endMs: Infinity } : r);
}

function tick() {
  const now = Date.now();
  const lista = horario(real, now);
  const porClave = new Map(lista.map(r => [r.key, r]));
  filas.forEach(fila => updateFila(fila, porClave.get(fila.record.key), now));
  updateEnVivo(lista, now);
  if (automatic) advanceAutomatic(now);
  updateVista(now);
  terminarReceso(now);
  // Tras una pausa larga (pestaña oculta o equipo suspendido) no se festejan hitos atrasados.
  if (now - lastTick <= 5000) {
    const base = automatic?.demo ? horario(automatic.timeline, now) : lista;
    const hitos = hitosEntre(paraHitos(base), lastTick, now);
    const celebrar = () => hitos.forEach(hito => hito.tipo === 'receso' ? abrirReceso(hito) : festejar(festejoPara(hito)));
    // En el inicio y el fin del foro o de un día, los festejos esperan a que se retiren los bloques.
    const rotulo = hitos.map(rotuloHito).filter(Boolean).at(-1);
    if (rotulo) transicion(null, rotulo).then(celebrar);
    else celebrar();
  }
  lastTick = now;
  actualizarEnsayo();
}

function rotuloHito(hito) {
  switch (hito.tipo) {
    case 'inicio-foro': return '[ inicia el xiii foro ]';
    case 'inicio-dia': return `[ inicia el día ${hito.dia} ]`;
    case 'fin-dia': return `[ día ${hito.dia} completado ]`;
    case 'fin-foro': return '[ fin del foro ]';
    default: return '';
  }
}

function tituloReceso(record) {
  const minutos = Math.max(1, Math.round((record.endMs - record.startMs) / minuto));
  return `Receso de ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
}

function festejoPara(hito) {
  const record = hito.record;
  const name = record.recipient;
  const progreso = [hito.completadas, hito.total];
  const [sessionName, sessionTopic] = (record.session || '').split(' · ');
  switch (hito.tipo) {
    case 'inicio-foro': return { grande: true, pista: !automatic?.demo, rotulo: '[ xiii foro ]', titulo: '¡Comienza el XIII Foro!', detalle: record.title, arte: artes.fuegos, progreso };
    case 'inicio-dia': return { grande: true, rotulo: `[ día ${hito.dia} ]`, titulo: `¡Arranca el día ${hito.dia} del foro!`, detalle: [record.title, record.speaker].filter(Boolean).join(' · '), arte: artes.fuegos, progreso };
    case 'inicio': return { rotulo: '[ comienza ]', titulo: record.title, detalle: record.speaker, arte: artes.carga, progreso };
    case 'receso': return { rotulo: '[ receso ]', titulo: tituloReceso(record), detalle: 'Estira las piernas, toma agua y regresa a tiempo.', arte: artes.cafe };
    case 'fin': return { rotulo: '[ aplausos ]', titulo: name ? `¡Gracias, ${name}!` : '¡Gracias a todos!', detalle: record.title, arte: artes.aplausos, progreso };
    case 'sesion': return { rotulo: '[ sesión completada ]', titulo: `¡${sessionName} completada!`, detalle: `${sessionTopic} · ${hito.ponencias} ponencias`, arte: artes.sesion(hito.ponencias), progreso };
    case 'mitad': return { rotulo: '[ mitad del foro ]', titulo: '¡Ya llevamos la mitad del foro!', detalle: `${hito.completadas} de ${hito.total} actividades completadas`, arte: artes.estrellas, progreso, lluvia: true };
    case 'fin-dia': return { grande: true, rotulo: `[ día ${hito.dia} completado ]`, titulo: `¡Día ${hito.dia} completado!`,
      detalle: hito.siguiente ? `Continuamos el ${programa[hito.siguiente.day].label.toLocaleLowerCase('es')} a las ${hora(hito.siguiente.startMs)}.` : '', arte: artes.fuegos, progreso };
    default: return { grande: true, rotulo: '[ fin del foro ]', titulo: '¡Gracias por acompañarnos!', detalle: 'XIII Foro de Ciencias de la Computación · misión cumplida', arte: artes.fuegos, progreso };
  }
}

function advanceAutomatic(now) {
  const { timeline } = automatic;
  const lista = horario(timeline, now);
  const state = estadoAutomatico(lista.filter(r => !r.omitida), now);
  const key = `${state.mode}:${state.record?.key || ''}`;
  if (automatic.last === key) return;
  const rotulo = !automatic.last ? (automatic.demo ? '[ ensayo ]' : '[ modo automático ]')
    : state.mode === 'receso' ? '[ receso ]'
    : state.mode === 'contador' ? '[ siguiente actividad ]'
    : automatic.demo ? '[ ensayo terminado ]' : '[ programa concluido ]';
  automatic.last = key;
  const run = automatic;
  transicion(() => {
    // Si se detuvo el modo automático mientras la pantalla estaba cubierta, no se vuelve a abrir.
    if (automatic !== run) return;
    if (state.mode === 'fin') showAutomaticEnd();
    else return showProjection(state.record, state.mode, timeline);
  }, rotulo);
}

function showAutomaticEnd() {
  vista?.detener?.();
  vista = null;
  $('#proyeccion').dataset.mode = 'fin';
  const panel = element('div', 'fin-automatico panel');
  panel.append(element('h2', '', automatic.demo ? 'Ensayo terminado' : 'Programa concluido'));
  const actions = element('div', 'acciones-dialog');
  if (automatic.demo) {
    const repeat = element('button', '', 'Repetir ensayo');
    repeat.type = 'button';
    repeat.addEventListener('click', () => startAutomatic(true));
    actions.append(repeat);
  }
  const close = element('button', '', 'Volver al programa');
  close.type = 'button';
  close.addEventListener('click', requestClose);
  actions.append(close);
  panel.append(actions);
  $('#proyeccion-contenido').replaceChildren(panel);
  $('#proyeccion').hidden = false;
  $('#terminal').inert = true;
  document.body.classList.add('proyectando');
  updateVista(Date.now());
  revealControls();
  if (automatic.demo) festejar({ rotulo: '[ ensayo ]', titulo: '¡Todo listo para el foro!', detalle: 'Ya practicaste iniciar, ajustar el tiempo, el tiempo extra, terminar y el receso.', arte: artes.aplausos, lluvia: true });
}

// Agenda corta del ensayo guiado: inauguración (espera a que la inicien), conferencia, receso y otra conferencia.
// Vive solo en memoria: no toca el horario real ni se comparte con las demás pantallas.
const claveEnsayo = { inaug: 'jueves-09:10', conf: 'jueves-09:40', receso: 'jueves-11:40', sig: 'jueves-10:40' };
function crearEnsayo(now) {
  // Todas comparten la misma hora de inicio: cada una empieza en cuanto termina la anterior.
  const t = now + 12000;
  const lista = [['inaug', 180], ['conf', 90], ['receso', 20], ['sig', 90]].map(([nombre, segundos]) =>
    ({ ...records.get(claveEnsayo[nombre]), startMs: t, endMs: t + segundos * 1000 }));
  return { lista, ajustes: {}, historial: [], persistente: false };
}

function startAutomatic(demo = false) {
  const now = Date.now();
  automatic = { timeline: demo ? crearEnsayo(now) : real, demo, last: '' };
  $('#etiqueta-prueba').hidden = !demo;
  if (demo) iniciarEnsayo();
  else terminarEnsayo();
  advanceAutomatic(now);
}

function renderAgenda() {
  const root = $('#actividades');
  const query = normalize($('#buscar').value.trim());
  const filtered = [...records.values()].filter(record => record.day === day && normalize([record.title, record.speaker, record.session].filter(Boolean).join(' ')).includes(query));
  root.replaceChildren();
  filas = [];
  $('#dia-titulo').textContent = programa[day].label;
  document.querySelectorAll('[data-day]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.day === day)));
  let session = '';
  for (const record of filtered) {
    if (record.session && record.session !== session) root.append(element('h3', 'sesion', record.session));
    session = record.session || '';
    const omitir = action('Omitir', 'omitir', record.key);
    if (record.kind === 'break') {
      const pause = element('div', 'receso');
      const rotulo = element('span');
      const original = element('span', 'horario-original');
      pause.append(rotulo, element('h4', '', record.title), original, action('☕ Proyectar receso', 'receso', record.key), omitir);
      root.append(pause);
      filas.push({ record, row: pause, rotulo, original, omitir });
      continue;
    }
    const row = element('article', 'actividad panel');
    const rotulo = element('h3', 'rotulo');
    row.append(rotulo);
    const content = element('div', 'actividad-cuerpo');
    const information = element('div');
    information.append(element('h4', '', record.title));
    if (record.speaker) information.append(element('p', 'ponente', record.speaker));
    const original = element('p', 'horario-original');
    information.append(original);
    const actions = element('div', 'acciones-actividad');
    const proyectar = action('▶ Proyectar contador', 'contador', record.key);
    proyectar.classList.add('principal');
    actions.append(proyectar);
    actions.append(omitir);
    information.append(actions);
    const clock = createClock(record);
    content.append(information, clock.root);
    row.append(content);
    root.append(row);
    filas.push({ record, row, rotulo, original, omitir, clock });
  }
  $('#sin-resultados').hidden = filtered.length !== 0;
  tick();
}

function avisar(texto) {
  $('#estado-app').textContent = texto;
  $('#aviso-proyeccion').textContent = texto;
  clearTimeout(avisoTimeout);
  avisoTimeout = setTimeout(() => { $('#aviso-proyeccion').textContent = ''; $('#estado-app').textContent = ''; }, 4000);
}

// Cada ajuste guarda una copia previa para poder deshacerlo.
function cambiar(timeline, mensaje, cambio) {
  timeline.historial.push(JSON.stringify(timeline.ajustes));
  if (timeline.historial.length > 50) timeline.historial.shift();
  cambio(timeline.ajustes);
  for (const [key, value] of Object.entries(timeline.ajustes)) if (!Object.keys(value).length) delete timeline.ajustes[key];
  const persisted = !timeline.persistente || guardar(horarioKey, timeline.ajustes);
  avisar(persisted ? mensaje : `${mensaje} El navegador no permitió guardar el ajuste para otra visita.`);
  tick();
  if (timeline.persistente) compartir();
}

const ajuste = (ajustes, key) => (ajustes[key] ||= {});

function deshacer(timeline) {
  const previo = timeline.historial.pop();
  if (!previo) return avisar('No hay nada que deshacer.');
  registrarEnsayo(timeline, 'deshacer');
  timeline.ajustes = JSON.parse(previo);
  if (timeline.persistente) guardar(horarioKey, timeline.ajustes);
  avisar('Se deshizo el último ajuste.');
  tick();
  if (timeline.persistente) compartir();
}

// Sincronización entre pantallas: se aplica el estado más reciente, venga de aquí o de otra pantalla.
let ultimoSync = Number(leer(syncKey).at) || 0;
function compartir() {
  ultimoSync = Date.now();
  guardar(syncKey, { at: ultimoSync });
  sync.publicar({ at: ultimoSync, ajustes: real.ajustes, esperar: control.esperar, codigo: codigoEnPantalla });
}

function ponerCodigo(id, { compartirlo = true } = {}) {
  codigoEnPantalla = codigoPorId(id)?.id || null;
  guardar(codigoKey, { id: codigoEnPantalla });
  mostrarCodigo();
  if (compartirlo) {
    compartir();
    avisar(codigoEnPantalla ? `«${codigoPorId(codigoEnPantalla).titulo}» en todas las pantallas.` : 'Código QR quitado de las pantallas.');
  }
}

// Dibuja el código en grande sobre la proyección y actualiza los botones de la sección de códigos.
function mostrarCodigo() {
  const codigo = codigoPorId(codigoEnPantalla);
  const capa = $('#qr-pantalla');
  capa.hidden = !codigo;
  if (codigo) {
    const imagen = capa.querySelector('img');
    if (imagen.getAttribute('src') !== codigo.imagen) {
      imagen.src = codigo.imagen;
      imagen.width = codigo.ancho;
      imagen.height = codigo.alto;
    }
    imagen.alt = `Código QR: ${codigo.titulo}`;
  }
  $('#proy-quitar-codigo').hidden = !codigo;
  $('#codigos-activo').hidden = !codigo;
  $('#codigos-activo-nombre').textContent = codigo?.titulo || '';
  for (const boton of document.querySelectorAll('[data-codigo]')) {
    const activo = boton.dataset.codigo === codigoEnPantalla;
    boton.classList.toggle('principal', activo);
    boton.textContent = activo ? '■ Quitar de pantallas' : '▶ Mostrar en pantallas';
    boton.closest('.codigo')?.classList.toggle('activo', activo);
  }
}

function renderCodigos() {
  $('#codigos-lista').replaceChildren(...codigos.map(codigo => {
    const tarjeta = element('article', 'codigo');
    const imagen = element('img');
    imagen.src = codigo.imagen;
    imagen.width = codigo.ancho;
    imagen.height = codigo.alto;
    imagen.alt = `Código QR: ${codigo.titulo}`;
    imagen.loading = 'lazy';
    const boton = element('button', '', '▶ Mostrar en pantallas');
    boton.type = 'button';
    boton.dataset.codigo = codigo.id;
    tarjeta.append(imagen, element('h3', '', codigo.titulo), element('p', '', codigo.detalle), boton);
    return tarjeta;
  }));
  mostrarCodigo();
}
function recibirEstado(estado) {
  if (!Number.isFinite(estado.at) || estado.at <= ultimoSync) return;
  ultimoSync = estado.at;
  guardar(syncKey, { at: ultimoSync });
  real.ajustes = leerAjustes(estado.ajustes);
  real.historial = [];
  guardar(horarioKey, real.ajustes);
  if (typeof estado.esperar === 'boolean' && estado.esperar !== control.esperar) {
    control.esperar = estado.esperar;
    guardar(controlKey, control);
    aplicarControl();
  }
  if ((estado.codigo ?? null) !== codigoEnPantalla) ponerCodigo(estado.codigo ?? null, { compartirlo: false });
  tick();
}
function mostrarConexion(enLinea) {
  for (const nodo of document.querySelectorAll('[data-sync]')) {
    nodo.dataset.enLinea = String(enLinea);
    nodo.textContent = enLinea
      ? (nodo.dataset.sync === 'corto' ? '● En línea' : '● En línea: los cambios se ven al instante en todas las pantallas.')
      : (nodo.dataset.sync === 'corto' ? '○ Sin conexión' : '○ Sin conexión: los cambios solo se ven aquí. Reintentando…');
  }
}
const sync = crearSync({ canal, alRecibir: recibirEstado, alEstado: mostrarConexion });

function ejecutar(accion, origen, valor) {
  const now = Date.now();
  const enProyeccion = origen === 'proyeccion';
  if (enProyeccion && !vista) return;
  const timeline = enProyeccion ? vista.timeline : real;
  if (accion === 'deshacer') return deshacer(timeline);
  const lista = horario(timeline, now);
  const record = enProyeccion ? lista.find(r => r.key === vista.key) : objetivo(lista, now);
  // Mostrar u ocultar el QR se puede siempre (también fuera del día del evento).
  if (accion === 'qr' && record) {
    const visible = qrVisible(record, timeline, now);
    registrarEnsayo(timeline, 'qr');
    return cambiar(timeline, visible ? 'QR oculto.' : 'QR en pantalla.', ajustes => { ajuste(ajustes, record.key).qr = !visible; });
  }
  if (!record || !editable(timeline, record, now)) return;
  const estado = estadoDe(record, now);
  const curso = estado === 'durante' || estado === 'extra';
  if (accion === 'ajustar' && (curso || estado === 'antes')) {
    if (!valor) return;
    registrarEnsayo(timeline, valor > 0 ? 'mas' : 'menos');
    const texto = `${valor > 0 ? '+' : '−'}${Math.abs(valor) / minuto} min`;
    // En curso cambia la duración; antes de empezar mueve el inicio.
    if (curso) cambiar(timeline, `${texto} a «${record.title}».`, ajustes => {
      const a = ajuste(ajustes, record.key);
      if (a.fin != null) a.fin += valor;
      else a.extra = (a.extra || 0) + valor;
    });
    else cambiar(timeline, `Inicio de «${record.title}» ${texto}.`, ajustes => { ajuste(ajustes, record.key).inicio = Math.max(now, record.startMs + valor); });
  } else if (accion === 'avanzar' && curso) {
    cambiar(timeline, `«${record.title}» terminó.`, ajustes => { ajuste(ajustes, record.key).fin = now; });
    // Sin modo automático, la pantalla pasa sola a lo que sigue.
    if (enProyeccion && !automatic) navegar(1);
  } else if (accion === 'avanzar' && ['antes', 'espera', 'porIniciar'].includes(estado)) {
    cambiar(timeline, `«${record.title}» inició.`, ajustes => {
      for (const r of lista) {
        if (r.day !== record.day || r.key === record.key) continue;
        // Lo que seguía en curso termina ahora.
        if (enCurso(r, now)) ajuste(ajustes, r.key).fin = now;
      }
      const a = ajuste(ajustes, record.key);
      a.inicio = now;
      delete a.fin;
    });
  } else if (accion === 'reiniciar' && curso) {
    cambiar(timeline, `«${record.title}» cuenta su tiempo desde ahora.`, ajustes => { ajustes[record.key] = { inicio: now }; });
  }
}

function alternarOmitida(key) {
  const record = records.get(key);
  const omitida = Boolean(real.ajustes[key]?.omitida);
  cambiar(real, omitida ? `«${record.title}» vuelve al programa.` : `«${record.title}» se omitió.`, ajustes => {
    const a = ajuste(ajustes, key);
    if (omitida) delete a.omitida;
    else a.omitida = true;
  });
}

function clearProjection() {
  automatic = null;
  terminarEnsayo();
  $('#etiqueta-prueba').hidden = true;
  clearTimeout(controlsTimeout);
  $('#proyeccion-contenido').replaceChildren();
  $('#proyeccion').hidden = true;
  $('#terminal').inert = false;
  document.body.classList.remove('proyectando');
  vista?.detener?.();
  vista = null;
  updateVista(Date.now());
  hadFullscreen = false;
  mantenerPantalla();
  if (lastTrigger?.isConnected) lastTrigger.focus();
  else $('#titulo-programa').focus();
}

function requestClose() {
  automatic = null;
  return transicion(closeProjection, '[ programa ]');
}

async function closeProjection() {
  try {
    if (document.fullscreenElement === $('#proyeccion')) await document.exitFullscreen();
  } finally { clearProjection(); }
}

function revealControls() {
  $('#proyeccion').classList.add('controles-visibles');
  clearTimeout(controlsTimeout);
  controlsTimeout = setTimeout(() => $('#proyeccion').classList.remove('controles-visibles'), 3000);
}

function updateBotonPantalla() {
  $('#pantalla-completa').hidden = Boolean(document.fullscreenElement) || !$('#proyeccion').requestFullscreen;
}

async function pantallaCompleta() {
  const projection = $('#proyeccion');
  if (projection.hidden || !projection.requestFullscreen || document.fullscreenElement) return;
  try { await projection.requestFullscreen(); hadFullscreen = true; } catch { /* La vista de presentación también funciona sin pantalla completa nativa. */ }
}

// Evita que el equipo apague la pantalla mientras se proyecta o se controlan los tiempos.
async function mantenerPantalla() {
  if (!control.activo && $('#proyeccion').hidden) {
    wakeLock?.release().catch(() => {});
    wakeLock = null;
    return;
  }
  if (wakeLock || pidiendoPantalla || !navigator.wakeLock || document.visibilityState !== 'visible') return;
  pidiendoPantalla = true;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { /* Sin permiso la página sigue funcionando; solo puede apagarse la pantalla. */ }
  finally { pidiendoPantalla = false; }
}

async function showProjection(record, mode, timeline = real) {
  const projection = $('#proyeccion');
  const container = $('#proyeccion-contenido');
  const abierta = !projection.hidden;
  vista?.detener?.();
  vista = { key: record.key, mode, timeline, clock: null, siguiente: null };
  projection.dataset.mode = mode;
  projection.hidden = false;
  $('#terminal').inert = true;
  document.body.classList.add('proyectando');
  if (mode === 'receso') {
    const taza = tazaAnimada();
    vista.detener = taza.detener;
    const panel = element('div', 'contador-proyectado receso-proyectado panel');
    const cuerpo = element('div', 'contador-cuerpo');
    cuerpo.append(taza.nodo, element('h2', '', tituloReceso(record)));
    vista.clock = createClock(record, true);
    vista.siguiente = element('p', 'a-continuacion');
    cuerpo.append(vista.clock.root, vista.siguiente, element('p', 'receso-mensaje', 'Estira las piernas, toma agua y regresa a tiempo.'));
    panel.append(element('span', 'rotulo', '[ receso ]'), cuerpo, crearQr());
    panel.dataset.qr = 'false';
    vista.panel = panel;
    container.replaceChildren(panel);
  } else {
    const panel = element('div', 'contador-proyectado panel');
    const cuerpo = element('div', 'contador-cuerpo');
    cuerpo.append(element('h2', '', record.title));
    if (record.speaker) cuerpo.append(element('p', 'ponente', record.speaker));
    vista.clock = createClock(record, true);
    vista.siguiente = element('p', 'a-continuacion');
    cuerpo.append(vista.clock.root, vista.siguiente);
    panel.append(cuerpo, crearQr());
    panel.dataset.qr = 'false';
    vista.panel = panel;
    container.replaceChildren(panel);
  }
  updateVista(Date.now());
  updateBotonPantalla();
  projection.focus();
  mantenerPantalla();
  revealControls();
  // Solo se pide pantalla completa al abrir; si el operador la dejó, los cambios automáticos no la recuperan.
  if (!abierta && !automatic?.demo) await pantallaCompleta();
}

$('#actividades').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  lastTrigger = button;
  const record = records.get(button.dataset.key);
  if (button.dataset.action === 'contador') transicion(() => showProjection(record, 'contador'), '[ contador ]');
  else if (button.dataset.action === 'receso') transicion(() => showProjection(record, 'receso'), '[ receso ]');
  else if (button.dataset.action === 'omitir') alternarOmitida(record.key);
});
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-control]');
  if (!button) return;
  const origen = button.closest('#proyeccion') ? 'proyeccion' : 'panel';
  if (button.dataset.control === 'personalizado') {
    // Minutos escritos por el operador: «Quitar» resta y «Agregar» suma.
    const campo = button.closest('[role="group"]').querySelector('.minutos-libres');
    const minutos = Math.round(Number(campo.value));
    if (!(minutos >= 1 && minutos <= 180)) { campo.focus(); return avisar('Escribe cuántos minutos (de 1 a 180).'); }
    if (origen === 'proyeccion' && vista) registrarEnsayo(vista.timeline, 'libre');
    return ejecutar('ajustar', origen, Number(button.dataset.signo) * minutos * minuto);
  }
  ejecutar(button.dataset.control, origen, Number(button.dataset.valor));
});
document.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => { day = button.dataset.day; renderAgenda(); }));
$('#buscar').addEventListener('input', renderAgenda);
$('#cerrar-proyeccion').addEventListener('click', requestClose);
$('#pantalla-completa').addEventListener('click', pantallaCompleta);
$('#modo-automatico').addEventListener('click', event => { lastTrigger = event.currentTarget; startAutomatic(); });
$('#prueba-rapida').addEventListener('click', event => { lastTrigger = event.currentTarget; startAutomatic(true); });
$('#control-tiempos').addEventListener('click', () => {
  control.activo = !control.activo;
  guardar(controlKey, control);
  aplicarControl();
  renderAgenda();
  avisar(control.activo ? 'Control de tiempos activado.' : 'Control de tiempos desactivado.');
});
$('#pref-esperar').addEventListener('change', event => { control.esperar = event.target.value === 'esperar'; guardar(controlKey, control); tick(); compartir(); });
$('#restablecer').addEventListener('click', () => {
  if (!Object.keys(real.ajustes).length) return avisar('El horario ya coincide con el programa.');
  if (!confirm('¿Volver al horario original? Se quitan todos los ajustes (puedes deshacerlo).')) return;
  cambiar(real, 'Horario restablecido al programa original. Puedes deshacerlo.', ajustes => { for (const key of Object.keys(ajustes)) delete ajustes[key]; });
});
// Cambia la actividad en pantalla sin salir de la proyección. Moverse a mano detiene el modo automático.
function navegar(paso) {
  if (automatic?.demo) return avisar('En el ensayo este botón solo se muestra. En el evento cambia la actividad en pantalla.');
  if (!vista) return;
  const lista = horario(real, Date.now()).filter(r => !r.omitida);
  const indice = lista.findIndex(r => r.key === vista.key);
  const destino = lista[indice + paso];
  if (!destino) return avisar(paso > 0 ? 'Es la última actividad.' : 'Es la primera actividad.');
  automatic = null;
  const record = records.get(destino.key);
  transicion(() => showProjection(record, record.kind === 'break' ? 'receso' : 'contador'), record.kind === 'break' ? '[ receso ]' : '[ contador ]');
}
$('#proy-anterior').addEventListener('click', () => navegar(-1));
$('#proy-siguiente').addEventListener('click', () => navegar(1));
$('#proy-auto').addEventListener('click', () => {
  if (automatic?.demo) return avisar('En el ensayo el automático siempre está activo. En el evento este botón lo pausa o lo reanuda.');
  if (automatic) { automatic = null; avisar('Automático en pausa: la pantalla se queda aquí.'); updateVista(Date.now()); }
  else startAutomatic();
});
$('#proyeccion').addEventListener('pointermove', revealControls);
$('#proyeccion').addEventListener('pointerdown', revealControls);
// Atajos durante la proyección. Las flechas y avance/retroceso de página permiten usar un presentador inalámbrico.
// Los atajos no muestran los controles en pantalla, solo un aviso pequeño.
const atajos = { arrowright: 'avanzar', pagedown: 'avanzar', n: 'avanzar', arrowleft: 'deshacer', pageup: 'deshacer', z: 'deshacer', r: 'reiniciar', arrowup: 'mas', '+': 'mas', '=': 'mas', arrowdown: 'menos', '-': 'menos' };
document.addEventListener('keydown', event => {
  if ($('#proyeccion').hidden) return;
  // Esc solo deja la pantalla completa; para cerrar la proyección se usa el botón «Salir».
  if (event.altKey || event.target.closest?.('input, select, textarea')) return;
  const tecla = event.key.toLowerCase();
  if (tecla === 'f' && !event.ctrlKey && !event.metaKey) { event.preventDefault(); pantallaCompleta(); return; }
  const accion = atajos[tecla];
  if (!accion || $('#proyeccion-tiempo').hidden || ((event.ctrlKey || event.metaKey) && tecla !== 'z')) return;
  event.preventDefault();
  if (accion === 'mas' || accion === 'menos') ejecutar('ajustar', 'proyeccion', (accion === 'mas' ? 1 : -1) * (event.shiftKey ? 5 : 1) * minuto);
  else ejecutar(accion, 'proyeccion');
});
document.addEventListener('fullscreenchange', () => {
  updateBotonPantalla();
  if (!hadFullscreen || document.fullscreenElement) return;
  hadFullscreen = false;
  // Salir de pantalla completa no cierra la proyección.
  avisar('Pantalla completa desactivada. Pulsa F para volver.');
});
document.addEventListener('visibilitychange', () => { tick(); mantenerPantalla(); });

// Otra pestaña del mismo navegador (por ejemplo, la del proyector) recibe los ajustes al instante.
window.addEventListener('storage', event => {
  if (event.key === horarioKey) { real.ajustes = leerAjustes(); tick(); }
  else if (event.key === controlKey) { control = leerControl(); aplicarControl(); renderAgenda(); }
});

function aplicarControl() {
  $('#control-tiempos').setAttribute('aria-pressed', String(control.activo));
  $('#control-tiempos-texto').textContent = control.activo ? 'Ocultar control de tiempos' : 'Abrir control de tiempos';
  $('#pref-esperar').value = control.esperar ? 'esperar' : 'avanzar';
  mantenerPantalla();
}

// El reloj avanza al cambio de cada segundo para que todos los contadores cambien a la vez.
function programarTick() {
  setTimeout(() => {
    try { tick(); } finally { programarTick(); }
  }, 1000 - Date.now() % 1000 + 5);
}

// ——— Ensayo guiado ———
// Una tarjeta explica cada situación, resalta el botón que hay que pulsar y avanza sola cuando se hace.
let ensayo = null;
const avanzarBoton = '#proyeccion-tiempo [data-control="avanzar"]';
function registroEnsayo(nombre) {
  if (!automatic?.demo) return null;
  const now = Date.now();
  return horario(automatic.timeline, now).find(r => r.key === claveEnsayo[nombre]);
}
const estadoEnsayo = nombre => { const r = registroEnsayo(nombre); return r ? estadoDe(r, Date.now()) : ''; };
function registrarEnsayo(timeline, accion) {
  if (!ensayo || timeline !== automatic?.timeline) return;
  ensayo.acciones.push(accion);
  setTimeout(actualizarEnsayo, 50);
}
// Adelanta el reloj de la actividad para que su tiempo se acabe en seis segundos.
function acelerarEnsayo(nombre) {
  const r = registroEnsayo(nombre);
  if (!r || estadoDe(r, Date.now()) !== 'durante') return;
  const original = automatic.timeline.lista.find(x => x.key === r.key);
  automatic.timeline.ajustes[r.key] = { inicio: Date.now() + 6000 - (original.endMs - original.startMs) };
  tick();
}
const pasosEnsayo = [
  { titulo: 'Bienvenida al ensayo', boton: 'Empezar',
    texto: 'Esto es lo que verá el público en las pantallas. Vamos a practicar con una agenda de prueba de pocos minutos. Nada de lo que hagas aquí cambia el horario real ni las demás pantallas.\n\nLos controles están abajo a la derecha (los marcados en verde). En el evento se esconden solos y aparecen al mover el ratón; en el ensayo se quedan fijos.',
    objetivo: '.proyeccion-controles' },
  { titulo: 'Cuenta regresiva',
    texto: 'Antes de cada conferencia se ve cuánto falta para empezar y el QR de registro.\n\nNo tienes que hacer nada: espera unos segundos a que llegue la hora.',
    listo: () => ['porIniciar', 'durante', 'extra'].includes(estadoEnsayo('inaug')) },
  { titulo: 'La inauguración espera por ti',
    texto: 'Llegó la hora, pero la inauguración no arranca sola: en pantalla dice «Empezando…».\n\nCuando de verdad comience, pulsa ▶ Iniciar ahora (también sirve la flecha → del teclado o del presentador).',
    objetivo: avanzarBoton, listo: () => ['durante', 'extra'].includes(estadoEnsayo('inaug')) },
  { titulo: '¡Arrancó! Dar más tiempo',
    texto: 'La cuenta ahora muestra cuánto falta para terminar, y el mismo botón cambió a ■ Terminar ahora.\n\nSi te avisan que el ponente necesita más tiempo, pulsa +1 o +5. Pruébalo ahora.',
    objetivo: '#proyeccion-tiempo [data-valor="60000"], #proyeccion-tiempo [data-valor="300000"]', accion: 'mas' },
  { titulo: 'Quitar tiempo',
    texto: 'Si hay que recortar, pulsa −1 o −5. Pruébalo.',
    objetivo: '#proyeccion-tiempo [data-valor="-60000"], #proyeccion-tiempo [data-valor="-300000"]', accion: 'menos' },
  { titulo: 'Otra cantidad de minutos',
    texto: 'Para otra cantidad, escribe los minutos en la casilla y pulsa + para sumarlos o − para quitarlos. Pruébalo.',
    objetivo: '#proyeccion-tiempo .proy-libre', accion: 'libre' },
  { titulo: 'Si te equivocas',
    texto: 'Pulsa ↶ Deshacer (o la flecha ←) y se revierte lo último que hiciste. Pruébalo.',
    objetivo: '#proyeccion-tiempo [data-control="deshacer"]', accion: 'deshacer' },
  { titulo: 'Se acabó el tiempo',
    texto: 'Ahora adelantamos el reloj para que el tiempo se acabe en unos segundos. Mira la cuenta: al llegar a cero no se corta, sigue contando en naranja como tiempo extra. El público solo nota el cambio de color.\n\nEspera unos segundos.',
    alEntrar: () => acelerarEnsayo('inaug'), listo: () => ['extra', 'despues'].includes(estadoEnsayo('inaug')) },
  { titulo: 'Terminar cuando acabe de verdad',
    texto: 'Lo que sigue espera hasta que tú digas. Cuando el ponente termine, pulsa ■ Terminar ahora (o →).',
    objetivo: avanzarBoton, listo: () => estadoEnsayo('inaug') === 'despues' },
  { titulo: 'Sigue la siguiente', boton: 'Entendido',
    texto: 'La pantalla pasó sola a la siguiente conferencia, que empezó en ese momento con su tiempo completo. Así los retrasos se recorren solos a todo el día.\n\nEl QR de registro se queda los primeros 5 minutos de cada conferencia.' },
  { titulo: 'Otros botones', boton: 'Entendido',
    texto: '◀ Anterior y Siguiente ▶ cambian lo que se muestra y pausan el automático; ⟳ Automático lo vuelve a activar.\n\n⟲ Reiniciar cuenta otra vez el tiempo completo desde ahora (por ejemplo, si el ponente tardó en conectarse).\n\nEn el ensayo estos botones solo te avisan.',
    objetivo: '#proy-anterior, #proy-siguiente, #proy-auto, #proyeccion-tiempo [data-control="reiniciar"]' },
  { titulo: 'Mostrar u ocultar el QR',
    texto: 'El QR de registro sale solo antes de cada conferencia y en sus primeros 5 minutos.\n\nSi quieres ponerlo o quitarlo en otro momento (también en los recesos), pulsa ▦ Mostrar QR / ▦ Ocultar QR. Pruébalo.',
    objetivo: '#proy-qr', accion: 'qr' },
  { titulo: 'Ir al receso',
    texto: 'Termina esta conferencia con ■ Terminar ahora para ver el receso.',
    objetivo: avanzarBoton, listo: () => ['durante', 'despues'].includes(estadoEnsayo('receso')) },
  { titulo: 'Receso',
    texto: 'En los recesos aparece la taza y la cuenta para regresar. El receso termina solo y la pantalla pasa sola a la siguiente conferencia.\n\nNo tienes que hacer nada: espera unos segundos.',
    listo: () => ['durante', 'extra', 'despues'].includes(estadoEnsayo('sig')) },
  { titulo: '¡Listo para el foro!', boton: 'Terminar ensayo', final: true,
    texto: '• ▶ Iniciar ahora: arrancar, sobre todo la inauguración.\n• ■ Terminar ahora: cuando el ponente acabe.\n• +/−: dar o quitar minutos.\n• ↶ Deshacer: si te equivocas.\n• ▦ Mostrar QR: poner o quitar el QR de registro.\n• ✕ Salir: cerrar la proyección. Esc solo quita la pantalla completa (F la regresa).\n\nEl día del evento, todo lo que hagas se ve al instante en todas las pantallas.' }
];
function iniciarEnsayo() {
  ensayo = { paso: -1, acciones: [], desde: 0 };
  $('#proyeccion').classList.add('ensayando');
  $('#guia-ensayo').hidden = false;
  irAPaso(0);
}
function terminarEnsayo() {
  ensayo = null;
  $('#proyeccion').classList.remove('ensayando');
  $('#guia-ensayo').hidden = true;
  document.querySelectorAll('.resaltado').forEach(nodo => nodo.classList.remove('resaltado'));
}
function irAPaso(numero) {
  const paso = pasosEnsayo[numero];
  if (!ensayo || !paso) return;
  ensayo.paso = numero;
  ensayo.desde = ensayo.acciones.length;
  $('#ge-paso').textContent = `Paso ${numero + 1} de ${pasosEnsayo.length}`;
  $('#ge-progreso').style.width = `${(numero + 1) / pasosEnsayo.length * 100}%`;
  $('#ge-titulo').textContent = paso.titulo;
  $('#ge-texto').textContent = paso.texto;
  $('#ge-siguiente').hidden = !paso.boton;
  $('#ge-siguiente').textContent = paso.boton || '';
  $('#ge-espera').hidden = Boolean(paso.boton);
  $('#ge-espera').textContent = paso.accion || paso.objetivo ? '👉 Pulsa el botón marcado en verde.' : '⏳ Espera unos segundos…';
  $('#ge-saltar').hidden = Boolean(paso.boton);
  document.querySelectorAll('.resaltado').forEach(nodo => nodo.classList.remove('resaltado'));
  if (paso.objetivo) document.querySelectorAll(paso.objetivo).forEach(nodo => nodo.classList.add('resaltado'));
  paso.alEntrar?.();
  actualizarEnsayo();
}
function actualizarEnsayo() {
  if (!ensayo || !automatic?.demo) return;
  const paso = pasosEnsayo[ensayo.paso];
  if (!paso || paso.boton) return;
  const hecho = paso.accion ? ensayo.acciones.slice(ensayo.desde).includes(paso.accion) : paso.listo?.();
  if (hecho) irAPaso(ensayo.paso + 1);
}
$('#ge-siguiente').addEventListener('click', () => {
  const paso = pasosEnsayo[ensayo?.paso];
  if (paso?.final) requestClose();
  else if (ensayo) irAPaso(ensayo.paso + 1);
});
$('#ge-saltar').addEventListener('click', () => {
  // Saltar un paso que espera a que se acabe el tiempo adelanta también el reloj.
  if (ensayo) irAPaso(ensayo.paso + 1);
});
$('#ge-salir').addEventListener('click', requestClose);

$('#codigos-lista').addEventListener('click', event => {
  const boton = event.target.closest('[data-codigo]');
  if (boton) ponerCodigo(boton.dataset.codigo === codigoEnPantalla ? null : boton.dataset.codigo);
});
$('#codigos-quitar').addEventListener('click', () => ponerCodigo(null));
$('#proy-quitar-codigo').addEventListener('click', () => ponerCodigo(null));
window.addEventListener('storage', event => {
  if (event.key === codigoKey) { codigoEnPantalla = codigoPorId(leer(codigoKey).id)?.id || null; mostrarCodigo(); }
});
renderCodigos();

iniciarFestejos($('#festejo-anuncio'));
aplicarControl();
renderAgenda();
$('#controles').hidden = false;
programarTick();
