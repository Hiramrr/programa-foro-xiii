import test from 'node:test';
import assert from 'node:assert/strict';
import { hitosEntre } from '../dist/hitos.mjs';
import { programa } from '../dist/programa.js';

const actividades = Object.entries(programa).flatMap(([day, data]) => data.activities.map(a => ({
  ...a, day, key: `${day}-${a.start}`,
  startMs: Date.parse(`${data.date}T${a.start}:00-06:00`),
  endMs: Date.parse(`${data.date}T${a.end}:00-06:00`)
})));
const en = (fecha, hora) => Date.parse(`${fecha}T${hora}:00-06:00`);
const tipos = (desde, hasta) => hitosEntre(actividades, desde, hasta).map(h => h.tipo);

test('festeja el inicio del foro con la inauguración', () => {
  const hitos = hitosEntre(actividades, en('2026-11-12', '09:10') - 1000, en('2026-11-12', '09:10'));
  assert.deepEqual(hitos.map(h => h.tipo), ['inicio-foro']);
  assert.equal(hitos[0].record.title, 'Inauguración');
  assert.deepEqual([hitos[0].completadas, hitos[0].total], [0, 22]);
});
test('agradece y luego anuncia la siguiente conferencia', () => {
  assert.deepEqual(tipos(en('2026-11-12', '10:40') - 1000, en('2026-11-12', '10:40')), ['fin', 'inicio']);
});
test('cierra la sesión antes de anunciar el receso', () => {
  const hitos = hitosEntre(actividades, en('2026-11-12', '11:40') - 1000, en('2026-11-12', '11:40'));
  assert.deepEqual(hitos.map(h => h.tipo), ['fin', 'sesion', 'receso']);
  assert.equal(hitos[1].ponencias, 3);
});
test('completa el primer día, marca la mitad e indica cuándo continúa', () => {
  const [hito, mitad] = hitosEntre(actividades, en('2026-11-12', '14:20') - 1000, en('2026-11-12', '14:20'));
  assert.equal(hito.tipo, 'fin-dia');
  assert.equal(mitad.tipo, 'mitad');
  assert.equal(hito.siguiente.start, '09:10');
  assert.equal(hito.siguiente.day, 'viernes');
});
test('arranca el segundo día', () => {
  assert.deepEqual(tipos(en('2026-11-13', '09:10') - 1000, en('2026-11-13', '09:10')), ['inicio-dia']);
});
test('festeja el final del foro con la clausura', () => {
  const [hito] = hitosEntre(actividades, en('2026-11-13', '14:40') - 1000, en('2026-11-13', '14:40'));
  assert.equal(hito.tipo, 'fin-foro');
  assert.deepEqual([hito.completadas, hito.total], [22, 22]);
});
test('no repite hitos ni festeja fuera del intervalo', () => {
  const t = en('2026-11-12', '10:40');
  assert.deepEqual(tipos(t, t + 1000), []);
  assert.deepEqual(tipos(t, t), []);
  assert.deepEqual(tipos(t - 1000, t - 1), []);
});
