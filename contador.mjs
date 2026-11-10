const duracionMinima = 60000;

export function desglose(total) {
  const segundos = Math.max(0, Math.floor(total));
  return {
    dias: Math.floor(segundos / 86400),
    horas: Math.floor(segundos % 86400 / 3600),
    minutos: Math.floor(segundos % 3600 / 60),
    segundos: segundos % 60
  };
}

export function estadoActividad(inicio, fin, ahora = Date.now()) {
  if (![inicio, fin, ahora].every(Number.isFinite) || fin <= inicio) {
    throw new Error('Horario de actividad inválido.');
  }
  const tipo = ahora < inicio ? 'antes' : ahora < fin ? 'durante' : 'despues';
  const restante = tipo === 'despues' ? 0 : Math.ceil(((tipo === 'antes' ? inicio : fin) - ahora) / 1000);
  return { tipo, ...desglose(restante) };
}

// Recalcula el horario real de un día a partir de los ajustes del operador.
// ajustes[key]: inicio (ms real de arranque), fin (ms en que se terminó), extra (ms sumados a la duración), omitida.
// Una actividad nunca empieza antes de su hora programada ni antes de que termine la anterior,
// así que los retrasos se arrastran y los adelantos se recuperan solo hasta volver al programa.
// Con `esperar`, una actividad iniciada (con `inicio`) que agota su tiempo queda en tiempo extra
// hasta que el operador la termina, y las siguientes quedan en espera.
export function calcularHorario(actividades, ajustes = {}, ahora = Date.now(), { esperar = false } = {}) {
  let finAnterior = -Infinity;
  let enEspera = false;
  return actividades.map(actividad => {
    const ajuste = ajustes[actividad.key] || {};
    const startMs = Math.max(ajuste.inicio ?? actividad.startMs, finAnterior);
    const base = { ...actividad, plannedStartMs: actividad.startMs, plannedEndMs: actividad.endMs, startMs, enEspera, tiempoExtra: false, omitida: false };
    if (ajuste.omitida) return { ...base, endMs: startMs, omitida: true };
    const duracion = actividad.endMs - actividad.startMs;
    const endMs = ajuste.fin != null ? Math.max(ajuste.fin, startMs + 1000)
      : startMs + Math.max(Math.min(duracionMinima, duracion), duracion + (ajuste.extra || 0));
    const tiempoExtra = esperar && actividad.kind !== 'break' && ajuste.inicio != null && ajuste.fin == null && endMs <= ahora;
    finAnterior = tiempoExtra ? ahora : endMs;
    enEspera ||= tiempoExtra;
    return { ...base, endMs, tiempoExtra };
  });
}

export function estadoAutomatico(actividades, ahora) {
  const actual = actividades.find(a => !a.enEspera && a.startMs <= ahora && (a.tiempoExtra || ahora < a.endMs));
  // Durante un receso se muestra su pantalla; antes de él, el contador apunta a la siguiente actividad real.
  const siguiente = actividades.find(a => a.kind !== 'break' && (a.startMs > ahora || a.enEspera));
  if (actual?.kind === 'break') return { mode: 'receso', record: actual, siguiente };
  return actual || siguiente ? { mode: 'contador', record: actual || siguiente } : { mode: 'fin' };
}
