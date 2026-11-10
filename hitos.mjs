const esReceso = actividad => actividad.kind === 'break';
const orden = { fin: 0, sesion: 1, 'fin-dia': 1, 'fin-foro': 1, mitad: 2, receso: 3, inicio: 3, 'inicio-dia': 3, 'inicio-foro': 3 };

// Devuelve los hitos cuyo instante cae en el intervalo (desde, hasta].
export function hitosEntre(actividades, desde, hasta) {
  if (!(hasta > desde)) return [];
  const lista = [...actividades].sort((a, b) => a.startMs - b.startMs);
  const charlas = lista.filter(a => !esReceso(a));
  const dias = [...new Set(lista.map(a => a.day))];
  const total = charlas.length;
  const terminadas = t => charlas.filter(a => a.endMs <= t).length;
  const dentro = t => desde < t && t <= hasta;
  const hitos = [];
  for (const actividad of lista) {
    const dia = dias.indexOf(actividad.day) + 1;
    const delDia = charlas.filter(a => a.day === actividad.day);
    if (dentro(actividad.startMs)) {
      const tipo = esReceso(actividad) ? 'receso' : actividad === charlas[0] ? 'inicio-foro' : actividad === delDia[0] ? 'inicio-dia' : 'inicio';
      hitos.push({ tipo, record: actividad, at: actividad.startMs, dia, completadas: terminadas(actividad.startMs), total });
    }
    if (esReceso(actividad) || !dentro(actividad.endMs)) continue;
    const base = { record: actividad, at: actividad.endMs, dia, completadas: terminadas(actividad.endMs), total };
    if (actividad === charlas.at(-1)) {
      hitos.push({ tipo: 'fin-foro', ...base });
      continue;
    }
    if (actividad === delDia.at(-1)) {
      hitos.push({ tipo: 'fin-dia', ...base, siguiente: charlas.find(a => a.day !== actividad.day && a.startMs >= actividad.endMs) });
    } else {
      hitos.push({ tipo: 'fin', ...base });
      const sesion = actividad.session ? lista.filter(a => a.session === actividad.session) : [];
      if (sesion.at(-1) === actividad) hitos.push({ tipo: 'sesion', ...base, ponencias: sesion.length });
    }
    if (total >= 6 && base.completadas === Math.ceil(total / 2)) hitos.push({ tipo: 'mitad', ...base });
  }
  return hitos.sort((a, b) => a.at - b.at || orden[a.tipo] - orden[b.tipo]);
}
