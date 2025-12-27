// Parish Gallery JavaScript - gallery.js
// Categories for filtering
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

  let modalIndex = 0;

  const images = [
    {
      src: 'easter.jpg',
      alt: 'Easter Mass',
      caption: 'Easter Sunday Mass celebration',
      date: '2025-03-31',
      category: 'Mass & Liturgy'
    },
    {
      src: 'baptism.jpg',
      alt: 'Baptism Ceremony',
      caption: 'Baptism of new parishioners',
      date: '2025-04-15',
      category: 'Sacraments'
    },
    {
      src: 'choir.jpg',
      alt: 'Parish Choir',
      caption: 'Parish choir performing during Mass',
      date: '2025-12-24',
      category: 'Choir & Youth'
    },
    {
      src: 'christi.jpg',
      alt: 'Corpus Christi',
      caption: 'Corpus Christi procession',
      date: '2025-06-08',
      category: 'Feasts & Seasons'
    },
    {
      src: 'youth.jpg',
      alt: 'Youth Group',
      caption: 'Youth group gathering',
      date: '2025-08-12',
      category: 'Choir & Youth'
    },
    {
      src: 'confirmation.jpg',
      alt: 'Confirmation',
      caption: 'Confirmation Mass with Bishop',
      date: '2025-05-20',
      category: 'Sacraments'
    }
  ];
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
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
