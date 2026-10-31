const { useState, useEffect, useMemo, useCallback, useRef } = React;

// ===== STORAGE =====
// Test if localStorage actually persists
const _storageAvailable = (() => {
  try {
    const t = '__storage_test__';
    localStorage.setItem(t, '1');
    const v = localStorage.getItem(t);
    localStorage.removeItem(t);
    return v === '1';
  } catch { return false; }
})();

const storage = {
  get(key) { try { const v = localStorage.getItem('dp_' + key); return v ? { value: v } : null; } catch { return null; } },
  set(key, value) {
    try {
      localStorage.setItem('dp_' + key, value);
      // Verify write succeeded
      const check = localStorage.getItem('dp_' + key);
      if (check !== value) console.warn('Storage write verification failed for:', key);
    } catch (e) { console.error('Storage write failed:', key, e); }
  },
  delete(key) { try { localStorage.removeItem('dp_' + key); } catch {} },
  list(prefix) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('dp_' + prefix)) keys.push(k.replace('dp_', ''));
      }
      return { keys };
    } catch { return { keys: [] }; }
  },
  get isAvailable() { return _storageAvailable; }
};

// ===== IndexedDB for photos =====
const photoDB = {
  _db: null,
  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('StudioTreneraPhotos', 1);
      req.onupgradeneeded = (e) => { e.target.result.createObjectStore('photos', { keyPath: 'id' }); };
      req.onsuccess = (e) => { this._db = e.target.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },
  async save(photo) { const db = await this.open(); return new Promise((r, j) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(photo); tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); }); },
  async getByClient(clientId) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction('photos', 'readonly');
      const store = tx.objectStore('photos');
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []).filter(p => p.clientId === clientId).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      req.onerror = () => resolve([]);
    });
  },
  async deletePhoto(id) { const db = await this.open(); return new Promise((r, j) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').delete(id); tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); }); },
  async getAll() { const db = await this.open(); return new Promise((r) => { const tx = db.transaction('photos', 'readonly'); const req = tx.objectStore('photos').getAll(); req.onsuccess = () => r(req.result || []); req.onerror = () => r([]); }); }
};

// ===== ICONS (SVG) =====
const I = ({ d, size = 20, style = {}, fill = 'none' }) => (
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill, stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'inline-block', verticalAlign: 'middle', ...style } },
    ...(Array.isArray(d) ? d : [d]).map((path, i) => React.createElement('path', { key: i, d: path })))
);
const UsersIcon = (p) => I({ ...p, d: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M9 7a4 4 0 100-8 4 4 0 000 8z', 'M16 3.13a4 4 0 010 7.75'] });
const CalIcon = (p) => React.createElement('svg', { width: p.size || 20, height: p.size || 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', style: p.style || {} },
  React.createElement('rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }),
  React.createElement('line', { x1: 16, y1: 2, x2: 16, y2: 6 }),
  React.createElement('line', { x1: 8, y1: 2, x2: 8, y2: 6 }),
  React.createElement('line', { x1: 3, y1: 10, x2: 21, y2: 10 })
);
const DollarIcon = (p) => I({ ...p, d: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'] });
const GridIcon = (p) => React.createElement('svg', { width: p.size || 20, height: p.size || 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', style: p.style || {} },
  React.createElement('rect', { x: 3, y: 3, width: 7, height: 9, rx: 1 }),
  React.createElement('rect', { x: 14, y: 3, width: 7, height: 5, rx: 1 }),
  React.createElement('rect', { x: 14, y: 12, width: 7, height: 9, rx: 1 }),
  React.createElement('rect', { x: 3, y: 16, width: 7, height: 5, rx: 1 })
);
const MoreIcon = (p) => React.createElement('svg', { width: p.size || 20, height: p.size || 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', style: p.style || {} },
  React.createElement('circle', { cx: 12, cy: 5, r: 1 }),
  React.createElement('circle', { cx: 12, cy: 12, r: 1 }),
  React.createElement('circle', { cx: 12, cy: 19, r: 1 })
);

// Simple icon factory
function SvgIcon({ paths, size = 20, style = {} }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style } },
    ...paths.map((el, i) => {
      if (typeof el === 'string') return React.createElement('path', { key: i, d: el });
      const { tag, ...attrs } = el;
      return React.createElement(tag || 'path', { key: i, ...attrs });
    })
  );
}

const icons = {
  users: [{ tag: 'path', d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2' }, { tag: 'circle', cx: 9, cy: 7, r: 4 }, { tag: 'path', d: 'M23 21v-2a4 4 0 00-3-3.87' }, { tag: 'path', d: 'M16 3.13a4 4 0 010 7.75' }],
  calendar: [{ tag: 'rect', x: 3, y: 4, width: 18, height: 18, rx: 2 }, { tag: 'line', x1: 16, y1: 2, x2: 16, y2: 6 }, { tag: 'line', x1: 8, y1: 2, x2: 8, y2: 6 }, { tag: 'line', x1: 3, y1: 10, x2: 21, y2: 10 }],
  dollar: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],
  grid: [{ tag: 'rect', x: 3, y: 3, width: 7, height: 9, rx: 1 }, { tag: 'rect', x: 14, y: 3, width: 7, height: 5, rx: 1 }, { tag: 'rect', x: 14, y: 12, width: 7, height: 9, rx: 1 }, { tag: 'rect', x: 3, y: 16, width: 7, height: 5, rx: 1 }],
  more: [{ tag: 'circle', cx: 12, cy: 5, r: 1, fill: 'currentColor' }, { tag: 'circle', cx: 12, cy: 12, r: 1, fill: 'currentColor' }, { tag: 'circle', cx: 12, cy: 19, r: 1, fill: 'currentColor' }],
  plus: ['M12 5v14', 'M5 12h14'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  check: ['M20 6L9 17l-5-5'],
  chevDown: ['M6 9l6 6 6-6'],
  chevRight: ['M9 18l6-6-6-6'],
  chevLeft: ['M15 18l-6-6 6-6'],
  search: [{ tag: 'circle', cx: 11, cy: 11, r: 8 }, 'M21 21l-4.35-4.35'],
  trash: ['M3 6h18', 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2'],
  edit: ['M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7', 'M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'],
  camera: ['M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z', { tag: 'circle', cx: 12, cy: 13, r: 4 }],
  image: [{ tag: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 2 }, { tag: 'circle', cx: 8.5, cy: 8.5, r: 1.5 }, 'M21 15l-5-5L5 21'],
  share: [{ tag: 'circle', cx: 18, cy: 5, r: 3 }, { tag: 'circle', cx: 6, cy: 12, r: 3 }, { tag: 'circle', cx: 18, cy: 19, r: 3 }, 'M8.59 13.51l6.83 3.98', 'M15.41 6.51l-6.82 3.98'],
  download: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  upload: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  mic: ['M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z', 'M19 10v2a7 7 0 01-14 0v-2', 'M12 19v4', 'M8 23h8'],
  clock: [{ tag: 'circle', cx: 12, cy: 12, r: 10 }, 'M12 6v6l4 2'],
  pkg: ['M16.5 9.4l-9-5.19', 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12'],
  creditcard: [{ tag: 'rect', x: 1, y: 4, width: 22, height: 16, rx: 2 }, { tag: 'line', x1: 1, y1: 10, x2: 23, y2: 10 }],
  file: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  trendUp: ['M23 6l-9.5 9.5-5-5L1 18'],
  target: [{ tag: 'circle', cx: 12, cy: 12, r: 10 }, { tag: 'circle', cx: 12, cy: 12, r: 6 }, { tag: 'circle', cx: 12, cy: 12, r: 2 }],
  barChart: ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  arrowLeft: ['M19 12H5', 'M12 19l-7-7 7-7'],
  star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  phone: ['M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z'],
  save: ['M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8'],
  settings: [{ tag: 'circle', cx: 12, cy: 12, r: 3 }, 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
  apple: [{ tag: 'circle', cx: 12, cy: 14, r: 7 }, 'M12 7c-2-3-5-3-5-3s0 3 2 5', 'M12 7c2-3 5-3 5-3s0 3-2 5'],
  book: ['M4 19.5A2.5 2.5 0 016.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'],
  chef: ['M6 13c-1.5 0-3 .5-3 2s1.5 2 3 2', 'M18 13c1.5 0 3 .5 3 2s-1.5 2-3 2', 'M6 17v2a2 2 0 002 2h8a2 2 0 002-2v-2', 'M12 3a5 5 0 00-5 5c0 2.76 2.24 5 5 5s5-2.24 5-5a5 5 0 00-5-5z', 'M15 1s-1 2-3 2-3-2-3-2'],
  info: [{ tag: 'circle', cx: 12, cy: 12, r: 10 }, 'M12 16v-4', 'M12 8h.01'],
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  link: ['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71'],
  externalLink: ['M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6', 'M15 3h6v6', 'M10 14L21 3'],
};

function Icon2({ name, size = 20, style = {} }) {
  const paths = icons[name];
  if (!paths) return null;
  return SvgIcon({ paths, size, style });
}

// ===== CONSTANTS =====
const PRELOADED_PACKAGES = [
  { id: 'pkg1', name: 'Trening personalny – pojedynczy', type: 'personal', sessions: 1, price: 120, validDays: 30 },
  { id: 'pkg2', name: 'Pakiet 8 treningów', type: 'personal', sessions: 8, price: 800, validDays: 60 },
  { id: 'pkg3', name: 'Pakiet 12 treningów', type: 'personal', sessions: 12, price: 1080, validDays: 90 },
  { id: 'pkg4', name: 'Plan dietetyczny', type: 'diet', sessions: 1, price: 200, validDays: 30 },
  { id: 'pkg5', name: 'Trening + Dieta (miesięcznie)', type: 'combo', sessions: 8, price: 950, validDays: 30 },
  { id: 'pkg6', name: 'Trening grupowy – wejście', type: 'group', sessions: 1, price: 35, validDays: 30 },
  { id: 'pkg7', name: 'Karnet grupowy 12 wejść', type: 'group', sessions: 12, price: 350, validDays: 60 },
];

const INCOME_CATEGORIES = ['Trening personalny', 'Trening grupowy', 'Plan dietetyczny', 'Konsultacja', 'Pakiet combo', 'Inne'];
const EXPENSE_CATEGORIES = ['Wynajem sali', 'Sprzęt', 'Dojazd', 'Marketing', 'Suplementy na sprzedaż', 'Szkolenia', 'Ubezpieczenie', 'Telefon/Internet', 'Inne'];

const TRAINING_STATUSES = {
  scheduled: { label: 'Zaplanowany', color: '#5a7a8a', bg: '#e8f0f4' },
  completed: { label: 'Wykonany', color: '#5a7a4a', bg: '#e8f4e8' },
  cancelled: { label: 'Odwołany', color: '#b8621b', bg: '#f4ede8' },
  noshow: { label: 'Nieobecność', color: '#c65d3e', bg: '#f4e8e4' },
};

const PL_MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const PL_DAYS_SHORT = ['Nd','Pn','Wt','Śr','Cz','Pt','So'];

const ACTIVITY_LEVELS = [
  { value: 1.2,   label: 'Siedzący tryb życia', hint: 'Biuro, brak treningów' },
  { value: 1.375, label: 'Lekko aktywny',       hint: 'Trening 1-3x/tyg' },
  { value: 1.55,  label: 'Umiarkowanie aktywny',hint: 'Trening 3-5x/tyg' },
  { value: 1.725, label: 'Bardzo aktywny',      hint: 'Trening 6-7x/tyg' },
  { value: 1.9,   label: 'Ekstremalnie aktywny',hint: 'Ciężka praca + treningi' },
];

const GOALS = [
  { value: 'reduction',   label: 'Redukcja tkanki tłuszczowej', adjust: -0.20, color: '#c65d3e' },
  { value: 'recomp',      label: 'Rekompozycja sylwetki',       adjust: -0.10, color: '#b8915a' },
  { value: 'maintenance', label: 'Utrzymanie wagi',             adjust:  0.00, color: '#8ba888' },
  { value: 'lean_mass',   label: 'Budowa masy (lean bulk)',     adjust:  0.10, color: '#5a7a8a' },
  { value: 'mass',        label: 'Budowa masy mięśniowej',      adjust:  0.15, color: '#3a5a6a' },
];

const MEAL_TYPES = ['Śniadanie', 'II śniadanie', 'Obiad', 'Podwieczorek', 'Kolacja'];
const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const DAYS_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

// ===== HELPERS =====
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const toDateStr = (d) => { const dd = d || new Date(); return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`; };
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfWeek = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
const formatMoney = (v) => typeof v === 'number' ? v.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł' : '0 zł';

// Compress image for storage
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Polish voice parser for training entries
function parseTrainingVoice(text) {
  const result = { clientName: null, date: null, time: null, type: null, notes: '' };
  const lower = (text || '').toLowerCase().trim();

  // Extract time (e.g. "o 15:00", "na 9:30", "godzina 10")
  const timeMatch = lower.match(/(?:o |na |godzina? |godz\.? ?)(\d{1,2})[:\.]?(\d{2})?/);
  if (timeMatch) {
    result.time = `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}`;
  }

  // Extract relative date
  if (/jutro/.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    result.date = toDateStr(d);
  } else if (/pojutrze/.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() + 2);
    result.date = toDateStr(d);
  } else if (/dzisiaj|dziś|dzis/.test(lower)) {
    result.date = toDateStr(new Date());
  } else {
    // Try "15 marca", "3 stycznia" etc.
    const plMonths = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
    const dateMatch = lower.match(/(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = plMonths.indexOf(dateMatch[2]);
      if (month >= 0) {
        const now = new Date();
        const year = now.getFullYear();
        result.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  // Extract training type
  if (/grupow/.test(lower)) result.type = 'group';
  else if (/diet|żywien|odżyw/.test(lower)) result.type = 'diet';
  else if (/personal|indywidual|osob/.test(lower)) result.type = 'personal';

  // Try to extract client name — look for "z {Name}", "dla {Name}", "klient {Name}"
  const nameMatch = lower.match(/(?:z |dla |klient(?:ka)? )([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/i);
  if (nameMatch) {
    result.clientName = nameMatch[1];
  }

  return result;
}

// Google Calendar URL builder
function buildGoogleCalendarUrl(training, clientName) {
  const title = encodeURIComponent(`Trening: ${clientName || 'Klient'}`);
  const date = (training.date || '').replace(/-/g, '');
  const time = (training.time || '10:00').replace(':', '');
  const start = `${date}T${time}00`;
  // Assume 1h training
  const endH = parseInt(time.slice(0, 2)) + 1;
  const end = `${date}T${String(endH).padStart(2, '0')}${time.slice(2)}00`;
  const details = encodeURIComponent(training.notes || '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}


// ===== CONFIRM DIALOG =====
function ConfirmDialog({ message, onYes, onNo }) {
  return (
    <div className="modal-overlay" onClick={onNo}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 15, margin: '0 0 20px 0', color: 'var(--text)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onNo}>Anuluj</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onYes}>Tak</button>
        </div>
      </div>
    </div>
  );
}

function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (message) => new Promise((resolve) => setState({ message, resolve }));
  const handleYes = () => { state?.resolve(true); setState(null); };
  const handleNo = () => { state?.resolve(false); setState(null); };
  const dialog = state ? <ConfirmDialog message={state.message} onYes={handleYes} onNo={handleNo} /> : null;
  return { confirm, dialog };
}

// ===== TOAST =====
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--forest)', color: '#fff', padding: '10px 20px', borderRadius: 12, fontSize: 13, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
      {message}
    </div>
  );
}


// ========================================================================
// BOTTOM TAB BAR
// ========================================================================
const TABS = [
  { id: 'clients', label: 'Klienci', icon: 'users' },
  { id: 'calendar', label: 'Kalendarz', icon: 'calendar' },
  { id: 'finances', label: 'Finanse', icon: 'dollar' },
  { id: 'dashboard', label: 'Panel', icon: 'grid' },
  { id: 'more', label: 'Więcej', icon: 'more' },
];

function BottomTabBar({ activeTab, onTab }) {
  return (
    <nav className="tab-bar">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTab(tab.id)}
        >
          <Icon2 name={tab.icon} size={22} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ========================================================================
// PAGE HEADER
// ========================================================================
function PageHeader({ title, subtitle, action, onAction, actionIcon, onBack, backLabel }) {
  return (
    <div className="page-header">
      {onBack && (
        <button className="back-btn" onClick={onBack}>
          <Icon2 name="chevLeft" size={18} />
          <span>{backLabel || 'Wróć'}</span>
        </button>
      )}
      <div style={{ flex: 1 }}>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && (
        <button className="btn btn-primary btn-round" onClick={onAction}>
          <Icon2 name={actionIcon || 'plus'} size={18} />
        </button>
      )}
    </div>
  );
}


// ========================================================================
// MORE MENU
// ========================================================================
function MoreMenu({ onNavigate }) {
  const items = [
    { id: 'billing', label: 'Rozliczenia', icon: 'creditcard', desc: 'Pakiety klientów' },
    { id: 'packages', label: 'Pakiety', icon: 'pkg', desc: 'Oferta cenowa' },
    { id: 'products', label: 'Baza produktów', icon: 'apple', desc: '250+ produktów' },
    { id: 'templates', label: 'Szablony diet', icon: 'book', desc: 'Zapisane plany' },
    { id: 'recipes', label: 'Przepisy', icon: 'chef', desc: 'Baza przepisów' },
    { id: 'photos', label: 'Galeria zdjęć', icon: 'camera', desc: 'Before/After' },
    { id: 'backup', label: 'Backup', icon: 'download', desc: 'Import/Export' },
    { id: 'about', label: 'O aplikacji', icon: 'info', desc: 'Studio Trenera MT' },
  ];

  return (
    <div className="page-content">
      <PageHeader title="Więcej" subtitle="Dodatkowe funkcje" />
      <div className="card-list">
        {items.map(item => (
          <button key={item.id} className="menu-item" onClick={() => onNavigate(item.id)}>
            <div className="menu-icon">
              <Icon2 name={item.icon} size={20} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.desc}</div>
            </div>
            <Icon2 name="chevRight" size={18} style={{ color: 'var(--muted)' }} />
          </button>
        ))}
      </div>
    </div>
  );
}


// ========================================================================
// CLIENTS VIEW
// ========================================================================
function ClientsView({ clients, onSelect, onAdd, onDelete }) {
  const [search, setSearch] = useState('');
  const { confirm, dialog } = useConfirm();

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [clients, search]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (await confirm('Usunąć klienta?')) onDelete(id);
  };

  return (
    <div className="page-content">
      <PageHeader title="Klienci" subtitle={`${clients.length} podopiecznych`} action="Dodaj" onAction={onAdd} actionIcon="plus" />

      {clients.length > 3 && (
        <div className="search-bar">
          <Icon2 name="search" size={16} style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder="Szukaj klienta..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      <div className="card-list">
        {filtered.map(c => {
          const initials = (c.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={c.id} className="client-card" onClick={() => onSelect(c.id)}>
              <div className="avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="client-name">{c.name || 'Bez nazwy'}</div>
                <div className="client-meta">
                  {c.age && `${c.age} lat`}
                  {c.goal && ` · ${GOALS.find(g => g.value === c.goal)?.label || c.goal}`}
                </div>
              </div>
              <button className="icon-btn" onClick={(e) => handleDelete(e, c.id)}>
                <Icon2 name="trash" size={16} style={{ color: 'var(--danger)' }} />
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <Icon2 name="users" size={48} style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p>{search ? 'Brak wyników' : 'Dodaj pierwszego klienta'}</p>
          </div>
        )}
      </div>
      {dialog}
    </div>
  );
}


// ========================================================================
// CLIENT FORM (Sheet modal)
// ========================================================================
function ClientFormSheet({ client, onSave, onCancel }) {
  const [name, setName] = useState(client?.name || '');
  const [age, setAge] = useState(client?.age || '');
  const [weight, setWeight] = useState(client?.weight || '');
  const [height, setHeight] = useState(client?.height || '');
  const [gender, setGender] = useState(client?.gender || 'female');
  const [activity, setActivity] = useState(client?.activity || 1.55);
  const [goal, setGoal] = useState(client?.goal || 'maintenance');
  const [phone, setPhone] = useState(client?.phone || '');
  const [notes, setNotes] = useState(client?.notes || '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: client?.id || uid(),
      name: name.trim(),
      age: parseInt(age) || null,
      weight: parseFloat(weight) || null,
      height: parseFloat(height) || null,
      gender, activity: parseFloat(activity), goal,
      phone: phone.trim(),
      notes: notes.trim(),
      createdAt: client?.createdAt || new Date().toISOString(),
      // Preserve existing diet data
      meals: client?.meals || {},
      dietDays: client?.dietDays || ['Poniedziałek'],
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet modal-full" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="btn-text" onClick={onCancel}>Anuluj</button>
          <span className="sheet-title">{client ? 'Edytuj klienta' : 'Nowy klient'}</span>
          <button className="btn-text btn-primary-text" onClick={handleSubmit}>Zapisz</button>
        </div>

        <div className="sheet-body">
          <label className="field-label">Imię i nazwisko *</label>
          <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="np. Anna Kowalska" autoFocus />

          <div className="field-row">
            <div style={{ flex: 1 }}>
              <label className="field-label">Wiek</label>
              <input className="field-input" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="30" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Waga (kg)</label>
              <input className="field-input" type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="65" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Wzrost (cm)</label>
              <input className="field-input" type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" />
            </div>
          </div>

          <label className="field-label">Płeć</label>
          <div className="segment-control">
            <button className={gender === 'female' ? 'active' : ''} onClick={() => setGender('female')}>Kobieta</button>
            <button className={gender === 'male' ? 'active' : ''} onClick={() => setGender('male')}>Mężczyzna</button>
          </div>

          <label className="field-label">Aktywność fizyczna</label>
          <select className="field-input" value={activity} onChange={e => setActivity(e.target.value)}>
            {ACTIVITY_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>

          <label className="field-label">Cel</label>
          <select className="field-input" value={goal} onChange={e => setGoal(e.target.value)}>
            {GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>

          <label className="field-label">Telefon</label>
          <input className="field-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+48 600 000 000" />

          <label className="field-label">Notatki</label>
          <textarea className="field-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dodatkowe informacje..." />
        </div>
      </div>
    </div>
  );
}


// ========================================================================
// CLIENT DETAIL
// ========================================================================
function ClientDetailView({ client, products, templates, onBack, onSave, onEdit, onSaveTemplate, trainings, onSaveTraining, onDeleteTraining, clientPackages, packages, photos, onPhotoAdd, onPhotoDelete }) {
  const [tab, setTab] = useState('diet');

  const clientTrainings = useMemo(() => (trainings || []).filter(t => t.clientId === client.id), [trainings, client.id]);
  const clientPkgs = useMemo(() => (clientPackages || []).filter(cp => cp.clientId === client.id), [clientPackages, client.id]);

  // Calculate TDEE
  const bmr = useMemo(() => {
    if (!client.weight || !client.height || !client.age) return null;
    if (client.gender === 'male') return 10 * client.weight + 6.25 * client.height - 5 * client.age + 5;
    return 10 * client.weight + 6.25 * client.height - 5 * client.age - 161;
  }, [client]);

  const tdee = bmr ? Math.round(bmr * (client.activity || 1.55)) : null;
  const goalObj = GOALS.find(g => g.value === client.goal);
  const targetKcal = tdee && goalObj ? Math.round(tdee * (1 + goalObj.adjust)) : null;

  const initials = (client.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page-content">
      <PageHeader onBack={onBack} backLabel="Klienci" title="" />

      {/* Client header card */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
        <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>{initials}</div>
        <h2 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 600 }}>{client.name}</h2>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {client.age && `${client.age} lat`}
          {client.weight && ` · ${client.weight} kg`}
          {client.height && ` · ${client.height} cm`}
        </div>
        {targetKcal && (
          <div style={{ marginTop: 8 }}>
            <span className="badge" style={{ background: goalObj?.color || 'var(--forest)', color: '#fff' }}>
              {goalObj?.label} · {targetKcal} kcal
            </span>
          </div>
        )}
        {client.phone && (
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <Icon2 name="phone" size={14} style={{ marginRight: 4 }} />
            <a href={`tel:${client.phone}`} style={{ color: 'var(--forest)' }}>{client.phone}</a>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-sm" onClick={onEdit}>
            <Icon2 name="edit" size={14} /> Edytuj
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {[
          { id: 'diet', label: 'Dieta' },
          { id: 'trainings', label: 'Treningi' },
          { id: 'photos', label: 'Zdjęcia' },
          { id: 'report', label: 'Raport' },
        ].map(t => (
          <button key={t.id} className={`detail-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'diet' && (
        <ClientDietTab client={client} products={products} templates={templates} onSave={onSave} onSaveTemplate={onSaveTemplate} targetKcal={targetKcal} />
      )}
      {tab === 'trainings' && (
        <ClientTrainingsTab client={client} trainings={clientTrainings} onSave={onSaveTraining} onDelete={onDeleteTraining} />
      )}
      {tab === 'photos' && (
        <ClientPhotosTab client={client} photos={photos || []} onAdd={onPhotoAdd} onDelete={onPhotoDelete} />
      )}
      {tab === 'report' && (
        <ClientReportTab client={client} trainings={clientTrainings} targetKcal={targetKcal} goalObj={goalObj} />
      )}
    </div>
  );
}


// ========================================================================
// CLIENT DIET TAB (simplified for mobile — preserves core diet logic)
// ========================================================================
function ClientDietTab({ client, products, templates, onSave, onSaveTemplate, targetKcal }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [showAddMeal, setShowAddMeal] = useState(null);
  const [searchProd, setSearchProd] = useState('');

  const activeDays = client.dietDays || ['Poniedziałek'];
  const currentDay = activeDays[selectedDay] || activeDays[0];
  const meals = client.meals || {};
  const dayMeals = meals[currentDay] || {};

  const totalKcal = useMemo(() => {
    let total = 0;
    MEAL_TYPES.forEach(type => {
      (dayMeals[type] || []).forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) total += (prod.kcal * item.grams / 100);
      });
    });
    return Math.round(total);
  }, [dayMeals, products]);

  const addItem = (mealType, product, grams) => {
    const newMeals = { ...meals };
    if (!newMeals[currentDay]) newMeals[currentDay] = {};
    if (!newMeals[currentDay][mealType]) newMeals[currentDay][mealType] = [];
    newMeals[currentDay][mealType] = [...newMeals[currentDay][mealType], { productId: product.id, grams }];
    onSave({ ...client, meals: newMeals });
    setShowAddMeal(null);
    setSearchProd('');
  };

  const removeItem = (mealType, idx) => {
    const newMeals = { ...meals };
    newMeals[currentDay][mealType] = newMeals[currentDay][mealType].filter((_, i) => i !== idx);
    onSave({ ...client, meals: newMeals });
  };

  const filteredProducts = useMemo(() => {
    if (!searchProd) return products.slice(0, 20);
    const q = searchProd.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20);
  }, [products, searchProd]);

  return (
    <div>
      {/* Day selector */}
      {activeDays.length > 1 && (
        <div className="day-selector">
          {activeDays.map((d, i) => (
            <button key={d} className={`day-btn ${i === selectedDay ? 'active' : ''}`} onClick={() => setSelectedDay(i)}>
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {/* Calorie summary */}
      <div className="card calorie-summary">
        <div className="cal-current">{totalKcal}</div>
        <div className="cal-label">/ {targetKcal || '?'} kcal</div>
        {targetKcal && (
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, (totalKcal / targetKcal) * 100)}%`, background: totalKcal > targetKcal ? 'var(--danger)' : 'var(--forest)' }} />
          </div>
        )}
      </div>

      {/* Meals */}
      {MEAL_TYPES.map(mealType => {
        const items = dayMeals[mealType] || [];
        const mealKcal = items.reduce((sum, item) => {
          const p = products.find(pr => pr.id === item.productId);
          return sum + (p ? p.kcal * item.grams / 100 : 0);
        }, 0);

        return (
          <div key={mealType} className="card meal-card">
            <div className="meal-header">
              <span className="meal-name">{mealType}</span>
              <span className="meal-kcal">{Math.round(mealKcal)} kcal</span>
            </div>
            {items.map((item, idx) => {
              const p = products.find(pr => pr.id === item.productId);
              return (
                <div key={idx} className="meal-item-row">
                  <span className="item-name">{p?.name || '?'}</span>
                  <span className="item-grams">{item.grams}g</span>
                  <button className="icon-btn-sm" onClick={() => removeItem(mealType, idx)}>
                    <Icon2 name="x" size={14} />
                  </button>
                </div>
              );
            })}
            <button className="add-meal-btn" onClick={() => setShowAddMeal(mealType)}>
              <Icon2 name="plus" size={16} /> Dodaj
            </button>
          </div>
        );
      })}

      {/* Add product sheet */}
      {showAddMeal && (
        <AddProductSheet
          mealType={showAddMeal}
          products={filteredProducts}
          searchProd={searchProd}
          onSearch={setSearchProd}
          onAdd={(p, g) => addItem(showAddMeal, p, g)}
          onClose={() => { setShowAddMeal(null); setSearchProd(''); }}
        />
      )}
    </div>
  );
}

function AddProductSheet({ mealType, products, searchProd, onSearch, onAdd, onClose }) {
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState('100');

  if (selected) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <button className="btn-text" onClick={() => setSelected(null)}>← Wróć</button>
            <span className="sheet-title">{selected.name}</span>
            <button className="btn-text btn-primary-text" onClick={() => onAdd(selected, parseInt(grams) || 100)}>Dodaj</button>
          </div>
          <div className="sheet-body">
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <label className="field-label">Ilość (g)</label>
              <input className="field-input" type="number" value={grams} onChange={e => setGrams(e.target.value)} style={{ textAlign: 'center', fontSize: 24, maxWidth: 150, margin: '0 auto' }} autoFocus />
            </div>
            <div className="nutrition-grid">
              <div className="nutr-item"><span className="nutr-val">{Math.round(selected.kcal * (parseInt(grams) || 100) / 100)}</span><span className="nutr-label">kcal</span></div>
              <div className="nutr-item"><span className="nutr-val">{(selected.protein * (parseInt(grams) || 100) / 100).toFixed(1)}</span><span className="nutr-label">białko</span></div>
              <div className="nutr-item"><span className="nutr-val">{(selected.carbs * (parseInt(grams) || 100) / 100).toFixed(1)}</span><span className="nutr-label">węgle</span></div>
              <div className="nutr-item"><span className="nutr-val">{(selected.fat * (parseInt(grams) || 100) / 100).toFixed(1)}</span><span className="nutr-label">tłuszcz</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet modal-full" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="btn-text" onClick={onClose}>Anuluj</button>
          <span className="sheet-title">Dodaj do: {mealType}</span>
          <span />
        </div>
        <div className="sheet-body">
          <div className="search-bar">
            <Icon2 name="search" size={16} style={{ color: 'var(--muted)' }} />
            <input type="text" placeholder="Szukaj produktu..." value={searchProd} onChange={e => onSearch(e.target.value)} autoFocus />
          </div>
          <div className="product-list">
            {products.map(p => (
              <button key={p.id} className="product-item" onClick={() => setSelected(p)}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.kcal} kcal · B:{p.protein} W:{p.carbs} T:{p.fat}</div>
                </div>
                <Icon2 name="chevRight" size={16} style={{ color: 'var(--muted)' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ========================================================================
// CLIENT TRAININGS TAB
// ========================================================================
function ClientTrainingsTab({ client, trainings, onSave, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { confirm, dialog } = useConfirm();

  const sorted = useMemo(() => [...trainings].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [trainings]);

  const handleDelete = async (id) => {
    if (await confirm('Usunąć trening?')) onDelete(id);
  };

  return (
    <div>
      <button className="btn btn-sm" style={{ marginBottom: 16 }} onClick={() => { setEditing(null); setShowForm(true); }}>
        <Icon2 name="plus" size={16} /> Nowy trening
      </button>

      {sorted.map(t => {
        const st = TRAINING_STATUSES[t.status] || TRAINING_STATUSES.scheduled;
        return (
          <div key={t.id} className="card training-card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t.date} · {t.time || '--:--'}</div>
                <span className="badge" style={{ background: st.bg, color: st.color, marginTop: 4 }}>{st.label}</span>
                {t.notes && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="icon-btn-sm" onClick={() => { setEditing(t); setShowForm(true); }}>
                  <Icon2 name="edit" size={14} />
                </button>
                <button className="icon-btn-sm" onClick={() => handleDelete(t.id)}>
                  <Icon2 name="trash" size={14} style={{ color: 'var(--danger)' }} />
                </button>
                <a href={buildGoogleCalendarUrl(t, client.name)} target="_blank" rel="noopener" className="icon-btn-sm" title="Dodaj do Google Calendar">
                  <Icon2 name="externalLink" size={14} style={{ color: 'var(--forest)' }} />
                </a>
              </div>
            </div>
          </div>
        );
      })}

      {sorted.length === 0 && (
        <div className="empty-state">
          <Icon2 name="calendar" size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p>Brak treningów</p>
        </div>
      )}

      {showForm && (
        <TrainingFormSheet
          training={editing}
          clientId={client.id}
          onSave={(t) => { onSave(t); setShowForm(false); setEditing(null); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      {dialog}
    </div>
  );
}

function TrainingFormSheet({ training, clientId, onSave, onCancel }) {
  const [date, setDate] = useState(training?.date || toDateStr());
  const [time, setTime] = useState(training?.time || '10:00');
  const [status, setStatus] = useState(training?.status || 'scheduled');
  const [notes, setNotes] = useState(training?.notes || '');
  const [voiceText, setVoiceText] = useState('');

  const handleVoiceParse = () => {
    if (!voiceText.trim()) return;
    const parsed = parseTrainingVoice(voiceText);
    if (parsed.date) setDate(parsed.date);
    if (parsed.time) setTime(parsed.time);
    if (parsed.notes) setNotes(prev => prev ? prev + ' ' + voiceText : voiceText);
  };

  const handleSubmit = () => {
    onSave({
      id: training?.id || uid(),
      clientId,
      date, time, status,
      notes: notes.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="btn-text" onClick={onCancel}>Anuluj</button>
          <span className="sheet-title">{training ? 'Edytuj trening' : 'Nowy trening'}</span>
          <button className="btn-text btn-primary-text" onClick={handleSubmit}>Zapisz</button>
        </div>
        <div className="sheet-body">
          {/* Voice input hint */}
          <div className="voice-hint">
            <Icon2 name="mic" size={16} style={{ color: 'var(--forest)' }} />
            <span>Użyj dyktowania iOS na klawiaturze, aby mówić</span>
          </div>

          <div className="field-row">
            <div style={{ flex: 1 }}>
              <label className="field-label">Data</label>
              <input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Godzina</label>
              <input className="field-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <label className="field-label">Status</label>
          <div className="status-grid">
            {Object.entries(TRAINING_STATUSES).map(([key, st]) => (
              <button key={key} className={`status-btn ${status === key ? 'active' : ''}`} style={{ '--sc': st.color, '--sb': st.bg }} onClick={() => setStatus(key)}>
                {st.label}
              </button>
            ))}
          </div>

          <label className="field-label">Notatki</label>
          <textarea className="field-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notatki do treningu..." />
        </div>
      </div>
    </div>
  );
}


// ========================================================================
// CLIENT PHOTOS TAB
// ========================================================================
function ClientPhotosTab({ client, photos, onAdd, onDelete }) {
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();
  const { confirm, dialog } = useConfirm();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const photo = {
        id: uid(),
        clientId: client.id,
        date: toDateStr(),
        data: compressed,
        label: '',
      };
      await onAdd(photo);
    } catch (err) {
      console.error('Photo error:', err);
    }
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    if (await confirm('Usunąć zdjęcie?')) onDelete(id);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
          <Icon2 name="camera" size={16} /> Zrób zdjęcie
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      <div className="photo-grid">
        {photos.map(p => (
          <div key={p.id} className="photo-thumb" onClick={() => setPreview(p)}>
            <img src={p.data} alt="" loading="lazy" />
            <div className="photo-date">{p.date}</div>
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="empty-state">
          <Icon2 name="camera" size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p>Brak zdjęć. Dodaj pierwsze zdjęcie before/after.</p>
        </div>
      )}

      {/* Full preview */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '80vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img src={preview.data} alt="" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }} />
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className="btn btn-sm btn-danger" onClick={() => { handleDelete(preview.id); setPreview(null); }}>
                <Icon2 name="trash" size={14} /> Usuń
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}


// ========================================================================
// CLIENT REPORT TAB (PDF generation + sharing)
// ========================================================================
function ClientReportTab({ client, trainings, targetKcal, goalObj }) {
  const [generating, setGenerating] = useState(false);

  const stats = useMemo(() => {
    const completed = trainings.filter(t => t.status === 'completed').length;
    const total = trainings.length;
    return { completed, total, rate: total > 0 ? Math.round(completed / total * 100) : 0 };
  }, [trainings]);

  const generateAndShare = async () => {
    setGenerating(true);
    try {
      // Build report as text (jsPDF will be loaded dynamically)
      const report = [
        `RAPORT - ${client.name}`,
        `Data: ${toDateStr()}`,
        ``,
        `--- DANE ---`,
        `Wiek: ${client.age || '-'} lat`,
        `Waga: ${client.weight || '-'} kg`,
        `Wzrost: ${client.height || '-'} cm`,
        `Cel: ${goalObj?.label || '-'}`,
        `Zapotrzebowanie: ${targetKcal || '-'} kcal`,
        ``,
        `--- TRENINGI ---`,
        `Wykonanych: ${stats.completed} / ${stats.total}`,
        `Frekwencja: ${stats.rate}%`,
      ].join('\n');

      // Try Web Share API
      if (navigator.share) {
        await navigator.share({
          title: `Raport: ${client.name}`,
          text: report,
        });
      } else {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(report);
        } catch {}
      }
    } catch (e) {
      console.error('Share error:', e);
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Podsumowanie</h3>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-val">{stats.completed}</div>
            <div className="stat-lbl">Treningów</div>
          </div>
          <div className="stat-box">
            <div className="stat-val">{stats.rate}%</div>
            <div className="stat-lbl">Frekwencja</div>
          </div>
          <div className="stat-box">
            <div className="stat-val">{targetKcal || '-'}</div>
            <div className="stat-lbl">kcal/dzień</div>
          </div>
        </div>
      </div>

      <button className="btn btn-full" onClick={generateAndShare} disabled={generating}>
        <Icon2 name="share" size={18} />
        {generating ? 'Generowanie...' : 'Udostępnij raport'}
      </button>
      <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
        WhatsApp · Messenger · SMS · E-mail
      </p>
    </div>
  );
}


// ========================================================================
// CALENDAR VIEW
// ========================================================================
function CalendarView({ clients, trainings, onSaveTraining, onDeleteTraining }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const recognitionRef = useRef(null);
  const { confirm, dialog } = useConfirm();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const speechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const getClientName = (id) => {
    const c = clients.find(cl => cl.id === id);
    return c?.name || '?';
  };

  const trainingsByDate = useMemo(() => {
    const map = {};
    trainings.forEach(t => {
      const d = t.date || '';
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [trainings]);

  const selectedTrainings = selectedDate ? (trainingsByDate[selectedDate] || []) : [];

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Web Speech API — real voice recognition
  const startListening = () => {
    if (!speechSupported) {
      setVoiceStatus('Twoja przeglądarka nie wspiera rozpoznawania mowy');
      return;
    }
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'pl-PL';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus('Słucham... mów teraz');
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setVoiceText(final || interim);
        if (final) {
          setVoiceStatus('Rozpoznano! Możesz poprawić lub dodać trening.');
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceStatus('Brak dostępu do mikrofonu — zezwól w ustawieniach');
        } else if (event.error === 'no-speech') {
          setVoiceStatus('Nie wykryto mowy — spróbuj ponownie');
        } else {
          setVoiceStatus('Błąd: ' + event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setVoiceStatus('Błąd uruchamiania mikrofonu: ' + e.message);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (recognitionRef.current) { recognitionRef.current.abort(); } };
  }, []);

  // Voice input handler — submit parsed text
  const handleVoiceSubmit = () => {
    if (!voiceText.trim()) return;
    const parsed = parseTrainingVoice(voiceText);
    let clientId = null;
    if (parsed.clientName) {
      const found = clients.find(c => (c.name || '').toLowerCase().includes(parsed.clientName.toLowerCase()));
      if (found) clientId = found.id;
    }

    if (clientId && parsed.date) {
      onSaveTraining({
        id: uid(),
        clientId,
        date: parsed.date,
        time: parsed.time || '10:00',
        status: 'scheduled',
        notes: voiceText,
      });
      setVoiceText('');
      setVoiceMode(false);
      setVoiceStatus('');
    } else {
      // Show what's missing
      const missing = [];
      if (!clientId) missing.push(parsed.clientName ? `nie znaleziono klientki "${parsed.clientName}"` : 'brak imienia klientki');
      if (!parsed.date) missing.push('brak daty');
      setVoiceStatus('Nie udało się: ' + missing.join(', ') + '. Popraw tekst lub spróbuj ponownie.');
    }
  };

  return (
    <div className="page-content">
      <PageHeader title="Kalendarz" subtitle={`${PL_MONTHS[month]} ${year}`} action="Dodaj" onAction={() => setShowForm(true)} />

      {/* Voice input toggle */}
      <button className="voice-toggle" onClick={() => { setVoiceMode(!voiceMode); if (voiceMode) { stopListening(); setVoiceText(''); setVoiceStatus(''); } }}>
        <Icon2 name="mic" size={18} style={{ color: voiceMode ? 'var(--primary)' : 'var(--muted)' }} />
        <span>Dodaj głosowo</span>
      </button>

      {voiceMode && (
        <div className="card voice-input-card">
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
            Powiedz np. "Trening z Anną jutro o 15:00"
          </p>

          {/* Microphone button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <button
              onClick={isListening ? stopListening : startListening}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                border: 'none', cursor: 'pointer',
                background: isListening ? 'var(--danger, #e53e3e)' : 'var(--primary)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isListening ? '0 0 0 6px rgba(229,62,62,0.25)' : 'none',
                animation: isListening ? 'pulse-mic 1.5s infinite' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Icon2 name="mic" size={28} />
            </button>

            {voiceStatus && (
              <p style={{ fontSize: 13, color: isListening ? 'var(--primary)' : 'var(--muted)', margin: 0, textAlign: 'center' }}>
                {voiceStatus}
              </p>
            )}
          </div>

          {/* Transcribed text — editable */}
          {voiceText && (
            <div style={{ marginTop: 12 }}>
              <textarea
                className="field-input"
                rows={2}
                value={voiceText}
                onChange={e => setVoiceText(e.target.value)}
                placeholder="Rozpoznany tekst..."
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-sm" onClick={handleVoiceSubmit}>
                  <Icon2 name="check" size={14} /> Dodaj trening
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => { setVoiceText(''); setVoiceStatus(''); }}>
                  Wyczyść
                </button>
              </div>
            </div>
          )}

          {/* Fallback for unsupported browsers */}
          {!speechSupported && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--danger, #e53e3e)', margin: '0 0 8px' }}>
                Rozpoznawanie mowy nie jest dostępne w tej przeglądarce. Wpisz tekst ręcznie:
              </p>
              <textarea
                className="field-input"
                rows={2}
                value={voiceText}
                onChange={e => setVoiceText(e.target.value)}
                placeholder="Wpisz np. Trening z Anną jutro o 15:00"
              />
              <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={handleVoiceSubmit} disabled={!voiceText.trim()}>
                <Icon2 name="check" size={14} /> Dodaj trening
              </button>
            </div>
          )}
        </div>
      )}

      {/* Month navigator */}
      <div className="month-nav">
        <button className="icon-btn" onClick={prevMonth}><Icon2 name="chevLeft" size={20} /></button>
        <span className="month-label">{PL_MONTHS[month]} {year}</span>
        <button className="icon-btn" onClick={nextMonth}><Icon2 name="chevRight" size={20} /></button>
      </div>

      {/* Calendar grid */}
      <div className="cal-grid">
        {PL_DAYS_SHORT.map(d => <div key={d} className="cal-header">{d}</div>)}
        {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} className="cal-empty" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTrainings = trainingsByDate[dateStr] || [];
          const isToday = dateStr === toDateStr();
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={day}
              className={`cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayTrainings.length ? 'has-events' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
            >
              <span>{day}</span>
              {dayTrainings.length > 0 && <div className="cal-dots">{dayTrainings.slice(0, 3).map((t, j) => <span key={j} className="cal-dot" style={{ background: (TRAINING_STATUSES[t.status] || {}).color || 'var(--forest)' }} />)}</div>}
            </button>
          );
        })}
      </div>

      {/* Selected date trainings */}
      {selectedDate && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {selectedDate}
            <button className="btn btn-sm" style={{ marginLeft: 12 }} onClick={() => setShowForm(true)}>
              <Icon2 name="plus" size={14} />
            </button>
          </h3>
          {selectedTrainings.length > 0 ? selectedTrainings.map(t => {
            const st = TRAINING_STATUSES[t.status] || TRAINING_STATUSES.scheduled;
            return (
              <div key={t.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{(getClientName(t.clientId) || '').split(' ')[0]}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.time || '--:--'} · <span style={{ color: st.color }}>{st.label}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={buildGoogleCalendarUrl(t, getClientName(t.clientId))} target="_blank" rel="noopener" className="icon-btn-sm">
                      <Icon2 name="externalLink" size={14} />
                    </a>
                    <button className="icon-btn-sm" onClick={async () => { if (await confirm('Usunąć?')) onDeleteTraining(t.id); }}>
                      <Icon2 name="trash" size={14} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : <p style={{ fontSize: 13, color: 'var(--muted)' }}>Brak treningów w tym dniu</p>}
        </div>
      )}

      {/* Add training form */}
      {showForm && (
        <CalendarTrainingForm
          clients={clients}
          defaultDate={selectedDate || toDateStr()}
          onSave={(t) => { onSaveTraining(t); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {dialog}
    </div>
  );
}

function CalendarTrainingForm({ clients, defaultDate, onSave, onCancel }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [status, setStatus] = useState('scheduled');
  const [notes, setNotes] = useState('');

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="btn-text" onClick={onCancel}>Anuluj</button>
          <span className="sheet-title">Nowy trening</span>
          <button className="btn-text btn-primary-text" onClick={() => {
            if (!clientId) return;
            onSave({ id: uid(), clientId, date, time, status, notes: notes.trim() });
          }}>Zapisz</button>
        </div>
        <div className="sheet-body">
          <label className="field-label">Klient</label>
          <select className="field-input" value={clientId} onChange={e => setClientId(e.target.value)}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="field-row">
            <div style={{ flex: 1 }}>
              <label className="field-label">Data</label>
              <input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Godzina</label>
              <input className="field-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <label className="field-label">Status</label>
          <div className="status-grid">
            {Object.entries(TRAINING_STATUSES).map(([key, st]) => (
              <button key={key} className={`status-btn ${status === key ? 'active' : ''}`} style={{ '--sc': st.color, '--sb': st.bg }} onClick={() => setStatus(key)}>
                {st.label}
              </button>
            ))}
          </div>

          <label className="field-label">Notatki</label>
          <textarea className="field-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
    </div>
  );
}


// ========================================================================
// FINANCES VIEW
// ========================================================================
function FinancesView({ finances, onSaveFinance, onDeleteFinance, clients }) {
  const [tab, setTab] = useState('income');
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const { confirm, dialog } = useConfirm();

  const filtered = useMemo(() => {
    return finances
      .filter(f => f.type === tab && (f.date || '').startsWith(month))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [finances, tab, month]);

  const total = filtered.reduce((sum, f) => sum + (f.amount || 0), 0);

  const income = useMemo(() => finances.filter(f => f.type === 'income' && (f.date || '').startsWith(month)).reduce((s, f) => s + (f.amount || 0), 0), [finances, month]);
  const expense = useMemo(() => finances.filter(f => f.type === 'expense' && (f.date || '').startsWith(month)).reduce((s, f) => s + (f.amount || 0), 0), [finances, month]);

  return (
    <div className="page-content">
      <PageHeader title="Finanse" subtitle={`Bilans: ${formatMoney(income - expense)}`} action="Dodaj" onAction={() => setShowForm(true)} />

      {/* Month selector */}
      <input className="field-input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ marginBottom: 16 }} />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Przychody</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--success)' }}>{formatMoney(income)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wydatki</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--danger)' }}>{formatMoney(expense)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs" style={{ marginBottom: 12 }}>
        <button className={`detail-tab ${tab === 'income' ? 'active' : ''}`} onClick={() => setTab('income')}>Przychody</button>
        <button className={`detail-tab ${tab === 'expense' ? 'active' : ''}`} onClick={() => setTab('expense')}>Wydatki</button>
      </div>

      {/* List */}
      {filtered.map(f => (
        <div key={f.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{f.description || f.category}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.date} · {f.category}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: f.type === 'income' ? 'var(--success)' : 'var(--danger)', whiteSpace: 'nowrap' }}>
                {f.type === 'income' ? '+' : '-'}{formatMoney(f.amount)}
              </span>
              <button className="icon-btn-sm" onClick={async () => { if (await confirm('Usunąć?')) onDeleteFinance(f.id); }}>
                <Icon2 name="trash" size={14} style={{ color: 'var(--danger)' }} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="empty-state">
          <Icon2 name="dollar" size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p>Brak {tab === 'income' ? 'przychodów' : 'wydatków'}</p>
        </div>
      )}

      {showForm && (
        <FinanceFormSheet
          type={tab}
          onSave={(f) => { onSaveFinance(f); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {dialog}
    </div>
  );
}

function FinanceFormSheet({ type, onSave, onCancel }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState((type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0]);
  const [date, setDate] = useState(toDateStr());
  const [description, setDescription] = useState('');

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="btn-text" onClick={onCancel}>Anuluj</button>
          <span className="sheet-title">{type === 'income' ? 'Nowy przychód' : 'Nowy wydatek'}</span>
          <button className="btn-text btn-primary-text" onClick={() => {
            if (!amount) return;
            onSave({ id: uid(), type, amount: parseFloat(amount), category, date, description: description.trim() });
          }}>Zapisz</button>
        </div>
        <div className="sheet-body">
          <label className="field-label">Kwota (zł)</label>
          <input className="field-input" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus style={{ fontSize: 24, textAlign: 'center' }} />

          <label className="field-label">Kategoria</label>
          <select className="field-input" value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="field-label">Data</label>
          <input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} />

          <label className="field-label">Opis</label>
          <input className="field-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcjonalny opis" />
        </div>
      </div>
    </div>
  );
}


// ========================================================================
// DASHBOARD VIEW
// ========================================================================
function DashboardView({ clients, trainings, finances, clientPackages }) {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const activeClients = clients.length;
  const totalThisMonth = trainings.filter(t => (t.date||'').startsWith(currentMonthStr)).length;
  const completedThisMonth = trainings.filter(t => (t.date||'').startsWith(currentMonthStr) && t.status === 'completed').length;
  const monthRevenue = finances.filter(f => f.type === 'income' && (f.date||'').startsWith(currentMonthStr)).reduce((s, f) => s + (f.amount || 0), 0);
  const monthExpenses = finances.filter(f => f.type === 'expense' && (f.date||'').startsWith(currentMonthStr)).reduce((s, f) => s + (f.amount || 0), 0);
  const completionRate = totalThisMonth > 0 ? Math.round(completedThisMonth / totalThisMonth * 100) : 0;

  // Revenue chart data — last 6 months
  const revenueChart = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ms = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const rev = finances.filter(f => f.type === 'income' && (f.date||'').startsWith(ms)).reduce((s, f) => s + (f.amount || 0), 0);
      months.push({ label: PL_MONTHS[d.getMonth()].slice(0, 3), value: rev });
    }
    return months;
  }, [finances]);

  const maxRev = Math.max(...revenueChart.map(m => m.value), 1);

  // Upcoming trainings
  const todayStr = toDateStr();
  const upcoming = useMemo(() => {
    return trainings
      .filter(t => (t.date||'') >= todayStr && t.status === 'scheduled')
      .sort((a, b) => ((a.date||'') + (a.time||'')).localeCompare((b.date||'') + (b.time||'')))
      .slice(0, 5);
  }, [trainings, todayStr]);

  const getClientName = (id) => (clients.find(c => c.id === id)?.name || '?');

  return (
    <div className="page-content">
      <PageHeader title="Panel" subtitle={PL_MONTHS[now.getMonth()] + ' ' + now.getFullYear()} />

      {/* KPI cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-val" style={{ color: 'var(--forest)' }}>{activeClients}</div>
          <div className="kpi-label">Klienci</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val" style={{ color: 'var(--primary)' }}>{totalThisMonth}</div>
          <div className="kpi-label">Treningi</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val" style={{ color: 'var(--success)' }}>{formatMoney(monthRevenue)}</div>
          <div className="kpi-label">Przychód</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val" style={{ color: completionRate >= 70 ? 'var(--success)' : 'var(--warning)' }}>{completionRate}%</div>
          <div className="kpi-label">Frekwencja</div>
        </div>
      </div>

      {/* Revenue mini chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Przychody — 6 miesięcy</h3>
        <div className="mini-chart">
          {revenueChart.map((m, i) => (
            <div key={i} className="chart-col">
              <div className="chart-bar-wrap">
                <div className="chart-bar" style={{ height: `${maxRev > 0 ? (m.value / maxRev) * 100 : 0}%` }} />
              </div>
              <div className="chart-label">{m.label}</div>
              {m.value > 0 && <div className="chart-val">{Math.round(m.value / 1000)}k</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Bilans */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Bilans miesiąca</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span>Przychody:</span>
          <span style={{ color: 'var(--success)', fontWeight: 500 }}>+{formatMoney(monthRevenue)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
          <span>Wydatki:</span>
          <span style={{ color: 'var(--danger)', fontWeight: 500 }}>-{formatMoney(monthExpenses)}</span>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
          <span>Zysk:</span>
          <span style={{ color: monthRevenue - monthExpenses >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(monthRevenue - monthExpenses)}</span>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Najbliższe treningi</h3>
          {upcoming.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{(getClientName(t.clientId) || '').split(' ')[0]}</span>
              <span style={{ color: 'var(--muted)' }}>{t.date} {t.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ========================================================================
// BILLING VIEW
// ========================================================================
function BillingView({ clients, packages, clientPackages, onSaveClientPackage, onDeleteClientPackage, trainings, onBack }) {
  const [showForm, setShowForm] = useState(false);
  const { confirm, dialog } = useConfirm();

  const getClientName = (id) => (clients.find(c => c.id === id)?.name || '?');
  const getPackageName = (id) => (packages.find(p => p.id === id)?.name || '?');

  const sorted = useMemo(() => [...clientPackages].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')), [clientPackages]);

  const getUsedSessions = (cp) => {
    return trainings.filter(t => t.clientId === cp.clientId && t.status === 'completed' && (t.date || '') >= (cp.startDate || '') && (t.date || '') <= (cp.endDate || '9999')).length;
  };

  return (
    <div className="page-content">
      <PageHeader title="Rozliczenia" onBack={onBack} backLabel="Więcej" action="Dodaj" onAction={() => setShowForm(true)} />

      {sorted.map(cp => {
        const pkg = packages.find(p => p.id === cp.packageId);
        const used = getUsedSessions(cp);
        const total = pkg?.sessions || 1;
        const pct = Math.min(100, (used / total) * 100);

        return (
          <div key={cp.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{getClientName(cp.clientId)}</div>
              <button className="icon-btn-sm" onClick={async () => { if (await confirm('Usunąć pakiet klienta?')) onDeleteClientPackage(cp.id); }}>
                <Icon2 name="trash" size={14} style={{ color: 'var(--danger)' }} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{getPackageName(cp.packageId)}</div>
            <div className="progress-bar" style={{ marginBottom: 4 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--danger)' : 'var(--forest)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
              <span>{used}/{total} sesji</span>
              <span>{cp.startDate} — {cp.endDate || '?'}</span>
            </div>
            {cp.paid && <span className="badge" style={{ marginTop: 6, background: 'var(--success)', color: '#fff', fontSize: 10 }}>Opłacony</span>}
          </div>
        );
      })}

      {sorted.length === 0 && <div className="empty-state"><p>Brak pakietów klientów</p></div>}

      {showForm && (
        <BillingFormSheet clients={clients} packages={packages} onSave={(cp) => { onSaveClientPackage(cp); setShowForm(false); }} onCancel={() => setShowForm(false)} />
      )}
      {dialog}
    </div>
  );
}

function BillingFormSheet({ clients, packages, onSave, onCancel }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [packageId, setPackageId] = useState(packages[0]?.id || '');
  const [startDate, setStartDate] = useState(toDateStr());
  const [paid, setPaid] = useState(false);

  const pkg = packages.find(p => p.id === packageId);
  const endDate = useMemo(() => {
    if (!pkg || !startDate) return '';
    const d = new Date(startDate);
    d.setDate(d.getDate() + (pkg.validDays || 30));
    return toDateStr(d);
  }, [pkg, startDate]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="btn-text" onClick={onCancel}>Anuluj</button>
          <span className="sheet-title">Nowy pakiet klienta</span>
          <button className="btn-text btn-primary-text" onClick={() => {
            if (!clientId || !packageId) return;
            onSave({ id: uid(), clientId, packageId, startDate, endDate, paid, usedSessions: 0 });
          }}>Zapisz</button>
        </div>
        <div className="sheet-body">
          <label className="field-label">Klient</label>
          <select className="field-input" value={clientId} onChange={e => setClientId(e.target.value)}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label className="field-label">Pakiet</label>
          <select className="field-input" value={packageId} onChange={e => setPackageId(e.target.value)}>
            {packages.map(p => <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.price)}</option>)}
          </select>

          <label className="field-label">Data rozpoczęcia</label>
          <input className="field-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />

          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Ważny do: {endDate}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} />
            Opłacony
          </label>
        </div>
      </div>
    </div>
  );
}


// ========================================================================
// PACKAGES VIEW
// ========================================================================
function PackagesView({ packages, onSavePackage, onDeletePackage, onBack }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { confirm, dialog } = useConfirm();

  return (
    <div className="page-content">
      <PageHeader title="Pakiety" onBack={onBack} backLabel="Więcej" action="Dodaj" onAction={() => { setEditing(null); setShowForm(true); }} />

      {packages.map(pkg => (
        <div key={pkg.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{pkg.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {pkg.sessions} sesji · {pkg.validDays} dni · {formatMoney(pkg.price)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn-sm" onClick={() => { setEditing(pkg); setShowForm(true); }}>
                <Icon2 name="edit" size={14} />
              </button>
              <button className="icon-btn-sm" onClick={async () => { if (await confirm('Usunąć pakiet?')) onDeletePackage(pkg.id); }}>
                <Icon2 name="trash" size={14} style={{ color: 'var(--danger)' }} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <PackageFormSheet pkg={editing} onSave={(p) => { onSavePackage(p); setShowForm(false); setEditing(null); }} onCancel={() => { setShowForm(false); setEditing(null); }} />
      )}
      {dialog}
    </div>
  );
}

function PackageFormSheet({ pkg, onSave, onCancel }) {
  const [name, setName] = useState(pkg?.name || '');
  const [sessions, setSessions] = useState(pkg?.sessions || 1);
  const [price, setPrice] = useState(pkg?.price || 0);
  const [validDays, setValidDays] = useState(pkg?.validDays || 30);
  const [type, setType] = useState(pkg?.type || 'personal');

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="btn-text" onClick={onCancel}>Anuluj</button>
          <span className="sheet-title">{pkg ? 'Edytuj pakiet' : 'Nowy pakiet'}</span>
          <button className="btn-text btn-primary-text" onClick={() => {
            if (!name.trim()) return;
            onSave({ id: pkg?.id || uid(), name: name.trim(), sessions: parseInt(sessions), price: parseFloat(price), validDays: parseInt(validDays), type });
          }}>Zapisz</button>
        </div>
        <div className="sheet-body">
          <label className="field-label">Nazwa</label>
          <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nazwa pakietu" autoFocus />

          <div className="field-row">
            <div style={{ flex: 1 }}>
              <label className="field-label">Sesje</label>
              <input className="field-input" type="number" value={sessions} onChange={e => setSessions(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Cena (zł)</label>
              <input className="field-input" type="number" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Dni ważności</label>
              <input className="field-input" type="number" value={validDays} onChange={e => setValidDays(e.target.value)} />
            </div>
          </div>

          <label className="field-label">Typ</label>
          <select className="field-input" value={type} onChange={e => setType(e.target.value)}>
            <option value="personal">Personalny</option>
            <option value="group">Grupowy</option>
            <option value="diet">Dietetyczny</option>
            <option value="combo">Combo</option>
          </select>
        </div>
      </div>
    </div>
  );
}


// ========================================================================
// BACKUP VIEW
// ========================================================================
function BackupView({ clients, products, templates, trainings, finances, clientPackages, packages, onImport, onBack }) {
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  const exportData = () => {
    const data = { clients, products, templates, trainings, finances, clientPackages, packages, exportDate: new Date().toISOString(), version: 2 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio-trenera-backup-${toDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        onImport(data);
        setImportResult('Dane zaimportowane pomyślnie!');
      } catch {
        setImportResult('Błąd importu — nieprawidłowy plik.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="page-content">
      <PageHeader title="Backup" onBack={onBack} backLabel="Więcej" />

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Eksport danych</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
          Pobierz plik JSON ze wszystkimi danymi: klienci, diety, treningi, finanse, pakiety.
        </p>
        <button className="btn btn-full" onClick={exportData}>
          <Icon2 name="download" size={18} /> Pobierz backup
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Import danych</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
          Zaimportuj dane z pliku backupu. Istniejące dane zostaną uzupełnione.
        </p>
        <button className="btn btn-full btn-ghost" onClick={() => fileRef.current?.click()}>
          <Icon2 name="upload" size={18} /> Wybierz plik
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        {importResult && <p style={{ fontSize: 13, color: 'var(--forest)', marginTop: 8 }}>{importResult}</p>}
      </div>

      <div className="card" style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
        <strong>Statystyki:</strong>
        <br />Klienci: {clients.length} · Treningi: {trainings.length} · Finanse: {finances.length}
        <br />Pakiety: {packages.length} · Szablony: {templates.length} · Produkty: {products.length}
      </div>
    </div>
  );
}


// ========================================================================
// ABOUT VIEW
// ========================================================================
function AboutView({ onBack }) {
  return (
    <div className="page-content">
      <PageHeader title="O aplikacji" onBack={onBack} backLabel="Więcej" />
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏋️‍♀️</div>
        <h2 className="app-title" style={{ margin: '0 0 4px' }}>Studio Trenera MT</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
          Małgorzata Truszkowska · Łomża
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 300, margin: '0 auto', color: 'var(--text-secondary)' }}>
          Kompletne narzędzie do zarządzania treningami personalnymi, dietami, finansami i klientami.
        </p>
        <div style={{ marginTop: 24, fontSize: 11, color: 'var(--muted)' }}>
          PWA v2.0 · Zoptymalizowana pod iPhone
        </div>
      </div>
    </div>
  );
}


// ========================================================================
// PRODUCTS VIEW (simplified)
// ========================================================================
function ProductsView({ products, onSave, onBack }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== 'all') list = list.filter(p => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list.slice(0, 50);
  }, [products, search, category]);

  return (
    <div className="page-content">
      <PageHeader title="Baza produktów" subtitle={`${products.length} produktów`} onBack={onBack} backLabel="Więcej" />

      <div className="search-bar">
        <Icon2 name="search" size={16} style={{ color: 'var(--muted)' }} />
        <input type="text" placeholder="Szukaj produktu..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="category-scroll">
        {categories.map(c => (
          <button key={c} className={`cat-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c === 'all' ? 'Wszystkie' : c}
          </button>
        ))}
      </div>

      <div className="product-list">
        {filtered.map(p => (
          <div key={p.id} className="product-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.category}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {p.kcal}kcal · B:{p.protein} W:{p.carbs} T:{p.fat}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ========================================================================
// TEMPLATES VIEW (simplified)
// ========================================================================
function TemplatesView({ templates, onDelete, products, onBack }) {
  const { confirm, dialog } = useConfirm();

  return (
    <div className="page-content">
      <PageHeader title="Szablony diet" subtitle={`${templates.length} szablonów`} onBack={onBack} backLabel="Więcej" />

      {templates.map(tpl => (
        <div key={tpl.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{tpl.name || 'Szablon'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString('pl-PL') : ''}</div>
            </div>
            <button className="icon-btn-sm" onClick={async () => { if (await confirm('Usunąć szablon?')) onDelete(tpl.id); }}>
              <Icon2 name="trash" size={14} style={{ color: 'var(--danger)' }} />
            </button>
          </div>
        </div>
      ))}

      {templates.length === 0 && <div className="empty-state"><p>Brak szablonów diet</p></div>}
      {dialog}
    </div>
  );
}


// ========================================================================
// RECIPES VIEW (simplified)
// ========================================================================
function RecipesView({ recipes, products, onBack }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="page-content">
      <PageHeader title="Przepisy" subtitle={`${(recipes || []).length} przepisów`} onBack={onBack} backLabel="Więcej" />

      {(recipes || []).map((r, i) => (
        <div key={i} className="card" style={{ marginBottom: 8 }}>
          <button className="recipe-header" onClick={() => setExpanded(expanded === i ? null : i)}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{r.name}</span>
            <Icon2 name={expanded === i ? 'chevDown' : 'chevRight'} size={16} style={{ color: 'var(--muted)' }} />
          </button>
          {expanded === i && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              {r.ingredients && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Składniki:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                    {r.ingredients.map((ing, j) => {
                      const prod = products.find(p => p.id === ing.productId);
                      return <li key={j}>{prod?.name || '?'} — {ing.grams}g</li>;
                    })}
                  </ul>
                </div>
              )}
              {r.instructions && <div><strong>Przygotowanie:</strong><br />{r.instructions}</div>}
            </div>
          )}
        </div>
      ))}

      {(recipes || []).length === 0 && <div className="empty-state"><p>Brak przepisów</p></div>}
    </div>
  );
}


// ========================================================================
// PHOTOS GALLERY VIEW
// ========================================================================
function PhotosGalleryView({ clients, onBack }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    photoDB.getAll().then(p => { setPhotos(p); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    photos.forEach(p => {
      const client = clients.find(c => c.id === p.clientId);
      const name = client?.name || 'Nieznany';
      if (!map[name]) map[name] = [];
      map[name].push(p);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [photos, clients]);

  if (loading) return <div className="page-content"><p style={{ textAlign: 'center', color: 'var(--muted)' }}>Ładowanie...</p></div>;

  return (
    <div className="page-content">
      <PageHeader title="Galeria zdjęć" subtitle={`${photos.length} zdjęć`} onBack={onBack} backLabel="Więcej" />

      {grouped.map(([name, pics]) => (
        <div key={name} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>{name}</h3>
          <div className="photo-grid">
            {pics.map(p => (
              <div key={p.id} className="photo-thumb">
                <img src={p.data} alt="" loading="lazy" />
                <div className="photo-date">{p.date}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {photos.length === 0 && <div className="empty-state"><p>Brak zdjęć. Dodaj zdjęcia z poziomu profilu klienta.</p></div>}
    </div>
  );
}


// ========================================================================
// MAIN APP
// ========================================================================
function StudioTreneraApp() {
  const [view, setView] = useState('clients');
  const [subView, setSubView] = useState(null);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [finances, setFinances] = useState([]);
  const [clientPackages, setClientPackages] = useState([]);
  const [packages, setPackages] = useState(PRELOADED_PACKAGES);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [clientPhotos, setClientPhotos] = useState({});

  // PRELOADED PRODUCTS & RECIPES from original app
  const PRELOADED_PRODUCTS = useMemo(() => {
    // Load from storage or use defaults
    try {
      const pr = storage.get('products:all');
      if (pr?.value) return JSON.parse(pr.value);
    } catch {}
    return [];
  }, []);

  // Load data
  useEffect(() => {
    try {
      // Clients
      const clientList = storage.list('client:');
      const loadedClients = [];
      if (clientList?.keys) {
        for (const key of clientList.keys) {
          try { const r = storage.get(key); if (r?.value) loadedClients.push(JSON.parse(r.value)); } catch {}
        }
      }
      setClients(loadedClients);

      // Products
      try {
        const pr = storage.get('products:all');
        if (pr?.value) setProducts(JSON.parse(pr.value));
        else {
          // Products will be loaded from the original data set
          setProducts([]);
        }
      } catch {}

      // Templates
      try {
        const tplList = storage.list('template:');
        const tpls = [];
        if (tplList?.keys) { for (const key of tplList.keys) { try { const r = storage.get(key); if (r?.value) tpls.push(JSON.parse(r.value)); } catch {} } }
        setTemplates(tpls.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      } catch {}

      // Trainings
      try {
        const trList = storage.list('training:');
        const trs = [];
        if (trList?.keys) { for (const key of trList.keys) { try { const r = storage.get(key); if (r?.value) trs.push(JSON.parse(r.value)); } catch {} } }
        setTrainings(trs);
      } catch {}

      // Finances
      try {
        const fnList = storage.list('finance:');
        const fns = [];
        if (fnList?.keys) { for (const key of fnList.keys) { try { const r = storage.get(key); if (r?.value) fns.push(JSON.parse(r.value)); } catch {} } }
        setFinances(fns);
      } catch {}

      // Client packages
      try {
        const cpList = storage.list('cpkg:');
        const cps = [];
        if (cpList?.keys) { for (const key of cpList.keys) { try { const r = storage.get(key); if (r?.value) cps.push(JSON.parse(r.value)); } catch {} } }
        setClientPackages(cps);
      } catch {}

      // Packages
      try {
        const pkgR = storage.get('packages:all');
        if (pkgR?.value) setPackages(JSON.parse(pkgR.value));
        else storage.set('packages:all', JSON.stringify(PRELOADED_PACKAGES));
      } catch { storage.set('packages:all', JSON.stringify(PRELOADED_PACKAGES)); }

    } catch (e) { console.error('Load error:', e); }
    setLoading(false);
  }, []);

  // Load photos for selected client
  useEffect(() => {
    if (selectedClientId) {
      photoDB.getByClient(selectedClientId).then(photos => {
        setClientPhotos(prev => ({ ...prev, [selectedClientId]: photos }));
      });
    }
  }, [selectedClientId]);

  // CRUD
  const saveClient = (client) => {
    try {
      storage.set(`client:${client.id}`, JSON.stringify(client));
      setClients(prev => { const idx = prev.findIndex(c => c.id === client.id); if (idx >= 0) { const n = [...prev]; n[idx] = client; return n; } return [...prev, client]; });
    } catch (e) { console.error(e); }
  };
  const deleteClient = (id) => {
    try { storage.delete(`client:${id}`); setClients(prev => prev.filter(c => c.id !== id)); if (selectedClientId === id) setSelectedClientId(null); } catch (e) { console.error(e); }
  };
  const saveProducts = (p) => { setProducts(p); try { storage.set('products:all', JSON.stringify(p)); } catch {} };
  const saveTemplate = (tpl) => { try { storage.set(`template:${tpl.id}`, JSON.stringify(tpl)); setTemplates(prev => [tpl, ...prev.filter(t => t.id !== tpl.id)]); } catch {} };
  const deleteTemplate = (id) => { try { storage.delete(`template:${id}`); setTemplates(prev => prev.filter(t => t.id !== id)); } catch {} };
  const saveTraining = (t) => { try { storage.set('training:' + t.id, JSON.stringify(t)); setTrainings(prev => { const idx = prev.findIndex(x => x.id === t.id); if (idx >= 0) { const n = [...prev]; n[idx] = t; return n; } return [...prev, t]; }); } catch {} };
  const deleteTraining = (id) => { try { storage.delete('training:' + id); setTrainings(prev => prev.filter(t => t.id !== id)); } catch {} };
  const saveFinance = (f) => { try { storage.set('finance:' + f.id, JSON.stringify(f)); setFinances(prev => { const idx = prev.findIndex(x => x.id === f.id); if (idx >= 0) { const n = [...prev]; n[idx] = f; return n; } return [...prev, f]; }); } catch {} };
  const deleteFinance = (id) => { try { storage.delete('finance:' + id); setFinances(prev => prev.filter(f => f.id !== id)); } catch {} };
  const saveClientPackage = (cp) => { try { storage.set('cpkg:' + cp.id, JSON.stringify(cp)); setClientPackages(prev => { const idx = prev.findIndex(x => x.id === cp.id); if (idx >= 0) { const n = [...prev]; n[idx] = cp; return n; } return [...prev, cp]; }); } catch {} };
  const deleteClientPackage = (id) => { try { storage.delete('cpkg:' + id); setClientPackages(prev => prev.filter(cp => cp.id !== id)); } catch {} };
  const savePackage = (pkg) => { try { setPackages(prev => { const idx = prev.findIndex(p => p.id === pkg.id); const next = idx >= 0 ? [...prev.slice(0, idx), pkg, ...prev.slice(idx + 1)] : [...prev, pkg]; storage.set('packages:all', JSON.stringify(next)); return next; }); } catch {} };
  const deletePackage = (id) => { try { setPackages(prev => { const next = prev.filter(p => p.id !== id); storage.set('packages:all', JSON.stringify(next)); return next; }); } catch {} };

  const handlePhotoAdd = async (photo) => {
    await photoDB.save(photo);
    setClientPhotos(prev => ({ ...prev, [photo.clientId]: [photo, ...(prev[photo.clientId] || [])] }));
    setToast('Zdjęcie dodane');
  };
  const handlePhotoDelete = async (id) => {
    await photoDB.deletePhoto(id);
    // Refresh
    if (selectedClientId) {
      const photos = await photoDB.getByClient(selectedClientId);
      setClientPhotos(prev => ({ ...prev, [selectedClientId]: photos }));
    }
  };

  const importData = (data) => {
    try {
      if (data.clients) { for (const c of data.clients) { storage.set(`client:${c.id}`, JSON.stringify(c)); } setClients(prev => { const map = {}; [...prev, ...data.clients].forEach(c => { map[c.id] = c; }); return Object.values(map); }); }
      if (data.products) { storage.set('products:all', JSON.stringify(data.products)); setProducts(data.products); }
      if (data.templates) { for (const t of data.templates) { storage.set(`template:${t.id}`, JSON.stringify(t)); } setTemplates(prev => { const map = {}; [...prev, ...data.templates].forEach(t => { map[t.id] = t; }); return Object.values(map).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); }); }
      if (data.trainings) { for (const t of data.trainings) { storage.set('training:' + t.id, JSON.stringify(t)); } setTrainings(prev => { const map = {}; [...prev, ...data.trainings].forEach(t => { map[t.id] = t; }); return Object.values(map); }); }
      if (data.finances) { for (const f of data.finances) { storage.set('finance:' + f.id, JSON.stringify(f)); } setFinances(prev => { const map = {}; [...prev, ...data.finances].forEach(f => { map[f.id] = f; }); return Object.values(map); }); }
      if (data.clientPackages) { for (const cp of data.clientPackages) { storage.set('cpkg:' + cp.id, JSON.stringify(cp)); } setClientPackages(prev => { const map = {}; [...prev, ...data.clientPackages].forEach(cp => { map[cp.id] = cp; }); return Object.values(map); }); }
      if (data.packages) { storage.set('packages:all', JSON.stringify(data.packages)); setPackages(data.packages); }
      setToast('Dane zaimportowane!');
    } catch (e) { console.error('Import error:', e); }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Determine active tab for bottom bar
  const activeTab = subView ? 'more' : view;

  const handleTab = (tab) => {
    setSubView(null);
    setSelectedClientId(null);
    setView(tab);
  };

  const handleSubNav = (sub) => {
    setSubView(sub);
    setSelectedClientId(null);
  };

  if (loading) {
    return (
      <div className="app-root">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ fontSize: 16, color: 'var(--muted)', fontStyle: 'italic' }}>Wczytywanie…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      {/* Storage warning */}
      {!storage.isAvailable && (
        <div style={{
          background: '#c65d3e', color: '#fff', padding: '10px 16px',
          fontSize: 13, textAlign: 'center', position: 'sticky', top: 0, zIndex: 1000
        }}>
          ⚠️ Tryb prywatny — dane nie będą zapisane po zamknięciu przeglądarki.
          Wyłącz tryb prywatny lub dodaj aplikację na ekran główny.
        </div>
      )}
      {/* Main content area */}
      <div className="main-content">
        {selectedClient ? (
          <ClientDetailView
            client={selectedClient}
            products={products}
            templates={templates}
            onBack={() => setSelectedClientId(null)}
            onSave={saveClient}
            onEdit={() => setEditingClient(selectedClient)}
            onSaveTemplate={saveTemplate}
            trainings={trainings}
            onSaveTraining={saveTraining}
            onDeleteTraining={deleteTraining}
            clientPackages={clientPackages}
            packages={packages}
            photos={clientPhotos[selectedClientId] || []}
            onPhotoAdd={handlePhotoAdd}
            onPhotoDelete={handlePhotoDelete}
          />
        ) : subView === 'billing' ? (
          <BillingView clients={clients} packages={packages} clientPackages={clientPackages} onSaveClientPackage={saveClientPackage} onDeleteClientPackage={deleteClientPackage} trainings={trainings} onBack={() => setSubView(null)} />
        ) : subView === 'packages' ? (
          <PackagesView packages={packages} onSavePackage={savePackage} onDeletePackage={deletePackage} onBack={() => setSubView(null)} />
        ) : subView === 'products' ? (
          <ProductsView products={products} onSave={saveProducts} onBack={() => setSubView(null)} />
        ) : subView === 'templates' ? (
          <TemplatesView templates={templates} onDelete={deleteTemplate} products={products} onBack={() => setSubView(null)} />
        ) : subView === 'recipes' ? (
          <RecipesView recipes={[]} products={products} onBack={() => setSubView(null)} />
        ) : subView === 'photos' ? (
          <PhotosGalleryView clients={clients} onBack={() => setSubView(null)} />
        ) : subView === 'backup' ? (
          <BackupView clients={clients} products={products} templates={templates} trainings={trainings} finances={finances} clientPackages={clientPackages} packages={packages} onImport={importData} onBack={() => setSubView(null)} />
        ) : subView === 'about' ? (
          <AboutView onBack={() => setSubView(null)} />
        ) : view === 'clients' ? (
          <ClientsView
            clients={clients}
            onSelect={(id) => setSelectedClientId(id)}
            onAdd={() => { setEditingClient(null); setShowClientForm(true); }}
            onDelete={deleteClient}
          />
        ) : view === 'calendar' ? (
          <CalendarView clients={clients} trainings={trainings} onSaveTraining={saveTraining} onDeleteTraining={deleteTraining} />
        ) : view === 'finances' ? (
          <FinancesView finances={finances} onSaveFinance={saveFinance} onDeleteFinance={deleteFinance} clients={clients} />
        ) : view === 'dashboard' ? (
          <DashboardView clients={clients} trainings={trainings} finances={finances} clientPackages={clientPackages} />
        ) : view === 'more' ? (
          <MoreMenu onNavigate={handleSubNav} />
        ) : null}
      </div>

      {/* Bottom tab bar */}
      <BottomTabBar activeTab={activeTab} onTab={handleTab} />

      {/* Client form modal */}
      {(showClientForm || editingClient) && (
        <ClientFormSheet
          client={editingClient}
          onSave={(c) => { saveClient(c); setShowClientForm(false); setEditingClient(null); }}
          onCancel={() => { setShowClientForm(false); setEditingClient(null); }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}


// ===== ERROR BOUNDARY =====
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('REACT ERROR:', error, info); }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { padding: 20, textAlign: 'center' } },
        React.createElement('h2', null, 'Wystąpił błąd'),
        React.createElement('p', { style: { color: '#666', fontSize: 14 } }, String(this.state.error)),
        React.createElement('button', { onClick: () => this.setState({ hasError: false }), style: { marginTop: 12, padding: '8px 16px', background: '#2d3f2f', color: '#fff', border: 'none', borderRadius: 4 } }, 'Spróbuj ponownie')
      );
    }
    return this.props.children;
  }
}


// ===== MOUNT =====
const rootEl = document.getElementById('root');
ReactDOM.createRoot(rootEl).render(
  React.createElement(AppErrorBoundary, null,
    React.createElement(StudioTreneraApp, null)
  )
);
