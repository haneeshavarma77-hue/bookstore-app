/**
 * Bookstore Frontend
 * Communicates with the Spring Boot REST API at /api/books
 * Falls back to in-memory demo data when the backend is not available.
 */

const API_BASE = '/api/books';

/* ─── State ─────────────────────────────────────────────────── */
let books = [];           // master list from backend
let filteredBooks = [];   // currently displayed subset
let pendingDeleteId = null;

/* ─── Demo seed data (shown when API is unavailable) ────────── */
const DEMO_BOOKS = [
  {
    id: 1,
    title: 'The Pragmatic Programmer',
    author: 'David Thomas & Andrew Hunt',
    isbn: '978-0-13-595705-9',
    genre: 'Technology',
    price: 49.99,
    year: 2019,
    stock: 12,
    description: 'A landmark guide for developers who want to sharpen their skills and become more effective programmers.',
    coverUrl: ''
  },
  {
    id: 2,
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '978-0-13-235088-4',
    genre: 'Technology',
    price: 39.95,
    year: 2008,
    stock: 5,
    description: 'A handbook of agile software craftsmanship covering best practices for writing maintainable code.',
    coverUrl: ''
  },
  {
    id: 3,
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '978-0-441-17271-9',
    genre: 'Science Fiction',
    price: 14.99,
    year: 1965,
    stock: 20,
    description: 'An epic story of politics, religion, ecology and human nature set in a distant future galaxy.',
    coverUrl: ''
  },
  {
    id: 4,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0-7432-7356-5',
    genre: 'Fiction',
    price: 9.99,
    year: 1925,
    stock: 0,
    description: 'A tale of love, obsession and the elusive American Dream set in the glittering 1920s.',
    coverUrl: ''
  },
  {
    id: 5,
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    isbn: '978-0-06-231609-7',
    genre: 'History',
    price: 18.00,
    year: 2011,
    stock: 8,
    description: 'A bold and wide-ranging exploration of the history of humankind from the Stone Age to the 21st century.',
    coverUrl: ''
  },
  {
    id: 6,
    title: 'Atomic Habits',
    author: 'James Clear',
    isbn: '978-0-73-521129-2',
    genre: 'Self-Help',
    price: 22.00,
    year: 2018,
    stock: 15,
    description: 'A practical guide to building good habits and breaking bad ones through small, incremental changes.',
    coverUrl: ''
  }
];

/* ─── API helpers ────────────────────────────────────────────── */
let useDemoData = false;

async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : API_BASE + path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

async function loadBooks() {
  try {
    books = await apiFetch('');
    useDemoData = false;
  } catch {
    // Backend not running — use demo seed so the UI is still usable
    if (!useDemoData) {
      books = DEMO_BOOKS.map(b => ({ ...b }));
      useDemoData = true;
      showToast('Running in demo mode (backend not connected)', 'info');
    }
  }
  applyFilters();
}

async function createBook(payload) {
  if (useDemoData) {
    const newBook = { ...payload, id: Date.now() };
    books.unshift(newBook);
    return newBook;
  }
  const created = await apiFetch('', { method: 'POST', body: JSON.stringify(payload) });
  books.unshift(created);
  return created;
}

async function updateBook(id, payload) {
  if (useDemoData) {
    const idx = books.findIndex(b => b.id === id);
    if (idx !== -1) books[idx] = { ...books[idx], ...payload };
    return books[idx];
  }
  const updated = await apiFetch(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  const idx = books.findIndex(b => b.id === id);
  if (idx !== -1) books[idx] = updated;
  return updated;
}

async function deleteBook(id) {
  if (useDemoData) {
    books = books.filter(b => b.id !== id);
    return;
  }
  await apiFetch(`/${id}`, { method: 'DELETE' });
  books = books.filter(b => b.id !== id);
}

/* ─── Filters & sort ─────────────────────────────────────────── */
function applyFilters() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const genre = document.getElementById('genreFilter').value;
  const sort  = document.getElementById('sortSelect').value;

  filteredBooks = books.filter(b => {
    const matchesQuery = !query ||
      b.title.toLowerCase().includes(query) ||
      b.author.toLowerCase().includes(query);
    const matchesGenre = !genre || b.genre === genre;
    return matchesQuery && matchesGenre;
  });

  filteredBooks.sort((a, b) => {
    switch (sort) {
      case 'title-asc':   return a.title.localeCompare(b.title);
      case 'title-desc':  return b.title.localeCompare(a.title);
      case 'author-asc':  return a.author.localeCompare(b.author);
      case 'price-asc':   return (a.price || 0) - (b.price || 0);
      case 'price-desc':  return (b.price || 0) - (a.price || 0);
      case 'year-desc':   return (b.year || 0) - (a.year || 0);
      default:            return 0;
    }
  });

  renderGrid();
  updateStats();
}

/* ─── Render ─────────────────────────────────────────────────── */
function renderGrid() {
  const grid  = document.getElementById('bookGrid');
  const empty = document.getElementById('emptyState');
  const sub   = document.getElementById('emptyStateSub');

  grid.innerHTML = '';

  if (filteredBooks.length === 0) {
    grid.hidden  = true;
    empty.hidden = false;
    const hasSearch = document.getElementById('searchInput').value.trim() ||
                      document.getElementById('genreFilter').value;
    sub.textContent = hasSearch
      ? 'Try adjusting your search or filter.'
      : 'Add your first book to get started.';
    return;
  }

  grid.hidden  = false;
  empty.hidden = true;

  filteredBooks.forEach((book, i) => {
    const card = buildCard(book, i);
    grid.appendChild(card);
  });
}

function buildCard(book, index) {
  const card = document.createElement('article');
  card.className = 'book-card';
  card.style.animationDelay = `${Math.min(index * 40, 300)}ms`;

  const coverHtml = book.coverUrl
    ? `<img class="book-card__cover" src="${escHtml(book.coverUrl)}" alt="Cover of ${escHtml(book.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="book-card__cover-placeholder" style="display:none">${bookSvg()}</div>`
    : `<div class="book-card__cover-placeholder">${bookSvg()}</div>`;

  const stockBadge = book.stock > 0
    ? `<span class="badge badge--stock">${book.stock} in stock</span>`
    : `<span class="badge badge--out">Out of stock</span>`;

  const genreBadge = book.genre
    ? `<span class="badge">${escHtml(book.genre)}</span>`
    : '';

  const yearTxt = book.year ? `<span class="book-card__author">${book.year}</span>` : '';

  const descHtml = book.description
    ? `<p class="book-card__desc">${escHtml(book.description)}</p>`
    : '';

  card.innerHTML = `
    ${coverHtml}
    <div class="book-card__body">
      <h3 class="book-card__title">${escHtml(book.title)}</h3>
      <p class="book-card__author">by ${escHtml(book.author)}</p>
      <div class="book-card__meta">
        ${genreBadge}
        ${yearTxt ? stockBadge : ''}
      </div>
      ${descHtml}
    </div>
    <div class="book-card__footer">
      <span class="book-card__price">${book.price != null ? '$' + Number(book.price).toFixed(2) : '—'}</span>
      <div class="book-card__actions">
        <button class="btn--icon edit" data-id="${book.id}" title="Edit book" aria-label="Edit ${escHtml(book.title)}">
          ${editSvg()}
        </button>
        <button class="btn--icon delete" data-id="${book.id}" title="Delete book" aria-label="Delete ${escHtml(book.title)}">
          ${trashSvg()}
        </button>
      </div>
    </div>
  `;

  card.querySelector('.btn--icon.edit').addEventListener('click', () => openEditModal(book.id));
  card.querySelector('.btn--icon.delete').addEventListener('click', () => openDeleteModal(book.id, book.title));

  return card;
}

function updateStats() {
  const countEl = document.getElementById('bookCount');
  const extraEl = document.getElementById('statsExtra');
  const total = filteredBooks.length;
  countEl.textContent = `${total} ${total === 1 ? 'book' : 'books'}`;
  if (filteredBooks.length > 0) {
    const totalValue = filteredBooks.reduce((s, b) => s + (b.price || 0), 0);
    extraEl.textContent = `· avg $${(totalValue / total).toFixed(2)}`;
  } else {
    extraEl.textContent = '';
  }
}

/* ─── Modal: Add / Edit ──────────────────────────────────────── */
function openAddModal() {
  resetForm();
  document.getElementById('modalTitle').textContent = 'Add Book';
  document.getElementById('submitBtn').textContent  = 'Add Book';
  document.getElementById('bookId').value           = '';
  showModal('modal');
  document.getElementById('fieldTitle').focus();
}

function openEditModal(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;

  resetForm();
  document.getElementById('modalTitle').textContent = 'Edit Book';
  document.getElementById('submitBtn').textContent  = 'Save Changes';
  document.getElementById('bookId').value           = id;

  document.getElementById('fieldTitle').value  = book.title  || '';
  document.getElementById('fieldAuthor').value = book.author || '';
  document.getElementById('fieldIsbn').value   = book.isbn   || '';
  document.getElementById('fieldGenre').value  = book.genre  || '';
  document.getElementById('fieldPrice').value  = book.price  != null ? book.price : '';
  document.getElementById('fieldYear').value   = book.year   || '';
  document.getElementById('fieldDesc').value   = book.description || '';
  document.getElementById('fieldCover').value  = book.coverUrl    || '';
  document.getElementById('fieldStock').value  = book.stock  != null ? book.stock : '';

  showModal('modal');
  document.getElementById('fieldTitle').focus();
}

function resetForm() {
  document.getElementById('bookForm').reset();
  ['errTitle', 'errAuthor', 'errPrice'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  ['fieldTitle', 'fieldAuthor', 'fieldPrice'].forEach(id => {
    document.getElementById(id).classList.remove('input--invalid');
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const id    = document.getElementById('bookId').value;
  const isEdit = !!id;

  const payload = {
    title:       document.getElementById('fieldTitle').value.trim(),
    author:      document.getElementById('fieldAuthor').value.trim(),
    isbn:        document.getElementById('fieldIsbn').value.trim()  || null,
    genre:       document.getElementById('fieldGenre').value        || null,
    price:       parseFloat(document.getElementById('fieldPrice').value) || 0,
    year:        parseInt(document.getElementById('fieldYear').value)  || null,
    description: document.getElementById('fieldDesc').value.trim()  || null,
    coverUrl:    document.getElementById('fieldCover').value.trim() || null,
    stock:       parseInt(document.getElementById('fieldStock').value) || 0
  };

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = isEdit ? 'Saving…' : 'Adding…';

  try {
    if (isEdit) {
      await updateBook(Number(id), payload);
      showToast('Book updated successfully', 'success');
    } else {
      await createBook(payload);
      showToast('Book added successfully', 'success');
    }
    closeModal('modal');
    applyFilters();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? 'Save Changes' : 'Add Book';
  }
}

function validateForm() {
  let valid = true;

  const title = document.getElementById('fieldTitle').value.trim();
  const errTitle = document.getElementById('errTitle');
  if (!title) {
    errTitle.textContent = 'Title is required.';
    document.getElementById('fieldTitle').classList.add('input--invalid');
    valid = false;
  } else {
    errTitle.textContent = '';
    document.getElementById('fieldTitle').classList.remove('input--invalid');
  }

  const author = document.getElementById('fieldAuthor').value.trim();
  const errAuthor = document.getElementById('errAuthor');
  if (!author) {
    errAuthor.textContent = 'Author is required.';
    document.getElementById('fieldAuthor').classList.add('input--invalid');
    valid = false;
  } else {
    errAuthor.textContent = '';
    document.getElementById('fieldAuthor').classList.remove('input--invalid');
  }

  const price = document.getElementById('fieldPrice').value;
  const errPrice = document.getElementById('errPrice');
  if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
    errPrice.textContent = 'Enter a valid price (≥ 0).';
    document.getElementById('fieldPrice').classList.add('input--invalid');
    valid = false;
  } else {
    errPrice.textContent = '';
    document.getElementById('fieldPrice').classList.remove('input--invalid');
  }

  return valid;
}

/* ─── Modal: Delete confirm ──────────────────────────────────── */
function openDeleteModal(id, title) {
  pendingDeleteId = id;
  document.getElementById('deleteBookName').textContent = title;
  showModal('deleteModal');
}

async function handleDeleteConfirm() {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('deleteConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting…';
  try {
    await deleteBook(pendingDeleteId);
    showToast('Book deleted', 'success');
    closeModal('deleteModal');
    applyFilters();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
    pendingDeleteId = null;
  }
}

/* ─── Modal helpers ──────────────────────────────────────────── */
function showModal(id) {
  const el = document.getElementById(id);
  el.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
  // Only restore scroll if no other modal is open
  const anyOpen = !document.getElementById('modal').hidden || !document.getElementById('deleteModal').hidden;
  if (!anyOpen) document.body.style.overflow = '';
}

/* ─── Toast ──────────────────────────────────────────────────── */
let toastTimer = null;

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast--show${type !== 'info' ? ` toast--${type}` : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--show');
  }, 3500);
}

/* ─── SVG icons ──────────────────────────────────────────────── */
function bookSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>`;
}
function editSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
}
function trashSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>`;
}

/* ─── Utility ────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Debounce ───────────────────────────────────────────────── */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ─── Keyboard: close modal on Escape ───────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('modal').hidden)       closeModal('modal');
  else if (!document.getElementById('deleteModal').hidden) closeModal('deleteModal');
});

/* ─── Wire up events ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Add book
  document.getElementById('addBookBtn').addEventListener('click', openAddModal);

  // Form submit
  document.getElementById('bookForm').addEventListener('submit', handleFormSubmit);

  // Close main modal
  document.getElementById('modalClose').addEventListener('click', () => closeModal('modal'));
  document.getElementById('cancelBtn').addEventListener('click', () => closeModal('modal'));
  document.getElementById('modalBackdrop').addEventListener('click', () => closeModal('modal'));

  // Delete modal
  document.getElementById('deleteConfirmBtn').addEventListener('click', handleDeleteConfirm);
  document.getElementById('deleteCancelBtn').addEventListener('click', () => closeModal('deleteModal'));
  document.getElementById('deleteBackdrop').addEventListener('click', () => closeModal('deleteModal'));

  // Search + filter
  document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 250));
  document.getElementById('genreFilter').addEventListener('change', applyFilters);
  document.getElementById('sortSelect').addEventListener('change', applyFilters);

  // Inline validation on blur
  document.getElementById('fieldTitle').addEventListener('blur', () => {
    const err = document.getElementById('errTitle');
    if (!document.getElementById('fieldTitle').value.trim()) {
      err.textContent = 'Title is required.';
    } else {
      err.textContent = '';
      document.getElementById('fieldTitle').classList.remove('input--invalid');
    }
  });
  document.getElementById('fieldAuthor').addEventListener('blur', () => {
    const err = document.getElementById('errAuthor');
    if (!document.getElementById('fieldAuthor').value.trim()) {
      err.textContent = 'Author is required.';
    } else {
      err.textContent = '';
      document.getElementById('fieldAuthor').classList.remove('input--invalid');
    }
  });

  // Load data
  loadBooks();
});
