import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularHorario, estadoAutomatico, desglose } from '../dist/contador.mjs';

const min = 60000;
const t0 = Date.parse('2026-11-12T10:30:00-06:00');
const dia = [
  { key: 'a', startMs: t0, endMs: t0 + 20 * min },
  { key: 'b', startMs: t0 + 20 * min, endMs: t0 + 40 * min },
  { key: 'r', startMs: t0 + 40 * min, endMs: t0 + 50 * min, kind: 'break' },
  { key: 'c', startMs: t0 + 50 * min, endMs: t0 + 70 * min }
];
const por = lista => Object.fromEntries(lista.map(a => [a.key, a]));

test('sin ajustes conserva el programa', () => {
  const h = calcularHorario(dia, {}, t0);
  assert.deepEqual(h.map(a => [a.startMs, a.endMs]), dia.map(a => [a.startMs, a.endMs]));
  assert.ok(h.every(a => !a.tiempoExtra && !a.enEspera && !a.omitida));
});

test('extender una ponencia recorre las siguientes', () => {
  const h = por(calcularHorario(dia, { a: { extra: 5 * min } }, t0));
  assert.equal(h.a.endMs, t0 + 25 * min);
  assert.equal(h.b.startMs, t0 + 25 * min);
  assert.equal(h.c.startMs, t0 + 55 * min);
  assert.equal(h.c.plannedStartMs, t0 + 50 * min);
});

test('terminar antes no adelanta la siguiente respecto al programa', () => {
  const h = por(calcularHorario(dia, { a: { inicio: t0, fin: t0 + 15 * min } }, t0 + 15 * min));
  assert.equal(h.a.endMs, t0 + 15 * min);
  assert.equal(h.b.startMs, t0 + 20 * min);
});

test('terminar antes recupera un retraso acumulado', () => {
  const h = por(calcularHorario(dia, { a: { extra: 10 * min }, b: { fin: t0 + 35 * min } }, t0 + 35 * min));
  assert.equal(h.b.startMs, t0 + 30 * min);
  assert.equal(h.r.startMs, t0 + 40 * min);
});

test('la duración nunca baja de un minuto', () => {
  const h = por(calcularHorario(dia, { a: { extra: -60 * min } }, t0));
  assert.equal(h.a.endMs, t0 + min);
  const corta = calcularHorario([{ key: 'x', startMs: t0, endMs: t0 + 9000 }], { x: { extra: -min } }, t0);
  assert.equal(corta[0].endMs, t0 + 9000);
});

test('con espera, una ponencia iniciada queda en tiempo extra y las siguientes esperan', () => {
  const ahora = t0 + 23 * min;
  const h = por(calcularHorario(dia, { a: { inicio: t0 } }, ahora, { esperar: true }));
  assert.equal(h.a.tiempoExtra, true);
  assert.equal(h.b.enEspera, true);
  assert.equal(h.b.startMs, ahora);
  assert.equal(h.c.startMs, t0 + 53 * min);
});

test('sin inicio registrado no hay tiempo extra aunque se espere', () => {
  const h = por(calcularHorario(dia, {}, t0 + 23 * min, { esperar: true }));
  assert.equal(h.a.tiempoExtra, false);
  assert.equal(h.b.startMs, t0 + 20 * min);
});

test('los recesos no esperan confirmación', () => {
  const h = por(calcularHorario(dia, { r: { inicio: t0 + 40 * min } }, t0 + 55 * min, { esperar: true }));
  assert.equal(h.r.tiempoExtra, false);
});

test('omitir una actividad no ocupa tiempo', () => {
  const h = por(calcularHorario(dia, { a: { extra: 5 * min }, b: { omitida: true } }, t0));
  assert.equal(h.b.omitida, true);
  assert.equal(h.b.endMs, h.b.startMs);
  assert.equal(h.r.startMs, t0 + 40 * min);
});

test('el modo automático sigue en la ponencia con tiempo extra', () => {
  const ahora = t0 + 23 * min;
  const h = calcularHorario(dia, { a: { inicio: t0 } }, ahora, { esperar: true });
  const estado = estadoAutomatico(h, ahora);
  assert.equal(estado.mode, 'contador');
  assert.equal(estado.record.key, 'a');
});

test('al terminar la ponencia con tiempo extra pasa a la siguiente', () => {
  const fin = t0 + 24 * min;
  const h = calcularHorario(dia, { a: { inicio: t0, fin } }, fin + 1000, { esperar: true });
  assert.equal(estadoAutomatico(h, fin + 1000).mode, 'contador');
  assert.equal(estadoAutomatico(h, fin + 1000).record.key, 'b');
  assert.equal(h.find(a => a.key === 'b').startMs, fin);
});

test('desglose separa días, horas, minutos y segundos', () => {
  assert.deepEqual(desglose(90061.9), { dias: 1, horas: 1, minutos: 1, segundos: 1 });
  assert.deepEqual(desglose(-5), { dias: 0, horas: 0, minutos: 0, segundos: 0 });
});

test('la primera actividad del día espera a que el operador la inicie', () => {
  const manual = [{ ...dia[0], manual: true }, ...dia.slice(1)];
  const antes = por(calcularHorario(manual, {}, t0 - 1000, { esperar: true }));
  assert.equal(antes.a.porIniciar, undefined);
  const ahora = t0 + 3 * min;
  const h = por(calcularHorario(manual, {}, ahora, { esperar: true }));
  assert.equal(h.a.porIniciar, true);
  assert.equal(h.a.startMs, ahora);
  assert.equal(h.b.enEspera, true);
  assert.equal(h.b.startMs, ahora + 20 * min);
  assert.equal(estadoAutomatico(Object.values(h), ahora).record.key, 'a');
  const iniciada = por(calcularHorario(manual, { a: { inicio: ahora } }, ahora + 1000, { esperar: true }));
  assert.equal(iniciada.a.porIniciar, undefined);
  assert.equal(iniciada.a.endMs, ahora + 20 * min);
  // Sin esperar, arranca sola a su hora como antes.
  assert.equal(por(calcularHorario(manual, {}, ahora)).a.porIniciar, undefined);
});
