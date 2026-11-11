// Sincroniza el horario ajustado entre todas las pantallas por medio de ntfy.sh (sin cuenta).
// Quien opera publica el estado completo en cada cambio; las demás pantallas lo reciben al instante.
// Al conectarse, cada pantalla recibe primero el último estado publicado (ntfy lo guarda 12 horas).
const servidor = 'https://ntfy.sh/';

export function crearSync({ canal, alRecibir, alEstado }) {
  const origen = Math.random().toString(36).slice(2, 12);
  let fuente = null;
  let pendiente = null;
  let espera;
  let reintento;
  let reconexion;

  function conectar() {
    clearTimeout(reconexion);
    fuente?.close();
    fuente = new EventSource(`${servidor}${canal}/sse?since=latest`);
    fuente.addEventListener('open', () => alEstado(true));
    fuente.addEventListener('error', () => {
      alEstado(false);
      // EventSource se reconecta solo, salvo si el servidor respondió con error.
      if (fuente.readyState === EventSource.CLOSED) reconexion = setTimeout(conectar, 5000);
    });
    fuente.addEventListener('message', evento => {
      try {
        const datos = JSON.parse(evento.data);
        if (datos.event !== 'message') return;
        const estado = JSON.parse(datos.message);
        if (estado?.v === 1 && estado.origen !== origen) alRecibir(estado);
      } catch { /* Mensajes ajenos o dañados se ignoran. */ }
    });
  }

  async function enviar() {
    if (!pendiente) return;
    const cuerpo = pendiente;
    try {
      const respuesta = await fetch(`${servidor}${canal}`, { method: 'POST', body: JSON.stringify(cuerpo) });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      if (pendiente === cuerpo) pendiente = null;
      alEstado(true);
    } catch {
      // Sin red el cambio queda pendiente y se reintenta hasta que salga.
      alEstado(false);
      clearTimeout(reintento);
      reintento = setTimeout(enviar, 5000);
    }
  }

  // Los clics seguidos (por ejemplo, +1 +1 +1) salen en un solo mensaje.
  function publicar(estado) {
    pendiente = { v: 1, origen, ...estado };
    clearTimeout(espera);
    espera = setTimeout(enviar, 400);
  }

  conectar();
  addEventListener('online', () => { conectar(); enviar(); });
  return { publicar };
}
