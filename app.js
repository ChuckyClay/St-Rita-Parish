// Simple frontend app for St. Rita Parish (static prototype)
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('nav a[data-view]');
const readingsEl = document.getElementById('daily-reading');
const readingDateEl = document.getElementById('reading-date');
const refreshBtn = document.getElementById('refresh-readings');

function showView(name){
  views.forEach(v=> v.id===name ? v.classList.remove('hidden') : v.classList.add('hidden'));
  navLinks.forEach(a=> a.classList.toggle('active', a.dataset.view===name));
}

navLinks.forEach(a=> a.addEventListener('click', e=>{ e.preventDefault(); showView(a.dataset.view); }));

async function loadReadings(){
  readingsEl.textContent = 'Loading...';
  try{
    const res = await fetch('readings.json');
    if(!res.ok) throw new Error('no local readings');
    const data = await res.json();
    readingDateEl.textContent = data.date || '';
    readingsEl.innerHTML = `<h3>${data.title || 'Reading'}</h3><p>${data.content || ''}</p>`;
  }catch(err){
    // fallback sample
    readingDateEl.textContent = new Date().toLocaleDateString();
    readingsEl.innerHTML = `<h3>Sample Reading</h3><p>The Lord is my shepherd; I shall not want. — Psalm 23</p>`;
  }
}

// Announcements and songs are stored in localStorage for the prototype
function loadAnnouncements(){
  const list = document.getElementById('announcements-list');
  const anns = JSON.parse(localStorage.getItem('announcements')||'[]');
  list.innerHTML = anns.length? anns.map(a=>`<li>${a}</li>`).join('') : '<li>No announcements</li>';
}

function loadSongs(){
  const list = document.getElementById('songs-list');
  const songs = JSON.parse(localStorage.getItem('songs')||'[]');
  list.innerHTML = songs.length? songs.map(s=>`<li>${s}</li>`).join('') : '<li>No songs</li>';
}

refreshBtn.addEventListener('click', ()=> loadReadings());

// initial
showView('home');
loadReadings();
loadAnnouncements();
loadSongs();

// Expose helper for admin page to call
window.__stRitaApp = {
  refresh: ()=>{ loadReadings(); loadAnnouncements(); loadSongs(); }
};