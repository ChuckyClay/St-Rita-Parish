// Parish Gallery JavaScript - gallery.js

// Run gallery code immediately (script is loaded at end of body)
defineGallery();

function defineGallery() {
  // Use only the user's actual images
  // DOM Elements (must be defined before use)
  const grid = document.getElementById('gallery-grid');
  const filterBtns = document.querySelectorAll('.gallery-filter-btn');
  const loadMoreBtn = document.getElementById('gallery-loadmore');
  const modal = document.getElementById('gallery-modal');
  const modalImg = modal.querySelector('.gallery-modal-img');
  const modalCaption = modal.querySelector('.gallery-modal-caption');
  const modalDate = modal.querySelector('.gallery-modal-date');
  const modalClose = modal.querySelector('.gallery-modal-close');
  const modalPrev = document.getElementById('gallery-prev');
  const modalNext = document.getElementById('gallery-next');


  // Simple, clean, accessible gallery
  document.addEventListener('DOMContentLoaded', function() {
    // Placeholder images and captions (replace with your own if desired)
    const mediaItems = [];

    const grid = document.getElementById('gallery-grid');
    const modal = document.getElementById('gallery-modal');
    const modalImg = modal.querySelector('.gallery-simple-modal-img');
    const modalCaption = modal.querySelector('.gallery-simple-modal-caption');
    const modalClose = modal.querySelector('.gallery-simple-modal-close');

    function getAllMedia() {
      let uploaded = [];
      try {
        // uploaded = JSON.parse(localStorage.getItem('galleryMedia') || '[]');
        // All media should now be managed via backend API.
      } catch {}
      return [...mediaItems, ...uploaded];
    }
    let allMedia = getAllMedia();
    let filteredItems = allMedia;
    function renderGalleryGrid() {
      grid.innerHTML = '';
      filteredItems.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'gallery-simple-item';
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', item.caption);
        if (item.type === 'image') {
          const altText = item.alt && item.alt.trim().length > 0 ? item.alt : item.caption || 'Gallery image';
          el.innerHTML = `
            <img class="gallery-simple-img" src="${item.src}" alt="${altText}" loading="lazy" />
            <div class="gallery-simple-caption">${item.caption || ''}</div>
          `;
        } else if (item.type === 'video') {
          el.innerHTML = `
            <div class="gallery-simple-video-thumb" style="background:#222; color:#fff; display:flex; align-items:center; justify-content:center; height:180px;">
              <span style="font-size:2rem;">▶</span>
            </div>
            <div class="gallery-simple-caption">${item.caption || ''}</div>
          `;
        }
        el.addEventListener('click', () => openModal(idx));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(idx); });
        grid.appendChild(el);
      });
    }
    renderGalleryGrid();

    // Filtering
    const filterSelect = document.getElementById('gallery-filter-event');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        const val = filterSelect.value;
        allMedia = getAllMedia();
        if (val === 'all') {
          filteredItems = allMedia;
        } else {
          filteredItems = allMedia.filter(item => item.event === val);
        }
        renderGalleryGrid();
      });
    }

    let modalIndex = 0;
    function openModal(idx) {
      modalIndex = idx;
      showModalMedia();
      modal.classList.add('active');
      modal.focus();
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    function showModalMedia() {
      const item = filteredItems[modalIndex];
      const modalMedia = document.getElementById('gallery-modal-media');
      if (item.type === 'image') {
        modalMedia.innerHTML = `<img class="gallery-simple-modal-img" src="${item.src}" alt="${item.alt}" />`;
      } else if (item.type === 'video') {
        modalMedia.innerHTML = `<iframe width="100%" height="315" src="${item.src}" frameborder="0" allowfullscreen></iframe>`;
      }
      modalCaption.textContent = item.caption || '';
    }
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    modal.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  });
}
