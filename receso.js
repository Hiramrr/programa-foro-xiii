export function tazaAnimada() {
  const nodo = document.createElement('div');
  nodo.className = 'taza';
  nodo.setAttribute('aria-hidden', 'true');
  nodo.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 40" width="288" height="240" shape-rendering="crispEdges" focusable="false">
      <g class="vapor" fill="var(--tenue)">
        <path d="M16 4h2v3h-2v2h-2V7h2z M14 11h2v2h-2z"/>
        <path d="M23 2h2v3h-2v2h-2V5h2z M21 9h2v3h-2z"/>
        <path d="M30 4h2v3h-2v2h-2V7h2z M28 11h2v2h-2z"/>
      </g>
      <g fill="var(--azul)">
        <path d="M6 34h36v2h-2v2H8v-2H6z"/>
        <path d="M10 14h24v3h6v2h2v8h-2v2h-6v3h-2v2H12v-2h-2z"/>
      </g>
      <path fill="#fff" d="M34 19h4v2h2v4h-2v2h-4z"/>
      <path fill="#edf3fb" d="M12 16h20v14h-2v2H14v-2h-2z"/>
      <path fill="#bed1e7" d="M29 20h3v10h-2v2H14v-2h15z M8 34h32v2H8z"/>
      <path fill="#633d29" d="M12 16h20v4H12z"/>
      <path fill="#b47b4e" d="M14 16h16v1H14z"/>
      <path fill="#fff" d="M14 21h2v7h-2z"/>
      <path fill="var(--verde)" d="M12 24h20v5H12z"/>
      <path fill="var(--acento)" d="M14 24h15v3H14z"/>
      <path fill="#fff" d="M21 24h2v1h1v2h-1v1h-2v-1h-1v-2h1z"/>
    </svg>`;
  return { nodo, detener: () => nodo.classList.add('detenida') };
}
