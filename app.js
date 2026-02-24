// Frontend app for St. Rita Parish

// Load announcements preview
async function loadAnnouncementsPreview() {
  const container = document.getElementById('announcements-preview');
  if (!container) return;
  try {
    const res = await fetch('https://st-rita-parish.onrender.com/api/announcements');
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
    const res = await fetch('https://st-rita-parish.onrender.com/api/events');
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
    const res = await fetch('https://st-rita-parish.onrender.com/api/readings');
    const readings = await res.json();
    const today = new Date().toISOString().split('T')[0];
    const todayReadings = readings.filter(r => r.date === today);
    if (todayReadings.length > 0) {
      // Show preview of first 3 readings
      container.innerHTML = `<p class="meta">${new Date(today).toLocaleDateString()}</p>` +
        todayReadings.slice(0, 3).map(r => `
          <div class="card">
            <h4>${r.title}</h4>
            <p>${r.content.substring(0, 200)}...</p>
          </div>
        `).join('');
    } else {
      container.innerHTML = `<p>No readings available for today.</p>`;
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
