// Frontend app for St. Rita Parish

// Load announcements preview
async function loadAnnouncementsPreview() {
  const container = document.getElementById('announcements-preview');
  if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/announcements');
    const announcements = await res.json();
    const recent = announcements.slice(0, 3); // Show latest 3
    container.innerHTML = recent.map(ann => `
      <div class="card">
        <h4>${ann.title}</h4>
        <p class="meta">${new Date(ann.date).toLocaleDateString()}</p>
        <p>${ann.content}</p>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p>Unable to load announcements.</p>';
  }
}

// Load events preview
async function loadEventsPreview() {
  const container = document.getElementById('events-preview');
  if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/events');
    const events = await res.json();
    const upcoming = events.slice(0, 3); // Show next 3
    container.innerHTML = upcoming.map(event => `
      <div class="card event-card">
        <h4>${event.title}</h4>
        <p class="meta">${new Date(event.date).toLocaleDateString()} at ${event.time}</p>
        <p>${event.description}</p>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p>Unable to load events.</p>';
  }
}

// Load daily readings preview
async function loadDailyReadingsPreview() {
  const container = document.getElementById('daily-readings-preview');
  if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/readings');
    const data = await res.json();
    const today = new Date().toISOString().split('T')[0];
    // Default language is English
    let currentLang = localStorage.getItem('readingLang') || 'en';
    function renderReadings(lang) {
      let firstReading = data.firstReading;
      let psalm = data.psalm;
      let gospel = data.gospel;
      // If multi-language, use selected lang
      if (firstReading[lang] && psalm[lang] && gospel[lang]) {
        firstReading = firstReading[lang];
        psalm = psalm[lang];
        gospel = gospel[lang];
      }
      if (data.date === today) {
        container.innerHTML = `
          <p class="meta">${new Date(data.date).toLocaleDateString()}</p>
          <h4>${firstReading.title}</h4>
          <p>${firstReading.text.substring(0, 200)}...</p>
          <h4>${psalm.title}</h4>
          <p>${psalm.text.substring(0, 200)}...</p>
          <h4>${gospel.title}</h4>
          <p>${gospel.text.substring(0, 200)}...</p>
        `;
      } else {
        container.innerHTML = `<p>No readings available for today.</p>`;
      }
    }
    renderReadings(currentLang);
    // Language toggle buttons
    const btnEn = document.getElementById('lang-en');
    const btnSw = document.getElementById('lang-sw');
    if (btnEn && btnSw) {
      btnEn.onclick = () => {
        currentLang = 'en';
        localStorage.setItem('readingLang', 'en');
        btnEn.setAttribute('aria-pressed', 'true');
        btnSw.setAttribute('aria-pressed', 'false');
        renderReadings('en');
      };
      btnSw.onclick = () => {
        currentLang = 'sw';
        localStorage.setItem('readingLang', 'sw');
        btnEn.setAttribute('aria-pressed', 'false');
        btnSw.setAttribute('aria-pressed', 'true');
        renderReadings('sw');
      };
    }
  } catch (err) {
    container.innerHTML = `<p>Unable to load daily readings.</p>`;
  }
}

// Initialize home page
if (document.getElementById('announcements-preview')) {
  loadAnnouncementsPreview();
  loadEventsPreview();
  loadDailyReadingsPreview();
}

// Toggle menu for mobile
const menuToggle = document.getElementById('menu-toggle');
const nav = document.querySelector('.site-header nav');
if (menuToggle && nav) {
  menuToggle.addEventListener('click', function() {
    nav.classList.toggle('open');
  });
}

document.body.addEventListener("click", (e) => {
  if (!nav.contains(e.target) && e.target !== menuToggle) {
    nav.classList.remove('open');
  }
});
