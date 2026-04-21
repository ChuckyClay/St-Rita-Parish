const API_BASE = 'https://st-rita-parish.onrender.com';

/* =========================
   UTILITIES
========================= */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function setLoading(container, text = 'Loading...') {
  container.innerHTML = `<div class="card"><p>${text}</p></div>`;
}

function setError(container, text = 'Unable to load data.') {
  container.innerHTML = `<div class="card"><p>${text}</p></div>`;
}

function setEmpty(container, text = 'No data available.') {
  container.innerHTML = `<div class="card"><p>${text}</p></div>`;
}

/* =========================
   MOBILE MENU
========================= */

function initMenuToggle() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.querySelector('.site-header nav');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  // Close when clicking a link (mobile UX)
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      nav.classList.remove('open');
    }
  });

  // Lock body scroll when menu is open
  document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
}

/* =========================
   DAILY READINGS PREVIEW (HOME)
========================= */

async function loadDailyReadingsPreview() {
  const container = document.getElementById('daily-readings-preview');
  if (!container) return;

  setLoading(container, 'Loading today’s readings...');

  try {
    const readings = await fetchJson(`${API_BASE}/api/readings?lang=en`);

    if (!Array.isArray(readings) || readings.length === 0) {
      setEmpty(container, 'No readings available today.');
      return;
    }

    const first = readings[0];

    container.innerHTML = `
      <h3>${escapeHtml(first.day_title || 'Daily Reading')}</h3>
      ${first.lectionary ? `<p class="meta">${escapeHtml(first.lectionary)}</p>` : ''}
      <p><strong>${escapeHtml(first.title)}</strong></p>
      <p class="muted">${escapeHtml(first.content.slice(0, 180))}...</p>
    `;
  } catch (err) {
    console.error('Daily readings preview error:', err);
    setError(container, 'Unable to load daily readings.');
  }
}

/* =========================
   ANNOUNCEMENTS PREVIEW (HOME)
========================= */

async function loadAnnouncementsPreview() {
  const container = document.getElementById('announcements-preview');
  if (!container) return;

  setLoading(container, 'Loading announcements...');

  try {
    const announcements = await fetchJson(`${API_BASE}/api/announcements`);

    if (!Array.isArray(announcements) || announcements.length === 0) {
      setEmpty(container, 'No announcements available.');
      return;
    }

    const top = announcements.slice(0, 3);

    container.innerHTML = top.map(a => `
      <div class="card">
        <h3>${escapeHtml(a.title)}</h3>
        <p class="meta">${new Date(a.date).toLocaleDateString()}</p>
        <p>${escapeHtml(a.content.slice(0, 120))}...</p>
      </div>
    `).join('');
  } catch (err) {
    console.error('Announcements preview error:', err);
    setError(container, 'Unable to load announcements.');
  }
}

/* =========================
   EVENTS PREVIEW (HOME)
========================= */

async function loadEventsPreview() {
  const container = document.getElementById('events-preview');
  if (!container) return;

  setLoading(container, 'Loading events...');

  try {
    const events = await fetchJson(`${API_BASE}/api/events`);

    if (!Array.isArray(events) || events.length === 0) {
      setEmpty(container, 'No upcoming events.');
      return;
    }

    const top = events.slice(0, 3);

    container.innerHTML = top.map(e => `
      <div class="card">
        <h3>${escapeHtml(e.title)}</h3>
        <p class="meta">
          ${new Date(e.date).toLocaleDateString()}
          ${e.time ? ` • ${escapeHtml(e.time)}` : ''}
        </p>
        <p>${escapeHtml(e.description.slice(0, 120))}...</p>
      </div>
    `).join('');
  } catch (err) {
    console.error('Events preview error:', err);
    setError(container, 'Unable to load events.');
  }
}

/* =========================
   INIT
========================= */

document.addEventListener('DOMContentLoaded', () => {
  initMenuToggle();
  loadDailyReadingsPreview();
  loadAnnouncementsPreview();
  loadEventsPreview();
});

window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fade-up').forEach(el => {
    el.style.animationPlayState = 'running';
  });
});

function appendChatMessage(role, text) {
  const box = document.getElementById('chatbot-messages');
  if (!box) return;

  const div = document.createElement('div');
  div.className = `chatbot-message ${role}`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function initCatholicChatbot() {
  const toggle = document.getElementById('chatbot-toggle');
  const panel = document.getElementById('chatbot-panel');
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('chatbot-input');

  if (!toggle || !panel || !form || !input) return;

  toggle.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

    // Close on outside click
  document.addEventListener('click', (e) => {
    if (panel.style.display === 'block' && !panel.contains(e.target) && !toggle.contains(e.target)) {
      panel.style.display = 'none';
    }
  });


  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendChatMessage('user', message);
    input.value = '';
    appendChatMessage('bot', 'Thinking...');

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const data = await res.json();

      const messages = document.getElementById('chatbot-messages');
      messages.lastElementChild.remove();

      appendChatMessage('bot', data.reply || data.error || 'No response available.');
    } catch (err) {
      const messages = document.getElementById('chatbot-messages');
      messages.lastElementChild.remove();
      appendChatMessage('bot', 'Sorry, I could not respond right now.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCatholicChatbot();
});