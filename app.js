// Frontend app for St. Rita Parish

// Load announcements preview
async function loadAnnouncementsPreview() {
  const container = document.getElementById('announcements-preview');
  if (!container) return;
  try {
    const res = await fetch('announcements.json');
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
    const res = await fetch('events.json');
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

// Initialize home page
if (document.getElementById('announcements-preview')) {
  loadAnnouncementsPreview();
  loadEventsPreview();
}