import { programa } from './programa.js?v=2';
import { hitosEntre } from './hitos.mjs?v=8';

const $ = selector => document.querySelector(selector);
const marco = $('#marco');
const zona = 6 * 3600000;
const antes = 4000;
const nombres = {
  'inicio-foro': 'Inicio del foro', 'inicio-dia': 'Inicio de día', inicio: 'Inicio de actividad', receso: 'Receso',
  fin: 'Aplausos', sesion: 'Sesión completada', mitad: 'Mitad del foro', 'fin-dia': 'Fin de día', 'fin-foro': 'Fin del foro'
};

// Mismos registros que arma app.js, con lo necesario para los hitos.
const registros = Object.entries(programa).flatMap(([day, data]) => data.activities.map(activity => ({
  ...activity, day, key: `${day}-${activity.start}`,
  startMs: Date.parse(`${data.date}T${activity.start}:00-06:00`),
  endMs: Date.parse(`${data.date}T${activity.end}:00-06:00`)
})));
const registro = key => registros.find(r => r.key === key);
const hitos = hitosEntre(registros, -Infinity, Infinity);

// ms → '2026-11-12T09:09:56' en hora del foro, el formato que entiende reloj.js.
const local = ms => new Date(ms - zona).toISOString().slice(0, 19);

function abrir(ms, accion) {
  const url = ms == null ? 'index.html' : `index.html?t=${local(ms)}`;
  if (accion) marco.addEventListener('load', () => accion(marco.contentDocument), { once: true });
  marco.src = url;
  $('#abrir-pestana').href = url;
  if (ms != null) $('#hora').value = local(ms);
}

const ahoraSimulado = () => marco.contentWindow?.Date.now() ?? Date.now();
const pulsar = selector => doc => doc.querySelector(selector)?.click();

// Reloj
setInterval(() => {
  const ms = ahoraSimulado();
  const [fecha, hora] = local(ms).split('T');
  const dia = Object.values(programa).find(d => d.date === fecha);
  $('#reloj').textContent = `${dia ? dia.label : fecha} · ${hora}`;
}, 250);

$('#ir-hora').addEventListener('click', () => {
  const ms = Date.parse(`${$('#hora').value}-06:00`);
  if (Number.isFinite(ms)) abrir(ms);
});
$('#hora-real').addEventListener('click', () => abrir(null));
$('#recargar').addEventListener('click', () => marco.contentWindow.location.reload());

// Festejos: un botón por tipo (primera vez que ocurre) y la lista completa.
const tipos = new Set();
for (const hito of hitos) {
  if (tipos.has(hito.tipo)) continue;
  tipos.add(hito.tipo);
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = nombres[hito.tipo];
  boton.title = `${local(hito.at).replace('T', ' ')} · ${hito.record.title}`;
  boton.addEventListener('click', () => abrir(hito.at - antes));
  $('#hitos-tipo').append(boton);
}
$('#hitos-todos').append(...hitos.map((hito, i) => {
  const opcion = document.createElement('option');
  opcion.value = i;
  opcion.textContent = `${hito.record.day.slice(0, 3)} ${hito.record[hito.at === hito.record.startMs ? 'start' : 'end']} · ${nombres[hito.tipo]} · ${hito.record.title}`;
  return opcion;
}));
$('#ir-hito').addEventListener('click', () => abrir(hitos[$('#hitos-todos').value].at - antes));

// Contador (conferencia magistral del jueves)
const magistral = registro('jueves-09:40');
const contador = {
  final: () => abrir(magistral.startMs - 13000),
  durante: () => abrir(magistral.startMs + 5000),
  finalizada: () => abrir(magistral.endMs + 5000),
  pantalla: () => abrir(magistral.startMs - 13000, pulsar(`[data-action="contador"][data-key="${magistral.key}"]`))
};
document.querySelectorAll('[data-contador]').forEach(boton => boton.addEventListener('click', contador[boton.dataset.contador]));

// Modos
const automatico = {
  arranque: registro('jueves-09:10').startMs - 10000,
  termina: magistral.endMs - 8000,
  cierre: registro('viernes-14:10').endMs - 8000
};
document.querySelectorAll('[data-auto]').forEach(boton => boton.addEventListener('click', () => abrir(automatico[boton.dataset.auto], pulsar('#modo-automatico'))));
$('#prueba-rapida').addEventListener('click', () => abrir(ahoraSimulado(), pulsar('#prueba-rapida')));

// Receso (jueves 11:40 a 11:50)
const descanso = registro('jueves-11:40');
const receso = {
  inicio: () => abrir(descanso.startMs - antes),
  final: () => abrir(descanso.endMs - 12000, pulsar(`[data-action="receso"][data-key="${descanso.key}"]`)),
  automatico: () => abrir(descanso.startMs - 6000, pulsar('#modo-automatico'))
};
document.querySelectorAll('[data-receso]').forEach(boton => boton.addEventListener('click', receso[boton.dataset.receso]));
