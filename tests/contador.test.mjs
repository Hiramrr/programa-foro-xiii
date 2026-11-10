import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoActividad, estadoAutomatico } from '../dist/contador.mjs';

const inicio = Date.parse('2026-11-12T09:40:00-06:00');
const fin = Date.parse('2026-11-12T10:30:00-06:00');

test('cuenta días y el resto de horas antes de la conferencia', () => {
  assert.deepEqual(estadoActividad(inicio, fin, inicio - 90061000), { tipo: 'antes', dias: 1, horas: 1, minutos: 1, segundos: 1 });
});
test('no marca cero segundos antes de que comience', () => {
  assert.equal(estadoActividad(inicio, fin, inicio - 1).segundos, 1);
});
test('al iniciar cuenta el tiempo restante de la conferencia', () => {
  assert.deepEqual(estadoActividad(inicio, fin, inicio), { tipo: 'durante', dias: 0, horas: 0, minutos: 50, segundos: 0 });
});
test('al terminar y después no muestra números negativos', () => {
  for (const ahora of [fin, fin + 86400000]) assert.deepEqual(estadoActividad(inicio, fin, ahora), { tipo: 'despues', dias: 0, horas: 0, minutos: 0, segundos: 0 });
});
test('rechaza horarios inválidos', () => {
  assert.throws(() => estadoActividad(NaN, fin, inicio));
  assert.throws(() => estadoActividad(fin, inicio, inicio));
});

const events = [
  { key: 'uno', startMs: inicio, endMs: fin, recognition: true },
  { key: 'dos', startMs: fin, endMs: fin + 1200000, recognition: false }
];
test('el modo automático elige la próxima conferencia y luego la actual', () => {
  assert.equal(estadoAutomatico(events, inicio - 1000).record.key, 'uno');
  assert.equal(estadoAutomatico(events, inicio).mode, 'contador');
  assert.equal(estadoAutomatico(events, inicio).record.key, 'uno');
});
test('muestra el diploma quince segundos y continúa con la siguiente', () => {
  assert.equal(estadoAutomatico(events, fin).mode, 'diploma');
  assert.equal(estadoAutomatico(events, fin + 14999).record.key, 'uno');
  assert.equal(estadoAutomatico(events, fin + 15000).mode, 'contador');
  assert.equal(estadoAutomatico(events, fin + 15000).record.key, 'dos');
});
test('termina el programa y permite acelerar la duración de la prueba', () => {
  assert.equal(estadoAutomatico(events, fin + 4000, 4000).record.key, 'dos');
  assert.equal(estadoAutomatico(events, fin + 1200000).mode, 'fin');
  assert.equal(estadoAutomatico([], inicio).mode, 'fin');
});
test('durante un receso muestra su pantalla con la actividad que sigue', () => {
  const conReceso = [
    events[0],
    { key: 'receso', startMs: fin, endMs: fin + 600000, kind: 'break' },
    { key: 'tres', startMs: fin + 600000, endMs: fin + 1800000 }
  ];
  assert.equal(estadoAutomatico(conReceso, fin + 1000).mode, 'diploma');
  const estado = estadoAutomatico(conReceso, fin + 15000);
  assert.equal(estado.mode, 'receso');
  assert.equal(estado.record.key, 'receso');
  assert.equal(estado.siguiente.key, 'tres');
  assert.equal(estadoAutomatico(conReceso, fin + 600000).record.key, 'tres');
  assert.equal(estadoAutomatico(conReceso.slice(1), fin - 1000).record.key, 'tres');
});
