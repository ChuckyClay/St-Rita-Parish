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
    const images = [
      { src: 'easter.jpg', alt: 'Easter Mass', caption: 'Easter Sunday Mass celebration' },
      { src: 'baptism.jpg', alt: 'Baptism', caption: 'Baptism of new parishioners' },
      { src: 'choir.jpg', alt: 'Parish Choir', caption: 'Parish choir performing during Mass' },
      { src: 'christi.jpg', alt: 'Corpus Christi', caption: 'Corpus Christi procession' },
      { src: 'youth.jpg', alt: 'Youth Group', caption: 'Youth group gathering' },
      { src: 'confirmation.jpg', alt: 'Confirmation', caption: 'Confirmation Mass with Bishop' }
    ];

    const grid = document.getElementById('gallery-grid');
    const modal = document.getElementById('gallery-modal');
    const modalImg = modal.querySelector('.gallery-simple-modal-img');
    const modalCaption = modal.querySelector('.gallery-simple-modal-caption');
    const modalClose = modal.querySelector('.gallery-simple-modal-close');

    // Render gallery grid
    images.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-simple-item';
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', img.caption);
      item.innerHTML = `
        <img class="gallery-simple-img" src="${img.src}" alt="${img.alt}" loading="lazy" />
        <div class="gallery-simple-caption">${img.caption || ''}</div>
      `;
      item.addEventListener('click', () => openModal(idx));
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(idx); });
      grid.appendChild(item);
    });

    let modalIndex = 0;
    function openModal(idx) {
      modalIndex = idx;
      showModalImage();
      modal.classList.add('active');
      modal.focus();
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    function showModalImage() {
      const img = images[modalIndex];
      modalImg.src = img.src;
      modalImg.alt = img.alt;
      modalCaption.textContent = img.caption || '';
    }
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    modal.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  });
    modalClose.focus();
  }
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  function showModalImage() {
    const img = filteredImages[modalIndex];
    modalImg.src = img.src;
    modalImg.alt = img.alt;
    modalCaption.textContent = img.caption || '';
    modalDate.textContent = img.date ? formatDate(img.date) : '';
    modalPrev.disabled = modalIndex === 0;
    modalNext.disabled = modalIndex === filteredImages.length - 1;
  }
  modalClose.addEventListener('click', closeModal);
  modalPrev.addEventListener('click', () => { if (modalIndex > 0) { modalIndex--; showModalImage(); } });
  modalNext.addEventListener('click', () => { if (modalIndex < filteredImages.length - 1) { modalIndex++; showModalImage(); } });
  // Keyboard navigation
  modal.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft' && modalIndex > 0) { modalIndex--; showModalImage(); }
    if (e.key === 'ArrowRight' && modalIndex < filteredImages.length - 1) { modalIndex++; showModalImage(); }
  });
  // Click outside modal content closes
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Utility: format date
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Initial render
  renderImages();
