import { programa } from './programa.js';

const activities = document.querySelector('#activities');
const search = document.querySelector('#buscar');
const count = document.querySelector('#result-count');
const dayButtons = [...document.querySelectorAll('[data-day]')];
let selectedDay = 'jueves';

const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

function renderAgenda() {
  const day = programa[selectedDay];
  const query = normalize(search.value.trim());
  const matches = day.activities.filter(activity => normalize([activity.title, activity.speaker, activity.session].filter(Boolean).join(' ')).includes(query));
  document.querySelector('#dia-titulo').textContent = day.label;
  dayButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.day === selectedDay)));
  activities.replaceChildren();
  let previousSession = '';
  for (const activity of matches) {
    if (activity.session && activity.session !== previousSession) {
      const session = document.createElement('li');
      session.className = 'agenda-session';
      const heading = document.createElement('h3');
      heading.textContent = activity.session;
      session.append(heading);
      activities.append(session);
    }
    previousSession = activity.session || '';
    const row = document.createElement('li');
    row.className = activity.kind === 'break' ? 'activity break' : 'activity';
    const time = document.createElement('div');
    time.className = 'activity-time';
    const start = document.createElement('time');
    start.dateTime = `${day.date}T${activity.start}:00-06:00`;
    start.textContent = activity.start;
    const end = document.createElement('time');
    end.dateTime = `${day.date}T${activity.end}:00-06:00`;
    end.textContent = activity.end;
    time.append(start, ' a ', end);
    const detail = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = activity.title;
    detail.append(title);
    if (activity.speaker) {
      const speaker = document.createElement('p');
      speaker.textContent = activity.speaker;
      detail.append(speaker);
    }
    row.append(time, detail);
    activities.append(row);
  }
  count.textContent = query ? `${matches.length} ${matches.length === 1 ? 'actividad encontrada' : 'actividades encontradas'}` : '';
  document.querySelector('#no-results').hidden = matches.length !== 0;
}

dayButtons.forEach(button => button.addEventListener('click', () => {
  selectedDay = button.dataset.day;
  renderAgenda();
}));
search.addEventListener('input', renderAgenda);
renderAgenda();
document.querySelector('#program-controls').hidden = false;

const siteUrl = document.querySelector('link[rel="canonical"]').href;
const invitation = document.querySelector('#invitation-text');
invitation.value += `\n\nConsulta el programa y la sede: ${siteUrl}`;
const status = document.querySelector('#copy-status');
const copyButton = document.querySelector('#copy-invitation');
const shareButton = document.querySelector('#share-page');

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(invitation.value);
    status.textContent = 'Invitación copiada.';
  } catch {
    invitation.focus();
    invitation.select();
    status.textContent = 'El navegador no permitió copiar. El texto está seleccionado para que lo copies.';
  }
});

shareButton.addEventListener('click', async () => {
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, text: 'XIII Foro · 12 y 13 de noviembre de 2026, Xalapa.', url: siteUrl });
    } else {
      await navigator.clipboard.writeText(siteUrl);
      status.textContent = 'Enlace copiado.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') status.textContent = `Comparte este enlace: ${siteUrl}`;
  }
});
copyButton.hidden = false;
shareButton.hidden = false;
