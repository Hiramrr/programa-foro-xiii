// Con ?t=2026-11-12T09:09:56 la página corre con un reloj simulado que arranca en ese instante
// (hora del foro, -06:00) y avanza al ritmo normal. Lo usa pruebas.html para saltar a cualquier hito.
const parametro = new URLSearchParams(location.search).get('t');
const inicio = parametro ? Date.parse(`${parametro}-06:00`) : NaN;

export const simulado = Number.isFinite(inicio);

if (simulado) {
  const real = Date.now;
  const desfase = inicio - real();
  Date.now = () => real() + desfase;
}
