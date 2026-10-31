const {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} = React;

// ===== STORAGE =====
// Test if localStorage actually persists
const _storageAvailable = (() => {
  try {
    const t = '__storage_test__';
    localStorage.setItem(t, '1');
    const v = localStorage.getItem(t);
    localStorage.removeItem(t);
    return v === '1';
  } catch {
    return false;
  }
})();
const storage = {
  get(key) {
    try {
      const v = localStorage.getItem('dp_' + key);
      return v ? {
        value: v
      } : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('dp_' + key, value);
      // Verify write succeeded
      const check = localStorage.getItem('dp_' + key);
      if (check !== value) console.warn('Storage write verification failed for:', key);
    } catch (e) {
      console.error('Storage write failed:', key, e);
    }
  },
  delete(key) {
    try {
      localStorage.removeItem('dp_' + key);
    } catch {}
  },
  list(prefix) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('dp_' + prefix)) keys.push(k.replace('dp_', ''));
      }
      return {
        keys
      };
    } catch {
      return {
        keys: []
      };
    }
  },
  get isAvailable() {
    return _storageAvailable;
  }
};

// ===== IndexedDB for photos =====
const photoDB = {
  _db: null,
  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('StudioTreneraPhotos', 1);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore('photos', {
          keyPath: 'id'
        });
      };
      req.onsuccess = e => {
        this._db = e.target.result;
        resolve(this._db);
      };
      req.onerror = () => reject(req.error);
    });
  },
  async save(photo) {
    const db = await this.open();
    return new Promise((r, j) => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put(photo);
      tx.oncomplete = () => r();
      tx.onerror = () => j(tx.error);
    });
  },
  async getByClient(clientId) {
    const db = await this.open();
    return new Promise(resolve => {
      const tx = db.transaction('photos', 'readonly');
      const store = tx.objectStore('photos');
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []).filter(p => p.clientId === clientId).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      req.onerror = () => resolve([]);
    });
  },
  async deletePhoto(id) {
    const db = await this.open();
    return new Promise((r, j) => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').delete(id);
      tx.oncomplete = () => r();
      tx.onerror = () => j(tx.error);
    });
  },
  async getAll() {
    const db = await this.open();
    return new Promise(r => {
      const tx = db.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').getAll();
      req.onsuccess = () => r(req.result || []);
      req.onerror = () => r([]);
    });
  }
};

// ===== ICONS (SVG) =====
const I = ({
  d,
  size = 20,
  style = {},
  fill = 'none'
}) => React.createElement('svg', {
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill,
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  style: {
    display: 'inline-block',
    verticalAlign: 'middle',
    ...style
  }
}, ...(Array.isArray(d) ? d : [d]).map((path, i) => React.createElement('path', {
  key: i,
  d: path
})));
const UsersIcon = p => I({
  ...p,
  d: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M9 7a4 4 0 100-8 4 4 0 000 8z', 'M16 3.13a4 4 0 010 7.75']
});
const CalIcon = p => React.createElement('svg', {
  width: p.size || 20,
  height: p.size || 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  style: p.style || {}
}, React.createElement('rect', {
  x: 3,
  y: 4,
  width: 18,
  height: 18,
  rx: 2
}), React.createElement('line', {
  x1: 16,
  y1: 2,
  x2: 16,
  y2: 6
}), React.createElement('line', {
  x1: 8,
  y1: 2,
  x2: 8,
  y2: 6
}), React.createElement('line', {
  x1: 3,
  y1: 10,
  x2: 21,
  y2: 10
}));
const DollarIcon = p => I({
  ...p,
  d: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6']
});
const GridIcon = p => React.createElement('svg', {
  width: p.size || 20,
  height: p.size || 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  style: p.style || {}
}, React.createElement('rect', {
  x: 3,
  y: 3,
  width: 7,
  height: 9,
  rx: 1
}), React.createElement('rect', {
  x: 14,
  y: 3,
  width: 7,
  height: 5,
  rx: 1
}), React.createElement('rect', {
  x: 14,
  y: 12,
  width: 7,
  height: 9,
  rx: 1
}), React.createElement('rect', {
  x: 3,
  y: 16,
  width: 7,
  height: 5,
  rx: 1
}));
const MoreIcon = p => React.createElement('svg', {
  width: p.size || 20,
  height: p.size || 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  style: p.style || {}
}, React.createElement('circle', {
  cx: 12,
  cy: 5,
  r: 1
}), React.createElement('circle', {
  cx: 12,
  cy: 12,
  r: 1
}), React.createElement('circle', {
  cx: 12,
  cy: 19,
  r: 1
}));

// Simple icon factory
function SvgIcon({
  paths,
  size = 20,
  style = {}
}) {
  return React.createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: {
      display: 'inline-block',
      verticalAlign: 'middle',
      flexShrink: 0,
      ...style
    }
  }, ...paths.map((el, i) => {
    if (typeof el === 'string') return React.createElement('path', {
      key: i,
      d: el
    });
    const {
      tag,
      ...attrs
    } = el;
    return React.createElement(tag || 'path', {
      key: i,
      ...attrs
    });
  }));
}
const icons = {
  users: [{
    tag: 'path',
    d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2'
  }, {
    tag: 'circle',
    cx: 9,
    cy: 7,
    r: 4
  }, {
    tag: 'path',
    d: 'M23 21v-2a4 4 0 00-3-3.87'
  }, {
    tag: 'path',
    d: 'M16 3.13a4 4 0 010 7.75'
  }],
  calendar: [{
    tag: 'rect',
    x: 3,
    y: 4,
    width: 18,
    height: 18,
    rx: 2
  }, {
    tag: 'line',
    x1: 16,
    y1: 2,
    x2: 16,
    y2: 6
  }, {
    tag: 'line',
    x1: 8,
    y1: 2,
    x2: 8,
    y2: 6
  }, {
    tag: 'line',
    x1: 3,
    y1: 10,
    x2: 21,
    y2: 10
  }],
  dollar: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],
  grid: [{
    tag: 'rect',
    x: 3,
    y: 3,
    width: 7,
    height: 9,
    rx: 1
  }, {
    tag: 'rect',
    x: 14,
    y: 3,
    width: 7,
    height: 5,
    rx: 1
  }, {
    tag: 'rect',
    x: 14,
    y: 12,
    width: 7,
    height: 9,
    rx: 1
  }, {
    tag: 'rect',
    x: 3,
    y: 16,
    width: 7,
    height: 5,
    rx: 1
  }],
  more: [{
    tag: 'circle',
    cx: 12,
    cy: 5,
    r: 1,
    fill: 'currentColor'
  }, {
    tag: 'circle',
    cx: 12,
    cy: 12,
    r: 1,
    fill: 'currentColor'
  }, {
    tag: 'circle',
    cx: 12,
    cy: 19,
    r: 1,
    fill: 'currentColor'
  }],
  plus: ['M12 5v14', 'M5 12h14'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  check: ['M20 6L9 17l-5-5'],
  chevDown: ['M6 9l6 6 6-6'],
  chevRight: ['M9 18l6-6-6-6'],
  chevLeft: ['M15 18l-6-6 6-6'],
  search: [{
    tag: 'circle',
    cx: 11,
    cy: 11,
    r: 8
  }, 'M21 21l-4.35-4.35'],
  trash: ['M3 6h18', 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2'],
  edit: ['M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7', 'M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'],
  camera: ['M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z', {
    tag: 'circle',
    cx: 12,
    cy: 13,
    r: 4
  }],
  image: [{
    tag: 'rect',
    x: 3,
    y: 3,
    width: 18,
    height: 18,
    rx: 2
  }, {
    tag: 'circle',
    cx: 8.5,
    cy: 8.5,
    r: 1.5
  }, 'M21 15l-5-5L5 21'],
  share: [{
    tag: 'circle',
    cx: 18,
    cy: 5,
    r: 3
  }, {
    tag: 'circle',
    cx: 6,
    cy: 12,
    r: 3
  }, {
    tag: 'circle',
    cx: 18,
    cy: 19,
    r: 3
  }, 'M8.59 13.51l6.83 3.98', 'M15.41 6.51l-6.82 3.98'],
  download: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  upload: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  mic: ['M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z', 'M19 10v2a7 7 0 01-14 0v-2', 'M12 19v4', 'M8 23h8'],
  clock: [{
    tag: 'circle',
    cx: 12,
    cy: 12,
    r: 10
  }, 'M12 6v6l4 2'],
  pkg: ['M16.5 9.4l-9-5.19', 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12'],
  creditcard: [{
    tag: 'rect',
    x: 1,
    y: 4,
    width: 22,
    height: 16,
    rx: 2
  }, {
    tag: 'line',
    x1: 1,
    y1: 10,
    x2: 23,
    y2: 10
  }],
  file: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  trendUp: ['M23 6l-9.5 9.5-5-5L1 18'],
  target: [{
    tag: 'circle',
    cx: 12,
    cy: 12,
    r: 10
  }, {
    tag: 'circle',
    cx: 12,
    cy: 12,
    r: 6
  }, {
    tag: 'circle',
    cx: 12,
    cy: 12,
    r: 2
  }],
  barChart: ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  arrowLeft: ['M19 12H5', 'M12 19l-7-7 7-7'],
  star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  phone: ['M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z'],
  save: ['M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8'],
  settings: [{
    tag: 'circle',
    cx: 12,
    cy: 12,
    r: 3
  }, 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
  apple: [{
    tag: 'circle',
    cx: 12,
    cy: 14,
    r: 7
  }, 'M12 7c-2-3-5-3-5-3s0 3 2 5', 'M12 7c2-3 5-3 5-3s0 3-2 5'],
  book: ['M4 19.5A2.5 2.5 0 016.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'],
  chef: ['M6 13c-1.5 0-3 .5-3 2s1.5 2 3 2', 'M18 13c1.5 0 3 .5 3 2s-1.5 2-3 2', 'M6 17v2a2 2 0 002 2h8a2 2 0 002-2v-2', 'M12 3a5 5 0 00-5 5c0 2.76 2.24 5 5 5s5-2.24 5-5a5 5 0 00-5-5z', 'M15 1s-1 2-3 2-3-2-3-2'],
  info: [{
    tag: 'circle',
    cx: 12,
    cy: 12,
    r: 10
  }, 'M12 16v-4', 'M12 8h.01'],
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  link: ['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71'],
  externalLink: ['M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6', 'M15 3h6v6', 'M10 14L21 3'],
  dumbbell: ['M6.5 6.5l11 11', 'M21 3l-6.5 6.5', 'M3 21l6.5-6.5', 'M18 3l3 3', 'M3 18l3 3', {
    tag: 'rect',
    x: 2,
    y: 14,
    width: 4,
    height: 6,
    rx: 1,
    transform: 'rotate(-45 4 17)'
  }, {
    tag: 'rect',
    x: 14,
    y: 2,
    width: 4,
    height: 6,
    rx: 1,
    transform: 'rotate(-45 16 5)'
  }],
  utensils: ['M3 2l3 18h2L11 2', 'M7 2v8c0 2-2 4-4 4', 'M11 2v8c0 2 2 4 4 4', 'M17 2v20', 'M21 12c0-5-4-10-4-10v10'],
  refresh: ['M1 4v6h6', 'M23 20v-6h-6', 'M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15'],
  play: ['M5 3l14 9-14 9V3z'],
  swap: ['M16 3l4 4-4 4', 'M20 7H4', 'M8 21l-4-4 4-4', 'M4 17h16'],
  leaf: ['M17 8C8 10 5.9 16.17 3.82 21.34', 'M17 8A5 5 0 0121 12.3', 'M17 8c-4 0-8.14 5.7-11 11', 'M11 14c2-2 4.5-3.5 6-4']
};
function Icon2({
  name,
  size = 20,
  style = {}
}) {
  const paths = icons[name];
  if (!paths) return null;
  return SvgIcon({
    paths,
    size,
    style
  });
}

// ===== CONSTANTS =====
const PRELOADED_PACKAGES = [{
  id: 'pkg1',
  name: 'Trening personalny – pojedynczy',
  type: 'personal',
  sessions: 1,
  price: 120,
  validDays: 30
}, {
  id: 'pkg2',
  name: 'Pakiet 8 treningów',
  type: 'personal',
  sessions: 8,
  price: 800,
  validDays: 60
}, {
  id: 'pkg3',
  name: 'Pakiet 12 treningów',
  type: 'personal',
  sessions: 12,
  price: 1080,
  validDays: 90
}, {
  id: 'pkg4',
  name: 'Plan dietetyczny',
  type: 'diet',
  sessions: 1,
  price: 200,
  validDays: 30
}, {
  id: 'pkg5',
  name: 'Trening + Dieta (miesięcznie)',
  type: 'combo',
  sessions: 8,
  price: 950,
  validDays: 30
}, {
  id: 'pkg6',
  name: 'Trening grupowy – wejście',
  type: 'group',
  sessions: 1,
  price: 35,
  validDays: 30
}, {
  id: 'pkg7',
  name: 'Karnet grupowy 12 wejść',
  type: 'group',
  sessions: 12,
  price: 350,
  validDays: 60
}];
const INCOME_CATEGORIES = ['Trening personalny', 'Trening grupowy', 'Plan dietetyczny', 'Konsultacja', 'Pakiet combo', 'Inne'];
const EXPENSE_CATEGORIES = ['Wynajem sali', 'Sprzęt', 'Dojazd', 'Marketing', 'Suplementy na sprzedaż', 'Szkolenia', 'Ubezpieczenie', 'Telefon/Internet', 'Inne'];
const TRAINING_STATUSES = {
  scheduled: {
    label: 'Zaplanowany',
    color: '#5a7a8a',
    bg: '#e8f0f4'
  },
  completed: {
    label: 'Wykonany',
    color: '#5a7a4a',
    bg: '#e8f4e8'
  },
  cancelled: {
    label: 'Odwołany',
    color: '#b8621b',
    bg: '#f4ede8'
  },
  noshow: {
    label: 'Nieobecność',
    color: '#c65d3e',
    bg: '#f4e8e4'
  }
};
const PL_MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
const PL_DAYS_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
const ACTIVITY_LEVELS = [{
  value: 1.2,
  label: 'Siedzący tryb życia',
  hint: 'Biuro, brak treningów'
}, {
  value: 1.375,
  label: 'Lekko aktywny',
  hint: 'Trening 1-3x/tyg'
}, {
  value: 1.55,
  label: 'Umiarkowanie aktywny',
  hint: 'Trening 3-5x/tyg'
}, {
  value: 1.725,
  label: 'Bardzo aktywny',
  hint: 'Trening 6-7x/tyg'
}, {
  value: 1.9,
  label: 'Ekstremalnie aktywny',
  hint: 'Ciężka praca + treningi'
}];
const GOALS = [{
  value: 'reduction',
  label: 'Redukcja tkanki tłuszczowej',
  adjust: -0.20,
  color: '#c65d3e'
}, {
  value: 'recomp',
  label: 'Rekompozycja sylwetki',
  adjust: -0.10,
  color: '#b8915a'
}, {
  value: 'maintenance',
  label: 'Utrzymanie wagi',
  adjust: 0.00,
  color: '#8ba888'
}, {
  value: 'lean_mass',
  label: 'Budowa masy (lean bulk)',
  adjust: 0.10,
  color: '#5a7a8a'
}, {
  value: 'mass',
  label: 'Budowa masy mięśniowej',
  adjust: 0.15,
  color: '#3a5a6a'
}];
const MEAL_TYPES = ['Śniadanie', 'II śniadanie', 'Obiad', 'Podwieczorek', 'Kolacja'];
const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const DAYS_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

// ========================================================================
// EXERCISE DATABASE — built-in exercises with muscle groups & YT links
// ========================================================================
const EXERCISES_DB = [
// KLATKA PIERSIOWA
{
  id: 'ex01',
  name: 'Wyciskanie sztangi na ławce płaskiej',
  muscle: 'Klatka piersiowa',
  yt: 'https://www.youtube.com/results?search_query=wyciskanie+sztangi+%C5%82awka+p%C5%82aska+technika'
}, {
  id: 'ex02',
  name: 'Wyciskanie hantli na ławce płaskiej',
  muscle: 'Klatka piersiowa',
  yt: 'https://www.youtube.com/results?search_query=wyciskanie+hantli+%C5%82awka+p%C5%82aska'
}, {
  id: 'ex03',
  name: 'Wyciskanie na ławce skośnej (góra)',
  muscle: 'Klatka piersiowa',
  yt: 'https://www.youtube.com/results?search_query=wyciskanie+%C5%82awka+sko%C5%9Bna+g%C3%B3ra'
}, {
  id: 'ex04',
  name: 'Rozpiętki z hantlami',
  muscle: 'Klatka piersiowa',
  yt: 'https://www.youtube.com/results?search_query=rozpietki+hantlami+technika'
}, {
  id: 'ex05',
  name: 'Krzyżowanie linek (cable fly)',
  muscle: 'Klatka piersiowa',
  yt: 'https://www.youtube.com/results?search_query=krzyzowanie+linek+cable+fly'
}, {
  id: 'ex06',
  name: 'Pompki klasyczne',
  muscle: 'Klatka piersiowa',
  yt: 'https://www.youtube.com/results?search_query=pompki+klasyczne+technika'
},
// PLECY
{
  id: 'ex10',
  name: 'Podciąganie na drążku (nachwyt)',
  muscle: 'Plecy',
  yt: 'https://www.youtube.com/results?search_query=podciaganie+na+drazku+nachwyt'
}, {
  id: 'ex11',
  name: 'Wiosłowanie sztangą w opadzie',
  muscle: 'Plecy',
  yt: 'https://www.youtube.com/results?search_query=wioslowanie+sztanga+opad'
}, {
  id: 'ex12',
  name: 'Wiosłowanie hantlem jednorącz',
  muscle: 'Plecy',
  yt: 'https://www.youtube.com/results?search_query=wioslowanie+hantlem+jednorecz'
}, {
  id: 'ex13',
  name: 'Ściąganie drążka wyciągu górnego',
  muscle: 'Plecy',
  yt: 'https://www.youtube.com/results?search_query=sciaganie+drazka+wyciag+gorny+lat+pulldown'
}, {
  id: 'ex14',
  name: 'Wiosłowanie na maszynie (seated row)',
  muscle: 'Plecy',
  yt: 'https://www.youtube.com/results?search_query=wioslowanie+maszyna+seated+row'
}, {
  id: 'ex15',
  name: 'Hyperextension (prostowanie grzbietu)',
  muscle: 'Plecy',
  yt: 'https://www.youtube.com/results?search_query=hyperextension+prostowanie+grzbietu'
},
// BARKI
{
  id: 'ex20',
  name: 'Wyciskanie hantli nad głowę (OHP)',
  muscle: 'Barki',
  yt: 'https://www.youtube.com/results?search_query=wyciskanie+hantli+nad+glowe+OHP'
}, {
  id: 'ex21',
  name: 'Wznosy boczne hantlami',
  muscle: 'Barki',
  yt: 'https://www.youtube.com/results?search_query=wznosy+boczne+hantlami+technika'
}, {
  id: 'ex22',
  name: 'Wznosy przednie hantlami',
  muscle: 'Barki',
  yt: 'https://www.youtube.com/results?search_query=wznosy+przednie+hantlami'
}, {
  id: 'ex23',
  name: 'Face pull (wyciąg)',
  muscle: 'Barki',
  yt: 'https://www.youtube.com/results?search_query=face+pull+wyciag+technika'
}, {
  id: 'ex24',
  name: 'Arnoldki',
  muscle: 'Barki',
  yt: 'https://www.youtube.com/results?search_query=arnoldki+cwiczenie+barki'
}, {
  id: 'ex25',
  name: 'Odwrotne rozpiętki (tył barków)',
  muscle: 'Barki',
  yt: 'https://www.youtube.com/results?search_query=odwrotne+rozpietki+tyl+barkow'
},
// BICEPS
{
  id: 'ex30',
  name: 'Uginanie ramion ze sztangą stojąc',
  muscle: 'Biceps',
  yt: 'https://www.youtube.com/results?search_query=uginanie+ramion+sztanga+stojac+biceps'
}, {
  id: 'ex31',
  name: 'Uginanie hantli naprzemiennie',
  muscle: 'Biceps',
  yt: 'https://www.youtube.com/results?search_query=uginanie+hantli+naprzemiennie+biceps'
}, {
  id: 'ex32',
  name: 'Uginanie na modlitewniku',
  muscle: 'Biceps',
  yt: 'https://www.youtube.com/results?search_query=uginanie+modlitewnik+biceps'
}, {
  id: 'ex33',
  name: 'Uginanie młotkowe (hammer curl)',
  muscle: 'Biceps',
  yt: 'https://www.youtube.com/results?search_query=uginanie+mlotkowe+hammer+curl'
},
// TRICEPS
{
  id: 'ex40',
  name: 'Prostowanie ramion na wyciągu (pushdown)',
  muscle: 'Triceps',
  yt: 'https://www.youtube.com/results?search_query=prostowanie+ramion+wyciag+triceps+pushdown'
}, {
  id: 'ex41',
  name: 'Wyciskanie francuskie (french press)',
  muscle: 'Triceps',
  yt: 'https://www.youtube.com/results?search_query=wyciskanie+francuskie+french+press+triceps'
}, {
  id: 'ex42',
  name: 'Pompki na poręczach (dipy)',
  muscle: 'Triceps',
  yt: 'https://www.youtube.com/results?search_query=pompki+na+poreczach+dipy+triceps'
}, {
  id: 'ex43',
  name: 'Kick-back hantlami',
  muscle: 'Triceps',
  yt: 'https://www.youtube.com/results?search_query=kick+back+hantlami+triceps'
},
// NOGI (przód)
{
  id: 'ex50',
  name: 'Przysiady ze sztangą',
  muscle: 'Nogi (przód)',
  yt: 'https://www.youtube.com/results?search_query=przysiady+ze+sztanga+technika'
}, {
  id: 'ex51',
  name: 'Hack squat (maszyna)',
  muscle: 'Nogi (przód)',
  yt: 'https://www.youtube.com/results?search_query=hack+squat+maszyna'
}, {
  id: 'ex52',
  name: 'Prasa nożna (leg press)',
  muscle: 'Nogi (przód)',
  yt: 'https://www.youtube.com/results?search_query=prasa+nozna+leg+press'
}, {
  id: 'ex53',
  name: 'Prostowanie nóg na maszynie',
  muscle: 'Nogi (przód)',
  yt: 'https://www.youtube.com/results?search_query=prostowanie+nog+maszyna+leg+extension'
}, {
  id: 'ex54',
  name: 'Wykroki z hantlami',
  muscle: 'Nogi (przód)',
  yt: 'https://www.youtube.com/results?search_query=wykroki+z+hantlami+technika'
}, {
  id: 'ex55',
  name: 'Goblet squat (przysiad z kettlem)',
  muscle: 'Nogi (przód)',
  yt: 'https://www.youtube.com/results?search_query=goblet+squat+przysiad+kettle'
}, {
  id: 'ex56',
  name: 'Bulgarian split squat',
  muscle: 'Nogi (przód)',
  yt: 'https://www.youtube.com/results?search_query=bulgarian+split+squat+technika'
},
// NOGI (tył) + POŚLADKI
{
  id: 'ex60',
  name: 'Martwy ciąg rumuński',
  muscle: 'Nogi (tył)',
  yt: 'https://www.youtube.com/results?search_query=martwy+ciag+rumunski+technika'
}, {
  id: 'ex61',
  name: 'Uginanie nóg na maszynie leżąc',
  muscle: 'Nogi (tył)',
  yt: 'https://www.youtube.com/results?search_query=uginanie+nog+maszyna+lezac'
}, {
  id: 'ex62',
  name: 'Hip thrust (wypychanie bioder)',
  muscle: 'Pośladki',
  yt: 'https://www.youtube.com/results?search_query=hip+thrust+wypychanie+bioder'
}, {
  id: 'ex63',
  name: 'Odwodzenie nogi w tył (cable)',
  muscle: 'Pośladki',
  yt: 'https://www.youtube.com/results?search_query=odwodzenie+nogi+w+tyl+cable+posladki'
}, {
  id: 'ex64',
  name: 'Odwodzenie nogi w bok (maszyna)',
  muscle: 'Pośladki',
  yt: 'https://www.youtube.com/results?search_query=odwodzenie+nogi+w+bok+maszyna'
}, {
  id: 'ex65',
  name: 'Glute bridge (mostek)',
  muscle: 'Pośladki',
  yt: 'https://www.youtube.com/results?search_query=glute+bridge+mostek+posladkowy'
},
// BRZUCH
{
  id: 'ex70',
  name: 'Plank (deska)',
  muscle: 'Brzuch',
  yt: 'https://www.youtube.com/results?search_query=plank+deska+technika'
}, {
  id: 'ex71',
  name: 'Spięcia brzucha (crunches)',
  muscle: 'Brzuch',
  yt: 'https://www.youtube.com/results?search_query=spiecia+brzucha+crunches'
}, {
  id: 'ex72',
  name: 'Unoszenie nóg w zwisie',
  muscle: 'Brzuch',
  yt: 'https://www.youtube.com/results?search_query=unoszenie+nog+w+zwisie+brzuch'
}, {
  id: 'ex73',
  name: 'Russian twist',
  muscle: 'Brzuch',
  yt: 'https://www.youtube.com/results?search_query=russian+twist+brzuch'
}, {
  id: 'ex74',
  name: 'Dead bug',
  muscle: 'Brzuch',
  yt: 'https://www.youtube.com/results?search_query=dead+bug+cwiczenie+brzuch'
}, {
  id: 'ex75',
  name: 'Mountain climbers',
  muscle: 'Brzuch',
  yt: 'https://www.youtube.com/results?search_query=mountain+climbers+technika'
},
// ŁYDKI
{
  id: 'ex80',
  name: 'Wspięcia na palce stojąc',
  muscle: 'Łydki',
  yt: 'https://www.youtube.com/results?search_query=wspiecia+na+palce+stojac+lydki'
}, {
  id: 'ex81',
  name: 'Wspięcia na palce siedząc',
  muscle: 'Łydki',
  yt: 'https://www.youtube.com/results?search_query=wspiecia+na+palce+siedzac+lydki'
},
// CARDIO / FUNKCJONALNE
{
  id: 'ex90',
  name: 'Burpees',
  muscle: 'Cardio',
  yt: 'https://www.youtube.com/results?search_query=burpees+technika'
}, {
  id: 'ex91',
  name: 'Jumping jacks',
  muscle: 'Cardio',
  yt: 'https://www.youtube.com/results?search_query=jumping+jacks'
}, {
  id: 'ex92',
  name: 'Kettlebell swing',
  muscle: 'Cardio',
  yt: 'https://www.youtube.com/results?search_query=kettlebell+swing+technika'
}, {
  id: 'ex93',
  name: 'Box jump',
  muscle: 'Cardio',
  yt: 'https://www.youtube.com/results?search_query=box+jump+technika'
}, {
  id: 'ex94',
  name: 'Skakanka',
  muscle: 'Cardio',
  yt: 'https://www.youtube.com/results?search_query=skakanka+technika+trening'
}];
const MUSCLE_GROUPS = [...new Set(EXERCISES_DB.map(e => e.muscle))].sort();

// ===== HELPERS =====
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const toDateStr = d => {
  const dd = d || new Date();
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
};
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfWeek = (y, m) => {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
};
const formatMoney = v => typeof v === 'number' ? v.toLocaleString('pl-PL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}) + ' zł' : '0 zł';

// Compress image for storage
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
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
  const result = {
    clientName: null,
    date: null,
    time: null,
    type: null,
    notes: ''
  };
  const lower = (text || '').toLowerCase().trim();

  // Extract time (e.g. "o 15:00", "na 9:30", "godzina 10")
  const timeMatch = lower.match(/(?:o |na |godzina? |godz\.? ?)(\d{1,2})[:\.]?(\d{2})?/);
  if (timeMatch) {
    result.time = `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}`;
  }

  // Extract relative date
  if (/jutro/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    result.date = toDateStr(d);
  } else if (/pojutrze/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    result.date = toDateStr(d);
  } else if (/dzisiaj|dziś|dzis/.test(lower)) {
    result.date = toDateStr(new Date());
  } else {
    // Try "15 marca", "3 stycznia" etc.
    const plMonths = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
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
  if (/grupow/.test(lower)) result.type = 'group';else if (/diet|żywien|odżyw/.test(lower)) result.type = 'diet';else if (/personal|indywidual|osob/.test(lower)) result.type = 'personal';

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
function ConfirmDialog({
  message,
  onYes,
  onNo
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: onNo
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-sheet",
    onClick: e => e.stopPropagation(),
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      margin: '0 0 20px 0',
      color: 'var(--text)'
    }
  }, message), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      flex: 1
    },
    onClick: onNo
  }, "Anuluj"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    style: {
      flex: 1
    },
    onClick: onYes
  }, "Tak"))));
}
function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = message => new Promise(resolve => setState({
    message,
    resolve
  }));
  const handleYes = () => {
    state?.resolve(true);
    setState(null);
  };
  const handleNo = () => {
    state?.resolve(false);
    setState(null);
  };
  const dialog = state ? /*#__PURE__*/React.createElement(ConfirmDialog, {
    message: state.message,
    onYes: handleYes,
    onNo: handleNo
  }) : null;
  return {
    confirm,
    dialog
  };
}

// ===== TOAST =====
function Toast({
  message,
  onClose
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 90,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--forest)',
      color: '#fff',
      padding: '10px 20px',
      borderRadius: 12,
      fontSize: 13,
      zIndex: 200,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      whiteSpace: 'nowrap'
    }
  }, message);
}

// ========================================================================
// BOTTOM TAB BAR
// ========================================================================
const TABS = [{
  id: 'clients',
  label: 'Klienci',
  icon: 'users'
}, {
  id: 'calendar',
  label: 'Kalendarz',
  icon: 'calendar'
}, {
  id: 'finances',
  label: 'Finanse',
  icon: 'dollar'
}, {
  id: 'dashboard',
  label: 'Panel',
  icon: 'grid'
}, {
  id: 'more',
  label: 'Więcej',
  icon: 'more'
}];
function BottomTabBar({
  activeTab,
  onTab
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "tab-bar"
  }, TABS.map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab.id,
    className: `tab-btn ${activeTab === tab.id ? 'active' : ''}`,
    onClick: () => onTab(tab.id)
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: tab.icon,
    size: 22
  }), /*#__PURE__*/React.createElement("span", null, tab.label))));
}

// ========================================================================
// PAGE HEADER
// ========================================================================
function PageHeader({
  title,
  subtitle,
  action,
  onAction,
  actionIcon,
  onBack,
  backLabel
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, onBack && /*#__PURE__*/React.createElement("button", {
    className: "back-btn",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "chevLeft",
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, backLabel || 'Wróć')), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    className: "page-title"
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    className: "page-subtitle"
  }, subtitle)), action && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary btn-round",
    onClick: onAction
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: actionIcon || 'plus',
    size: 18
  })));
}

// ========================================================================
// MORE MENU
// ========================================================================
function MoreMenu({
  onNavigate
}) {
  const items = [{
    id: 'diets',
    label: 'Plany dietetyczne',
    icon: 'utensils',
    desc: 'Diety dla klientek'
  }, {
    id: 'workouts',
    label: 'Plany treningowe',
    icon: 'dumbbell',
    desc: 'Treningi z filmami YT'
  }, {
    id: 'billing',
    label: 'Rozliczenia',
    icon: 'creditcard',
    desc: 'Pakiety klientów'
  }, {
    id: 'packages',
    label: 'Pakiety',
    icon: 'pkg',
    desc: 'Oferta cenowa'
  }, {
    id: 'products',
    label: 'Baza produktów',
    icon: 'apple',
    desc: '250+ produktów'
  }, {
    id: 'templates',
    label: 'Szablony diet',
    icon: 'book',
    desc: 'Zapisane plany'
  }, {
    id: 'recipes',
    label: 'Przepisy',
    icon: 'chef',
    desc: 'Baza przepisów'
  }, {
    id: 'photos',
    label: 'Galeria zdjęć',
    icon: 'camera',
    desc: 'Before/After'
  }, {
    id: 'backup',
    label: 'Backup',
    icon: 'download',
    desc: 'Import/Export'
  }, {
    id: 'about',
    label: 'O aplikacji',
    icon: 'info',
    desc: 'Studio Trenera MT'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Wi\u0119cej",
    subtitle: "Dodatkowe funkcje"
  }), /*#__PURE__*/React.createElement("div", {
    className: "card-list"
  }, items.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    className: "menu-item",
    onClick: () => onNavigate(item.id)
  }, /*#__PURE__*/React.createElement("div", {
    className: "menu-icon"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: item.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text)'
    }
  }, item.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)',
      marginTop: 2
    }
  }, item.desc)), /*#__PURE__*/React.createElement(Icon2, {
    name: "chevRight",
    size: 18,
    style: {
      color: 'var(--muted)'
    }
  })))));
}

// ========================================================================
// CLIENTS VIEW
// ========================================================================
function ClientsView({
  clients,
  onSelect,
  onAdd,
  onDelete
}) {
  const [search, setSearch] = useState('');
  const {
    confirm,
    dialog
  } = useConfirm();
  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [clients, search]);
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (await confirm('Usunąć klienta?')) onDelete(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Klienci",
    subtitle: `${clients.length} podopiecznych`,
    action: "Dodaj",
    onAction: onAdd,
    actionIcon: "plus"
  }), clients.length > 3 && /*#__PURE__*/React.createElement("div", {
    className: "search-bar"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "search",
    size: 16,
    style: {
      color: 'var(--muted)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Szukaj klienta...",
    value: search,
    onChange: e => setSearch(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "card-list"
  }, filtered.map(c => {
    const initials = (c.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      className: "client-card",
      onClick: () => onSelect(c.id)
    }, /*#__PURE__*/React.createElement("div", {
      className: "avatar"
    }, initials), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "client-name"
    }, c.name || 'Bez nazwy'), /*#__PURE__*/React.createElement("div", {
      className: "client-meta"
    }, c.age && `${c.age} lat`, c.goal && ` · ${GOALS.find(g => g.value === c.goal)?.label || c.goal}`)), /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      onClick: e => handleDelete(e, c.id)
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "trash",
      size: 16,
      style: {
        color: 'var(--danger)'
      }
    })));
  }), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "users",
    size: 48,
    style: {
      color: 'var(--muted)',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("p", null, search ? 'Brak wyników' : 'Dodaj pierwszego klienta'))), dialog);
}

// ========================================================================
// CLIENT FORM (Sheet modal)
// ========================================================================
function ClientFormSheet({
  client,
  onSave,
  onCancel
}) {
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
      gender,
      activity: parseFloat(activity),
      goal,
      phone: phone.trim(),
      notes: notes.trim(),
      createdAt: client?.createdAt || new Date().toISOString(),
      // Preserve existing diet data
      meals: client?.meals || {},
      dietDays: client?.dietDays || ['Poniedziałek']
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-sheet modal-full",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-text",
    onClick: onCancel
  }, "Anuluj"), /*#__PURE__*/React.createElement("span", {
    className: "sheet-title"
  }, client ? 'Edytuj klienta' : 'Nowy klient'), /*#__PURE__*/React.createElement("button", {
    className: "btn-text btn-primary-text",
    onClick: handleSubmit
  }, "Zapisz")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-body"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Imi\u0119 i nazwisko *"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "np. Anna Kowalska",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Wiek"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "number",
    value: age,
    onChange: e => setAge(e.target.value),
    placeholder: "30"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Waga (kg)"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "number",
    step: "0.1",
    value: weight,
    onChange: e => setWeight(e.target.value),
    placeholder: "65"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Wzrost (cm)"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "number",
    value: height,
    onChange: e => setHeight(e.target.value),
    placeholder: "170"
  }))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "P\u0142e\u0107"), /*#__PURE__*/React.createElement("div", {
    className: "segment-control"
  }, /*#__PURE__*/React.createElement("button", {
    className: gender === 'female' ? 'active' : '',
    onClick: () => setGender('female')
  }, "Kobieta"), /*#__PURE__*/React.createElement("button", {
    className: gender === 'male' ? 'active' : '',
    onClick: () => setGender('male')
  }, "M\u0119\u017Cczyzna")), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Aktywno\u015B\u0107 fizyczna"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: activity,
    onChange: e => setActivity(e.target.value)
  }, ACTIVITY_LEVELS.map(a => /*#__PURE__*/React.createElement("option", {
    key: a.value,
    value: a.value
  }, a.label))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Cel"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: goal,
    onChange: e => setGoal(e.target.value)
  }, GOALS.map(g => /*#__PURE__*/React.createElement("option", {
    key: g.value,
    value: g.value
  }, g.label))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Telefon"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "tel",
    value: phone,
    onChange: e => setPhone(e.target.value),
    placeholder: "+48 600 000 000"
  }), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Notatki"), /*#__PURE__*/React.createElement("textarea", {
    className: "field-input",
    rows: 3,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "Dodatkowe informacje..."
  }))));
}

// ========================================================================
// CLIENT DETAIL
// ========================================================================
function ClientDetailView({
  client,
  products,
  templates,
  onBack,
  onSave,
  onEdit,
  onSaveTemplate,
  trainings,
  onSaveTraining,
  onDeleteTraining,
  clientPackages,
  packages,
  photos,
  onPhotoAdd,
  onPhotoDelete
}) {
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
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    onBack: onBack,
    backLabel: "Klienci",
    title: ""
  }), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar avatar-lg",
    style: {
      margin: '0 auto 12px'
    }
  }, initials), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 4px 0',
      fontSize: 20,
      fontWeight: 600
    }
  }, client.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--muted)'
    }
  }, client.age && `${client.age} lat`, client.weight && ` · ${client.weight} kg`, client.height && ` · ${client.height} cm`), targetKcal && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge",
    style: {
      background: goalObj?.color || 'var(--forest)',
      color: '#fff'
    }
  }, goalObj?.label, " \xB7 ", targetKcal, " kcal")), client.phone && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "phone",
    size: 14,
    style: {
      marginRight: 4
    }
  }), /*#__PURE__*/React.createElement("a", {
    href: `tel:${client.phone}`,
    style: {
      color: 'var(--forest)'
    }
  }, client.phone)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    onClick: onEdit
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "edit",
    size: 14
  }), " Edytuj"))), /*#__PURE__*/React.createElement("div", {
    className: "detail-tabs"
  }, [{
    id: 'diet',
    label: 'Dieta'
  }, {
    id: 'trainings',
    label: 'Treningi'
  }, {
    id: 'photos',
    label: 'Zdjęcia'
  }, {
    id: 'report',
    label: 'Raport'
  }].map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    className: `detail-tab ${tab === t.id ? 'active' : ''}`,
    onClick: () => setTab(t.id)
  }, t.label))), tab === 'diet' && /*#__PURE__*/React.createElement(ClientDietTab, {
    client: client,
    products: products,
    templates: templates,
    onSave: onSave,
    onSaveTemplate: onSaveTemplate,
    targetKcal: targetKcal
  }), tab === 'trainings' && /*#__PURE__*/React.createElement(ClientTrainingsTab, {
    client: client,
    trainings: clientTrainings,
    onSave: onSaveTraining,
    onDelete: onDeleteTraining
  }), tab === 'photos' && /*#__PURE__*/React.createElement(ClientPhotosTab, {
    client: client,
    photos: photos || [],
    onAdd: onPhotoAdd,
    onDelete: onPhotoDelete
  }), tab === 'report' && /*#__PURE__*/React.createElement(ClientReportTab, {
    client: client,
    trainings: clientTrainings,
    targetKcal: targetKcal,
    goalObj: goalObj
  }));
}

// ========================================================================
// CLIENT DIET TAB (simplified for mobile — preserves core diet logic)
// ========================================================================
function ClientDietTab({
  client,
  products,
  templates,
  onSave,
  onSaveTemplate,
  targetKcal
}) {
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
        if (prod) total += prod.kcal * item.grams / 100;
      });
    });
    return Math.round(total);
  }, [dayMeals, products]);
  const addItem = (mealType, product, grams) => {
    const newMeals = {
      ...meals
    };
    if (!newMeals[currentDay]) newMeals[currentDay] = {};
    if (!newMeals[currentDay][mealType]) newMeals[currentDay][mealType] = [];
    newMeals[currentDay][mealType] = [...newMeals[currentDay][mealType], {
      productId: product.id,
      grams
    }];
    onSave({
      ...client,
      meals: newMeals
    });
    setShowAddMeal(null);
    setSearchProd('');
  };
  const removeItem = (mealType, idx) => {
    const newMeals = {
      ...meals
    };
    newMeals[currentDay][mealType] = newMeals[currentDay][mealType].filter((_, i) => i !== idx);
    onSave({
      ...client,
      meals: newMeals
    });
  };
  const filteredProducts = useMemo(() => {
    if (!searchProd) return products.slice(0, 20);
    const q = searchProd.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20);
  }, [products, searchProd]);
  return /*#__PURE__*/React.createElement("div", null, activeDays.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "day-selector"
  }, activeDays.map((d, i) => /*#__PURE__*/React.createElement("button", {
    key: d,
    className: `day-btn ${i === selectedDay ? 'active' : ''}`,
    onClick: () => setSelectedDay(i)
  }, d.slice(0, 3)))), /*#__PURE__*/React.createElement("div", {
    className: "card calorie-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cal-current"
  }, totalKcal), /*#__PURE__*/React.createElement("div", {
    className: "cal-label"
  }, "/ ", targetKcal || '?', " kcal"), targetKcal && /*#__PURE__*/React.createElement("div", {
    className: "progress-bar",
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "progress-fill",
    style: {
      width: `${Math.min(100, totalKcal / targetKcal * 100)}%`,
      background: totalKcal > targetKcal ? 'var(--danger)' : 'var(--forest)'
    }
  }))), MEAL_TYPES.map(mealType => {
    const items = dayMeals[mealType] || [];
    const mealKcal = items.reduce((sum, item) => {
      const p = products.find(pr => pr.id === item.productId);
      return sum + (p ? p.kcal * item.grams / 100 : 0);
    }, 0);
    return /*#__PURE__*/React.createElement("div", {
      key: mealType,
      className: "card meal-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "meal-header"
    }, /*#__PURE__*/React.createElement("span", {
      className: "meal-name"
    }, mealType), /*#__PURE__*/React.createElement("span", {
      className: "meal-kcal"
    }, Math.round(mealKcal), " kcal")), items.map((item, idx) => {
      const p = products.find(pr => pr.id === item.productId);
      return /*#__PURE__*/React.createElement("div", {
        key: idx,
        className: "meal-item-row"
      }, /*#__PURE__*/React.createElement("span", {
        className: "item-name"
      }, p?.name || '?'), /*#__PURE__*/React.createElement("span", {
        className: "item-grams"
      }, item.grams, "g"), /*#__PURE__*/React.createElement("button", {
        className: "icon-btn-sm",
        onClick: () => removeItem(mealType, idx)
      }, /*#__PURE__*/React.createElement(Icon2, {
        name: "x",
        size: 14
      })));
    }), /*#__PURE__*/React.createElement("button", {
      className: "add-meal-btn",
      onClick: () => setShowAddMeal(mealType)
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "plus",
      size: 16
    }), " Dodaj"));
  }), showAddMeal && /*#__PURE__*/React.createElement(AddProductSheet, {
    mealType: showAddMeal,
    products: filteredProducts,
    searchProd: searchProd,
    onSearch: setSearchProd,
    onAdd: (p, g) => addItem(showAddMeal, p, g),
    onClose: () => {
      setShowAddMeal(null);
      setSearchProd('');
    }
  }));
}
function AddProductSheet({
  mealType,
  products,
  searchProd,
  onSearch,
  onAdd,
  onClose
}) {
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState('100');
  if (selected) {
    return /*#__PURE__*/React.createElement("div", {
      className: "modal-overlay",
      onClick: onClose
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal-sheet",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "sheet-header"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn-text",
      onClick: () => setSelected(null)
    }, "\u2190 Wr\xF3\u0107"), /*#__PURE__*/React.createElement("span", {
      className: "sheet-title"
    }, selected.name), /*#__PURE__*/React.createElement("button", {
      className: "btn-text btn-primary-text",
      onClick: () => onAdd(selected, parseInt(grams) || 100)
    }, "Dodaj")), /*#__PURE__*/React.createElement("div", {
      className: "sheet-body"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        margin: '20px 0'
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Ilo\u015B\u0107 (g)"), /*#__PURE__*/React.createElement("input", {
      className: "field-input",
      type: "number",
      value: grams,
      onChange: e => setGrams(e.target.value),
      style: {
        textAlign: 'center',
        fontSize: 24,
        maxWidth: 150,
        margin: '0 auto'
      },
      autoFocus: true
    })), /*#__PURE__*/React.createElement("div", {
      className: "nutrition-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "nutr-item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "nutr-val"
    }, Math.round(selected.kcal * (parseInt(grams) || 100) / 100)), /*#__PURE__*/React.createElement("span", {
      className: "nutr-label"
    }, "kcal")), /*#__PURE__*/React.createElement("div", {
      className: "nutr-item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "nutr-val"
    }, (selected.protein * (parseInt(grams) || 100) / 100).toFixed(1)), /*#__PURE__*/React.createElement("span", {
      className: "nutr-label"
    }, "bia\u0142ko")), /*#__PURE__*/React.createElement("div", {
      className: "nutr-item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "nutr-val"
    }, (selected.carbs * (parseInt(grams) || 100) / 100).toFixed(1)), /*#__PURE__*/React.createElement("span", {
      className: "nutr-label"
    }, "w\u0119gle")), /*#__PURE__*/React.createElement("div", {
      className: "nutr-item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "nutr-val"
    }, (selected.fat * (parseInt(grams) || 100) / 100).toFixed(1)), /*#__PURE__*/React.createElement("span", {
      className: "nutr-label"
    }, "t\u0142uszcz"))))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-sheet modal-full",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-text",
    onClick: onClose
  }, "Anuluj"), /*#__PURE__*/React.createElement("span", {
    className: "sheet-title"
  }, "Dodaj do: ", mealType), /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("div", {
    className: "sheet-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "search-bar"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "search",
    size: 16,
    style: {
      color: 'var(--muted)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Szukaj produktu...",
    value: searchProd,
    onChange: e => onSearch(e.target.value),
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "product-list"
  }, products.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    className: "product-item",
    onClick: () => setSelected(p)
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, p.kcal, " kcal \xB7 B:", p.protein, " W:", p.carbs, " T:", p.fat)), /*#__PURE__*/React.createElement(Icon2, {
    name: "chevRight",
    size: 16,
    style: {
      color: 'var(--muted)'
    }
  })))))));
}

// ========================================================================
// CLIENT TRAININGS TAB
// ========================================================================
function ClientTrainingsTab({
  client,
  trainings,
  onSave,
  onDelete
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const {
    confirm,
    dialog
  } = useConfirm();
  const sorted = useMemo(() => [...trainings].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [trainings]);
  const handleDelete = async id => {
    if (await confirm('Usunąć trening?')) onDelete(id);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      marginBottom: 16
    },
    onClick: () => {
      setEditing(null);
      setShowForm(true);
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "plus",
    size: 16
  }), " Nowy trening"), sorted.map(t => {
    const st = TRAINING_STATUSES[t.status] || TRAINING_STATUSES.scheduled;
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      className: "card training-card",
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 500
      }
    }, t.date, " \xB7 ", t.time || '--:--'), /*#__PURE__*/React.createElement("span", {
      className: "badge",
      style: {
        background: st.bg,
        color: st.color,
        marginTop: 4
      }
    }, st.label), t.notes && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--muted)',
        marginTop: 4
      }
    }, t.notes)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "icon-btn-sm",
      onClick: () => {
        setEditing(t);
        setShowForm(true);
      }
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "edit",
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      className: "icon-btn-sm",
      onClick: () => handleDelete(t.id)
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "trash",
      size: 14,
      style: {
        color: 'var(--danger)'
      }
    })), /*#__PURE__*/React.createElement("a", {
      href: buildGoogleCalendarUrl(t, client.name),
      target: "_blank",
      rel: "noopener",
      className: "icon-btn-sm",
      title: "Dodaj do Google Calendar"
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "externalLink",
      size: 14,
      style: {
        color: 'var(--forest)'
      }
    })))));
  }), sorted.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "calendar",
    size: 40,
    style: {
      color: 'var(--muted)',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("p", null, "Brak trening\xF3w")), showForm && /*#__PURE__*/React.createElement(TrainingFormSheet, {
    training: editing,
    clientId: client.id,
    onSave: t => {
      onSave(t);
      setShowForm(false);
      setEditing(null);
    },
    onCancel: () => {
      setShowForm(false);
      setEditing(null);
    }
  }), dialog);
}
function TrainingFormSheet({
  training,
  clientId,
  onSave,
  onCancel
}) {
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
      date,
      time,
      status,
      notes: notes.trim()
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-text",
    onClick: onCancel
  }, "Anuluj"), /*#__PURE__*/React.createElement("span", {
    className: "sheet-title"
  }, training ? 'Edytuj trening' : 'Nowy trening'), /*#__PURE__*/React.createElement("button", {
    className: "btn-text btn-primary-text",
    onClick: handleSubmit
  }, "Zapisz")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "voice-hint"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "mic",
    size: 16,
    style: {
      color: 'var(--forest)'
    }
  }), /*#__PURE__*/React.createElement("span", null, "U\u017Cyj dyktowania iOS na klawiaturze, aby m\xF3wi\u0107")), /*#__PURE__*/React.createElement("div", {
    className: "field-row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Data"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Godzina"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "time",
    value: time,
    onChange: e => setTime(e.target.value)
  }))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Status"), /*#__PURE__*/React.createElement("div", {
    className: "status-grid"
  }, Object.entries(TRAINING_STATUSES).map(([key, st]) => /*#__PURE__*/React.createElement("button", {
    key: key,
    className: `status-btn ${status === key ? 'active' : ''}`,
    style: {
      '--sc': st.color,
      '--sb': st.bg
    },
    onClick: () => setStatus(key)
  }, st.label))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Notatki"), /*#__PURE__*/React.createElement("textarea", {
    className: "field-input",
    rows: 3,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "Notatki do treningu..."
  }))));
}

// ========================================================================
// CLIENT PHOTOS TAB
// ========================================================================
function ClientPhotosTab({
  client,
  photos,
  onAdd,
  onDelete
}) {
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();
  const {
    confirm,
    dialog
  } = useConfirm();
  const handleFileChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const photo = {
        id: uid(),
        clientId: client.id,
        date: toDateStr(),
        data: compressed,
        label: ''
      };
      await onAdd(photo);
    } catch (err) {
      console.error('Photo error:', err);
    }
    e.target.value = '';
  };
  const handleDelete = async id => {
    if (await confirm('Usunąć zdjęcie?')) onDelete(id);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    onClick: () => fileRef.current?.click()
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "camera",
    size: 16
  }), " Zr\xF3b zdj\u0119cie"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    onChange: handleFileChange,
    style: {
      display: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "photo-grid"
  }, photos.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "photo-thumb",
    onClick: () => setPreview(p)
  }, /*#__PURE__*/React.createElement("img", {
    src: p.data,
    alt: "",
    loading: "lazy"
  }), /*#__PURE__*/React.createElement("div", {
    className: "photo-date"
  }, p.date)))), photos.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "camera",
    size: 40,
    style: {
      color: 'var(--muted)',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("p", null, "Brak zdj\u0119\u0107. Dodaj pierwsze zdj\u0119cie before/after.")), preview && /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: () => setPreview(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '90vw',
      maxHeight: '80vh',
      position: 'relative'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("img", {
    src: preview.data,
    alt: "",
    style: {
      maxWidth: '100%',
      maxHeight: '80vh',
      borderRadius: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-danger",
    onClick: () => {
      handleDelete(preview.id);
      setPreview(null);
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "trash",
    size: 14
  }), " Usu\u0144")))), dialog);
}

// ========================================================================
// CLIENT REPORT TAB (PDF generation + sharing)
// ========================================================================
function ClientReportTab({
  client,
  trainings,
  targetKcal,
  goalObj
}) {
  const [generating, setGenerating] = useState(false);
  const stats = useMemo(() => {
    const completed = trainings.filter(t => t.status === 'completed').length;
    const total = trainings.length;
    return {
      completed,
      total,
      rate: total > 0 ? Math.round(completed / total * 100) : 0
    };
  }, [trainings]);
  const generateAndShare = async () => {
    setGenerating(true);
    try {
      // Build report as text (jsPDF will be loaded dynamically)
      const report = [`RAPORT - ${client.name}`, `Data: ${toDateStr()}`, ``, `--- DANE ---`, `Wiek: ${client.age || '-'} lat`, `Waga: ${client.weight || '-'} kg`, `Wzrost: ${client.height || '-'} cm`, `Cel: ${goalObj?.label || '-'}`, `Zapotrzebowanie: ${targetKcal || '-'} kcal`, ``, `--- TRENINGI ---`, `Wykonanych: ${stats.completed} / ${stats.total}`, `Frekwencja: ${stats.rate}%`].join('\n');

      // Try Web Share API
      if (navigator.share) {
        await navigator.share({
          title: `Raport: ${client.name}`,
          text: report
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
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 12px',
      fontSize: 16,
      fontWeight: 600
    }
  }, "Podsumowanie"), /*#__PURE__*/React.createElement("div", {
    className: "stats-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-val"
  }, stats.completed), /*#__PURE__*/React.createElement("div", {
    className: "stat-lbl"
  }, "Trening\xF3w")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-val"
  }, stats.rate, "%"), /*#__PURE__*/React.createElement("div", {
    className: "stat-lbl"
  }, "Frekwencja")), /*#__PURE__*/React.createElement("div", {
    className: "stat-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-val"
  }, targetKcal || '-'), /*#__PURE__*/React.createElement("div", {
    className: "stat-lbl"
  }, "kcal/dzie\u0144")))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-full",
    onClick: generateAndShare,
    disabled: generating
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "share",
    size: 18
  }), generating ? 'Generowanie...' : 'Udostępnij raport'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: 'var(--muted)',
      textAlign: 'center',
      marginTop: 8
    }
  }, "WhatsApp \xB7 Messenger \xB7 SMS \xB7 E-mail"));
}

// ========================================================================
// CALENDAR VIEW
// ========================================================================
function CalendarView({
  clients,
  trainings,
  onSaveTraining,
  onDeleteTraining
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const recognitionRef = useRef(null);
  const {
    confirm,
    dialog
  } = useConfirm();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const speechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const getClientName = id => {
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
  const selectedTrainings = selectedDate ? trainingsByDate[selectedDate] || [] : [];
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else setMonth(m => m + 1);
  };

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
      recognition.onresult = event => {
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
      recognition.onerror = event => {
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
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
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
        notes: voiceText
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
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Kalendarz",
    subtitle: `${PL_MONTHS[month]} ${year}`,
    action: "Dodaj",
    onAction: () => setShowForm(true)
  }), /*#__PURE__*/React.createElement("button", {
    className: "voice-toggle",
    onClick: () => {
      setVoiceMode(!voiceMode);
      if (voiceMode) {
        stopListening();
        setVoiceText('');
        setVoiceStatus('');
      }
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "mic",
    size: 18,
    style: {
      color: voiceMode ? 'var(--primary)' : 'var(--muted)'
    }
  }), /*#__PURE__*/React.createElement("span", null, "Dodaj g\u0142osowo")), voiceMode && /*#__PURE__*/React.createElement("div", {
    className: "card voice-input-card"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: 'var(--muted)',
      margin: '0 0 8px'
    }
  }, "Powiedz np. \"Trening z Ann\u0105 jutro o 15:00\""), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: isListening ? stopListening : startListening,
    style: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: isListening ? 'var(--danger, #e53e3e)' : 'var(--primary)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: isListening ? '0 0 0 6px rgba(229,62,62,0.25)' : 'none',
      animation: isListening ? 'pulse-mic 1.5s infinite' : 'none',
      transition: 'all 0.2s'
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "mic",
    size: 28
  })), voiceStatus && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: isListening ? 'var(--primary)' : 'var(--muted)',
      margin: 0,
      textAlign: 'center'
    }
  }, voiceStatus)), voiceText && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    className: "field-input",
    rows: 2,
    value: voiceText,
    onChange: e => setVoiceText(e.target.value),
    placeholder: "Rozpoznany tekst..."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    onClick: handleVoiceSubmit
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "check",
    size: 14
  }), " Dodaj trening"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-outline",
    onClick: () => {
      setVoiceText('');
      setVoiceStatus('');
    }
  }, "Wyczy\u015B\u0107"))), !speechSupported && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: 'var(--danger, #e53e3e)',
      margin: '0 0 8px'
    }
  }, "Rozpoznawanie mowy nie jest dost\u0119pne w tej przegl\u0105darce. Wpisz tekst r\u0119cznie:"), /*#__PURE__*/React.createElement("textarea", {
    className: "field-input",
    rows: 2,
    value: voiceText,
    onChange: e => setVoiceText(e.target.value),
    placeholder: "Wpisz np. Trening z Ann\u0105 jutro o 15:00"
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      marginTop: 8
    },
    onClick: handleVoiceSubmit,
    disabled: !voiceText.trim()
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "check",
    size: 14
  }), " Dodaj trening"))), /*#__PURE__*/React.createElement("div", {
    className: "month-nav"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: prevMonth
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "chevLeft",
    size: 20
  })), /*#__PURE__*/React.createElement("span", {
    className: "month-label"
  }, PL_MONTHS[month], " ", year), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: nextMonth
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "chevRight",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cal-grid"
  }, PL_DAYS_SHORT.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    className: "cal-header"
  }, d)), Array(firstDay).fill(null).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: `e${i}`,
    className: "cal-empty"
  })), Array.from({
    length: daysInMonth
  }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTrainings = trainingsByDate[dateStr] || [];
    const isToday = dateStr === toDateStr();
    const isSelected = dateStr === selectedDate;
    return /*#__PURE__*/React.createElement("button", {
      key: day,
      className: `cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayTrainings.length ? 'has-events' : ''}`,
      onClick: () => setSelectedDate(dateStr)
    }, /*#__PURE__*/React.createElement("span", null, day), dayTrainings.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "cal-dots"
    }, dayTrainings.slice(0, 3).map((t, j) => /*#__PURE__*/React.createElement("span", {
      key: j,
      className: "cal-dot",
      style: {
        background: (TRAINING_STATUSES[t.status] || {}).color || 'var(--forest)'
      }
    }))));
  })), selectedDate && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      marginBottom: 8
    }
  }, selectedDate, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      marginLeft: 12
    },
    onClick: () => setShowForm(true)
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "plus",
    size: 14
  }))), selectedTrainings.length > 0 ? selectedTrainings.map(t => {
    const st = TRAINING_STATUSES[t.status] || TRAINING_STATUSES.scheduled;
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      className: "card",
      style: {
        marginBottom: 8,
        padding: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 14
      }
    }, (getClientName(t.clientId) || '').split(' ')[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--muted)'
      }
    }, t.time || '--:--', " \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: st.color
      }
    }, st.label))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: buildGoogleCalendarUrl(t, getClientName(t.clientId)),
      target: "_blank",
      rel: "noopener",
      className: "icon-btn-sm"
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "externalLink",
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      className: "icon-btn-sm",
      onClick: async () => {
        if (await confirm('Usunąć?')) onDeleteTraining(t.id);
      }
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "trash",
      size: 14,
      style: {
        color: 'var(--danger)'
      }
    })))));
  }) : /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--muted)'
    }
  }, "Brak trening\xF3w w tym dniu")), showForm && /*#__PURE__*/React.createElement(CalendarTrainingForm, {
    clients: clients,
    defaultDate: selectedDate || toDateStr(),
    onSave: t => {
      onSaveTraining(t);
      setShowForm(false);
    },
    onCancel: () => setShowForm(false)
  }), dialog);
}
function CalendarTrainingForm({
  clients,
  defaultDate,
  onSave,
  onCancel
}) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [status, setStatus] = useState('scheduled');
  const [notes, setNotes] = useState('');
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-text",
    onClick: onCancel
  }, "Anuluj"), /*#__PURE__*/React.createElement("span", {
    className: "sheet-title"
  }, "Nowy trening"), /*#__PURE__*/React.createElement("button", {
    className: "btn-text btn-primary-text",
    onClick: () => {
      if (!clientId) return;
      onSave({
        id: uid(),
        clientId,
        date,
        time,
        status,
        notes: notes.trim()
      });
    }
  }, "Zapisz")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-body"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Klient"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: clientId,
    onChange: e => setClientId(e.target.value)
  }, clients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), /*#__PURE__*/React.createElement("div", {
    className: "field-row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Data"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Godzina"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "time",
    value: time,
    onChange: e => setTime(e.target.value)
  }))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Status"), /*#__PURE__*/React.createElement("div", {
    className: "status-grid"
  }, Object.entries(TRAINING_STATUSES).map(([key, st]) => /*#__PURE__*/React.createElement("button", {
    key: key,
    className: `status-btn ${status === key ? 'active' : ''}`,
    style: {
      '--sc': st.color,
      '--sb': st.bg
    },
    onClick: () => setStatus(key)
  }, st.label))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Notatki"), /*#__PURE__*/React.createElement("textarea", {
    className: "field-input",
    rows: 2,
    value: notes,
    onChange: e => setNotes(e.target.value)
  }))));
}

// ========================================================================
// FINANCES VIEW
// ========================================================================
function FinancesView({
  finances,
  onSaveFinance,
  onDeleteFinance,
  clients
}) {
  const [tab, setTab] = useState('income');
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const {
    confirm,
    dialog
  } = useConfirm();
  const filtered = useMemo(() => {
    return finances.filter(f => f.type === tab && (f.date || '').startsWith(month)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [finances, tab, month]);
  const total = filtered.reduce((sum, f) => sum + (f.amount || 0), 0);
  const income = useMemo(() => finances.filter(f => f.type === 'income' && (f.date || '').startsWith(month)).reduce((s, f) => s + (f.amount || 0), 0), [finances, month]);
  const expense = useMemo(() => finances.filter(f => f.type === 'expense' && (f.date || '').startsWith(month)).reduce((s, f) => s + (f.amount || 0), 0), [finances, month]);
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Finanse",
    subtitle: `Bilans: ${formatMoney(income - expense)}`,
    action: "Dodaj",
    onAction: () => setShowForm(true)
  }), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "month",
    value: month,
    onChange: e => setMonth(e.target.value),
    style: {
      marginBottom: 16
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: 'center',
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }
  }, "Przychody"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      color: 'var(--success)'
    }
  }, formatMoney(income))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: 'center',
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }
  }, "Wydatki"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      color: 'var(--danger)'
    }
  }, formatMoney(expense)))), /*#__PURE__*/React.createElement("div", {
    className: "detail-tabs",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: `detail-tab ${tab === 'income' ? 'active' : ''}`,
    onClick: () => setTab('income')
  }, "Przychody"), /*#__PURE__*/React.createElement("button", {
    className: `detail-tab ${tab === 'expense' ? 'active' : ''}`,
    onClick: () => setTab('expense')
  }, "Wydatki")), filtered.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    className: "card",
    style: {
      marginBottom: 8,
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, f.description || f.category), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, f.date, " \xB7 ", f.category)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: f.type === 'income' ? 'var(--success)' : 'var(--danger)',
      whiteSpace: 'nowrap'
    }
  }, f.type === 'income' ? '+' : '-', formatMoney(f.amount)), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn-sm",
    onClick: async () => {
      if (await confirm('Usunąć?')) onDeleteFinance(f.id);
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "trash",
    size: 14,
    style: {
      color: 'var(--danger)'
    }
  })))))), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "dollar",
    size: 40,
    style: {
      color: 'var(--muted)',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("p", null, "Brak ", tab === 'income' ? 'przychodów' : 'wydatków')), showForm && /*#__PURE__*/React.createElement(FinanceFormSheet, {
    type: tab,
    onSave: f => {
      onSaveFinance(f);
      setShowForm(false);
    },
    onCancel: () => setShowForm(false)
  }), dialog);
}
function FinanceFormSheet({
  type,
  onSave,
  onCancel
}) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState((type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0]);
  const [date, setDate] = useState(toDateStr());
  const [description, setDescription] = useState('');
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-text",
    onClick: onCancel
  }, "Anuluj"), /*#__PURE__*/React.createElement("span", {
    className: "sheet-title"
  }, type === 'income' ? 'Nowy przychód' : 'Nowy wydatek'), /*#__PURE__*/React.createElement("button", {
    className: "btn-text btn-primary-text",
    onClick: () => {
      if (!amount) return;
      onSave({
        id: uid(),
        type,
        amount: parseFloat(amount),
        category,
        date,
        description: description.trim()
      });
    }
  }, "Zapisz")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-body"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Kwota (z\u0142)"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "number",
    step: "0.01",
    value: amount,
    onChange: e => setAmount(e.target.value),
    placeholder: "0",
    autoFocus: true,
    style: {
      fontSize: 24,
      textAlign: 'center'
    }
  }), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Kategoria"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: category,
    onChange: e => setCategory(e.target.value)
  }, categories.map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  }, c))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Data"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value)
  }), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Opis"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    value: description,
    onChange: e => setDescription(e.target.value),
    placeholder: "Opcjonalny opis"
  }))));
}

// ========================================================================
// DASHBOARD VIEW
// ========================================================================
function DashboardView({
  clients,
  trainings,
  finances,
  clientPackages
}) {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const activeClients = clients.length;
  const totalThisMonth = trainings.filter(t => (t.date || '').startsWith(currentMonthStr)).length;
  const completedThisMonth = trainings.filter(t => (t.date || '').startsWith(currentMonthStr) && t.status === 'completed').length;
  const monthRevenue = finances.filter(f => f.type === 'income' && (f.date || '').startsWith(currentMonthStr)).reduce((s, f) => s + (f.amount || 0), 0);
  const monthExpenses = finances.filter(f => f.type === 'expense' && (f.date || '').startsWith(currentMonthStr)).reduce((s, f) => s + (f.amount || 0), 0);
  const completionRate = totalThisMonth > 0 ? Math.round(completedThisMonth / totalThisMonth * 100) : 0;

  // Revenue chart data — last 6 months
  const revenueChart = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rev = finances.filter(f => f.type === 'income' && (f.date || '').startsWith(ms)).reduce((s, f) => s + (f.amount || 0), 0);
      months.push({
        label: PL_MONTHS[d.getMonth()].slice(0, 3),
        value: rev
      });
    }
    return months;
  }, [finances]);
  const maxRev = Math.max(...revenueChart.map(m => m.value), 1);

  // Upcoming trainings
  const todayStr = toDateStr();
  const upcoming = useMemo(() => {
    return trainings.filter(t => (t.date || '') >= todayStr && t.status === 'scheduled').sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || ''))).slice(0, 5);
  }, [trainings, todayStr]);
  const getClientName = id => clients.find(c => c.id === id)?.name || '?';
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Panel",
    subtitle: PL_MONTHS[now.getMonth()] + ' ' + now.getFullYear()
  }), /*#__PURE__*/React.createElement("div", {
    className: "kpi-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-val",
    style: {
      color: 'var(--forest)'
    }
  }, activeClients), /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, "Klienci")), /*#__PURE__*/React.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-val",
    style: {
      color: 'var(--primary)'
    }
  }, totalThisMonth), /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, "Treningi")), /*#__PURE__*/React.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-val",
    style: {
      color: 'var(--success)'
    }
  }, formatMoney(monthRevenue)), /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, "Przych\xF3d")), /*#__PURE__*/React.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-val",
    style: {
      color: completionRate >= 70 ? 'var(--success)' : 'var(--warning)'
    }
  }, completionRate, "%"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, "Frekwencja"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      margin: '0 0 12px'
    }
  }, "Przychody \u2014 6 miesi\u0119cy"), /*#__PURE__*/React.createElement("div", {
    className: "mini-chart"
  }, revenueChart.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "chart-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "chart-bar-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "chart-bar",
    style: {
      height: `${maxRev > 0 ? m.value / maxRev * 100 : 0}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "chart-label"
  }, m.label), m.value > 0 && /*#__PURE__*/React.createElement("div", {
    className: "chart-val"
  }, Math.round(m.value / 1000), "k"))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      margin: '0 0 8px'
    }
  }, "Bilans miesi\u0105ca"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", null, "Przychody:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success)',
      fontWeight: 500
    }
  }, "+", formatMoney(monthRevenue))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 14,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, "Wydatki:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--danger)',
      fontWeight: 500
    }
  }, "-", formatMoney(monthExpenses))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border)',
      marginTop: 8,
      paddingTop: 8,
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 15,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("span", null, "Zysk:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: monthRevenue - monthExpenses >= 0 ? 'var(--success)' : 'var(--danger)'
    }
  }, formatMoney(monthRevenue - monthExpenses)))), upcoming.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      margin: '0 0 8px'
    }
  }, "Najbli\u017Csze treningi"), upcoming.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      borderBottom: '1px solid var(--border-light)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, (getClientName(t.clientId) || '').split(' ')[0]), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, t.date, " ", t.time)))));
}

// ========================================================================
// BILLING VIEW
// ========================================================================
function BillingView({
  clients,
  packages,
  clientPackages,
  onSaveClientPackage,
  onDeleteClientPackage,
  trainings,
  onBack
}) {
  const [showForm, setShowForm] = useState(false);
  const {
    confirm,
    dialog
  } = useConfirm();
  const getClientName = id => clients.find(c => c.id === id)?.name || '?';
  const getPackageName = id => packages.find(p => p.id === id)?.name || '?';
  const sorted = useMemo(() => [...clientPackages].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')), [clientPackages]);
  const getUsedSessions = cp => {
    return trainings.filter(t => t.clientId === cp.clientId && t.status === 'completed' && (t.date || '') >= (cp.startDate || '') && (t.date || '') <= (cp.endDate || '9999')).length;
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Rozliczenia",
    onBack: onBack,
    backLabel: "Wi\u0119cej",
    action: "Dodaj",
    onAction: () => setShowForm(true)
  }), sorted.map(cp => {
    const pkg = packages.find(p => p.id === cp.packageId);
    const used = getUsedSessions(cp);
    const total = pkg?.sessions || 1;
    const pct = Math.min(100, used / total * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: cp.id,
      className: "card",
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 14
      }
    }, getClientName(cp.clientId)), /*#__PURE__*/React.createElement("button", {
      className: "icon-btn-sm",
      onClick: async () => {
        if (await confirm('Usunąć pakiet klienta?')) onDeleteClientPackage(cp.id);
      }
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "trash",
      size: 14,
      style: {
        color: 'var(--danger)'
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--muted)',
        marginBottom: 4
      }
    }, getPackageName(cp.packageId)), /*#__PURE__*/React.createElement("div", {
      className: "progress-bar",
      style: {
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "progress-fill",
      style: {
        width: `${pct}%`,
        background: pct >= 100 ? 'var(--danger)' : 'var(--forest)'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: 'var(--muted)'
      }
    }, /*#__PURE__*/React.createElement("span", null, used, "/", total, " sesji"), /*#__PURE__*/React.createElement("span", null, cp.startDate, " \u2014 ", cp.endDate || '?')), cp.paid && /*#__PURE__*/React.createElement("span", {
      className: "badge",
      style: {
        marginTop: 6,
        background: 'var(--success)',
        color: '#fff',
        fontSize: 10
      }
    }, "Op\u0142acony"));
  }), sorted.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("p", null, "Brak pakiet\xF3w klient\xF3w")), showForm && /*#__PURE__*/React.createElement(BillingFormSheet, {
    clients: clients,
    packages: packages,
    onSave: cp => {
      onSaveClientPackage(cp);
      setShowForm(false);
    },
    onCancel: () => setShowForm(false)
  }), dialog);
}
function BillingFormSheet({
  clients,
  packages,
  onSave,
  onCancel
}) {
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
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-text",
    onClick: onCancel
  }, "Anuluj"), /*#__PURE__*/React.createElement("span", {
    className: "sheet-title"
  }, "Nowy pakiet klienta"), /*#__PURE__*/React.createElement("button", {
    className: "btn-text btn-primary-text",
    onClick: () => {
      if (!clientId || !packageId) return;
      onSave({
        id: uid(),
        clientId,
        packageId,
        startDate,
        endDate,
        paid,
        usedSessions: 0
      });
    }
  }, "Zapisz")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-body"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Klient"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: clientId,
    onChange: e => setClientId(e.target.value)
  }, clients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Pakiet"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: packageId,
    onChange: e => setPackageId(e.target.value)
  }, packages.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name, " \u2014 ", formatMoney(p.price)))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Data rozpocz\u0119cia"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "date",
    value: startDate,
    onChange: e => setStartDate(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--muted)',
      marginTop: 4
    }
  }, "Wa\u017Cny do: ", endDate), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
      fontSize: 14,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: paid,
    onChange: e => setPaid(e.target.checked)
  }), "Op\u0142acony"))));
}

// ========================================================================
// PACKAGES VIEW
// ========================================================================
function PackagesView({
  packages,
  onSavePackage,
  onDeletePackage,
  onBack
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const {
    confirm,
    dialog
  } = useConfirm();
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Pakiety",
    onBack: onBack,
    backLabel: "Wi\u0119cej",
    action: "Dodaj",
    onAction: () => {
      setEditing(null);
      setShowForm(true);
    }
  }), packages.map(pkg => /*#__PURE__*/React.createElement("div", {
    key: pkg.id,
    className: "card",
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, pkg.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, pkg.sessions, " sesji \xB7 ", pkg.validDays, " dni \xB7 ", formatMoney(pkg.price))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn-sm",
    onClick: () => {
      setEditing(pkg);
      setShowForm(true);
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "edit",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn-sm",
    onClick: async () => {
      if (await confirm('Usunąć pakiet?')) onDeletePackage(pkg.id);
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "trash",
    size: 14,
    style: {
      color: 'var(--danger)'
    }
  })))))), showForm && /*#__PURE__*/React.createElement(PackageFormSheet, {
    pkg: editing,
    onSave: p => {
      onSavePackage(p);
      setShowForm(false);
      setEditing(null);
    },
    onCancel: () => {
      setShowForm(false);
      setEditing(null);
    }
  }), dialog);
}
function PackageFormSheet({
  pkg,
  onSave,
  onCancel
}) {
  const [name, setName] = useState(pkg?.name || '');
  const [sessions, setSessions] = useState(pkg?.sessions || 1);
  const [price, setPrice] = useState(pkg?.price || 0);
  const [validDays, setValidDays] = useState(pkg?.validDays || 30);
  const [type, setType] = useState(pkg?.type || 'personal');
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-text",
    onClick: onCancel
  }, "Anuluj"), /*#__PURE__*/React.createElement("span", {
    className: "sheet-title"
  }, pkg ? 'Edytuj pakiet' : 'Nowy pakiet'), /*#__PURE__*/React.createElement("button", {
    className: "btn-text btn-primary-text",
    onClick: () => {
      if (!name.trim()) return;
      onSave({
        id: pkg?.id || uid(),
        name: name.trim(),
        sessions: parseInt(sessions),
        price: parseFloat(price),
        validDays: parseInt(validDays),
        type
      });
    }
  }, "Zapisz")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-body"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Nazwa"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "Nazwa pakietu",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Sesje"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "number",
    value: sessions,
    onChange: e => setSessions(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Cena (z\u0142)"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "number",
    value: price,
    onChange: e => setPrice(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Dni wa\u017Cno\u015Bci"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    type: "number",
    value: validDays,
    onChange: e => setValidDays(e.target.value)
  }))), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Typ"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: type,
    onChange: e => setType(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "personal"
  }, "Personalny"), /*#__PURE__*/React.createElement("option", {
    value: "group"
  }, "Grupowy"), /*#__PURE__*/React.createElement("option", {
    value: "diet"
  }, "Dietetyczny"), /*#__PURE__*/React.createElement("option", {
    value: "combo"
  }, "Combo")))));
}

// ========================================================================
// BACKUP VIEW
// ========================================================================
function BackupView({
  clients,
  products,
  templates,
  trainings,
  finances,
  clientPackages,
  packages,
  onImport,
  onBack
}) {
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();
  const exportData = () => {
    const data = {
      clients,
      products,
      templates,
      trainings,
      finances,
      clientPackages,
      packages,
      exportDate: new Date().toISOString(),
      version: 2
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio-trenera-backup-${toDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
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
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Backup",
    onBack: onBack,
    backLabel: "Wi\u0119cej"
  }), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      margin: '0 0 8px'
    }
  }, "Eksport danych"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--muted)',
      margin: '0 0 12px'
    }
  }, "Pobierz plik JSON ze wszystkimi danymi: klienci, diety, treningi, finanse, pakiety."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-full",
    onClick: exportData
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "download",
    size: 18
  }), " Pobierz backup")), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      margin: '0 0 8px'
    }
  }, "Import danych"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--muted)',
      margin: '0 0 12px'
    }
  }, "Zaimportuj dane z pliku backupu. Istniej\u0105ce dane zostan\u0105 uzupe\u0142nione."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-full btn-ghost",
    onClick: () => fileRef.current?.click()
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "upload",
    size: 18
  }), " Wybierz plik"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".json",
    onChange: handleImport,
    style: {
      display: 'none'
    }
  }), importResult && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--forest)',
      marginTop: 8
    }
  }, importResult)), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginTop: 16,
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Statystyki:"), /*#__PURE__*/React.createElement("br", null), "Klienci: ", clients.length, " \xB7 Treningi: ", trainings.length, " \xB7 Finanse: ", finances.length, /*#__PURE__*/React.createElement("br", null), "Pakiety: ", packages.length, " \xB7 Szablony: ", templates.length, " \xB7 Produkty: ", products.length));
}

// ========================================================================
// ABOUT VIEW
// ========================================================================
function AboutView({
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "O aplikacji",
    onBack: onBack,
    backLabel: "Wi\u0119cej"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '40px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 8
    }
  }, "\uD83C\uDFCB\uFE0F\u200D\u2640\uFE0F"), /*#__PURE__*/React.createElement("h2", {
    className: "app-title",
    style: {
      margin: '0 0 4px'
    }
  }, "Studio Trenera MT"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--muted)',
      margin: '0 0 16px'
    }
  }, "Ma\u0142gorzata Truszkowska \xB7 \u0141om\u017Ca"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.6,
      maxWidth: 300,
      margin: '0 auto',
      color: 'var(--text-secondary)'
    }
  }, "Kompletne narz\u0119dzie do zarz\u0105dzania treningami personalnymi, dietami, finansami i klientami."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "PWA v2.0 \xB7 Zoptymalizowana pod iPhone")));
}

// ========================================================================
// PRODUCTS VIEW (simplified)
// ========================================================================
function ProductsView({
  products,
  onSave,
  onBack
}) {
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
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Baza produkt\xF3w",
    subtitle: `${products.length} produktów`,
    onBack: onBack,
    backLabel: "Wi\u0119cej"
  }), /*#__PURE__*/React.createElement("div", {
    className: "search-bar"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "search",
    size: 16,
    style: {
      color: 'var(--muted)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Szukaj produktu...",
    value: search,
    onChange: e => setSearch(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "category-scroll"
  }, categories.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    className: `cat-chip ${category === c ? 'active' : ''}`,
    onClick: () => setCategory(c)
  }, c === 'all' ? 'Wszystkie' : c))), /*#__PURE__*/React.createElement("div", {
    className: "product-list"
  }, filtered.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "product-row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, p.category)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      fontSize: 12,
      color: 'var(--muted)',
      whiteSpace: 'nowrap'
    }
  }, p.kcal, "kcal \xB7 B:", p.protein, " W:", p.carbs, " T:", p.fat)))));
}

// ========================================================================
// TEMPLATES VIEW (simplified)
// ========================================================================
function TemplatesView({
  templates,
  onDelete,
  products,
  onBack
}) {
  const {
    confirm,
    dialog
  } = useConfirm();
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Szablony diet",
    subtitle: `${templates.length} szablonów`,
    onBack: onBack,
    backLabel: "Wi\u0119cej"
  }), templates.map(tpl => /*#__PURE__*/React.createElement("div", {
    key: tpl.id,
    className: "card",
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, tpl.name || 'Szablon'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString('pl-PL') : '')), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn-sm",
    onClick: async () => {
      if (await confirm('Usunąć szablon?')) onDelete(tpl.id);
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "trash",
    size: 14,
    style: {
      color: 'var(--danger)'
    }
  }))))), templates.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("p", null, "Brak szablon\xF3w diet")), dialog);
}

// ========================================================================
// RECIPES VIEW (simplified)
// ========================================================================
function RecipesView({
  recipes,
  products,
  onBack
}) {
  const [expanded, setExpanded] = useState(null);
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Przepisy",
    subtitle: `${(recipes || []).length} przepisów`,
    onBack: onBack,
    backLabel: "Wi\u0119cej"
  }), (recipes || []).map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "card",
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "recipe-header",
    onClick: () => setExpanded(expanded === i ? null : i)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, r.name), /*#__PURE__*/React.createElement(Icon2, {
    name: expanded === i ? 'chevDown' : 'chevRight',
    size: 16,
    style: {
      color: 'var(--muted)'
    }
  })), expanded === i && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, r.ingredients && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Sk\u0142adniki:"), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: '4px 0',
      paddingLeft: 20
    }
  }, r.ingredients.map((ing, j) => {
    const prod = products.find(p => p.id === ing.productId);
    return /*#__PURE__*/React.createElement("li", {
      key: j
    }, prod?.name || '?', " \u2014 ", ing.grams, "g");
  }))), r.instructions && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Przygotowanie:"), /*#__PURE__*/React.createElement("br", null), r.instructions)))), (recipes || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("p", null, "Brak przepis\xF3w")));
}

// ========================================================================
// PHOTOS GALLERY VIEW
// ========================================================================
function PhotosGalleryView({
  clients,
  onBack
}) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    photoDB.getAll().then(p => {
      setPhotos(p);
      setLoading(false);
    }).catch(() => setLoading(false));
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
  if (loading) return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      color: 'var(--muted)'
    }
  }, "\u0141adowanie..."));
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Galeria zdj\u0119\u0107",
    subtitle: `${photos.length} zdjęć`,
    onBack: onBack,
    backLabel: "Wi\u0119cej"
  }), grouped.map(([name, pics]) => /*#__PURE__*/React.createElement("div", {
    key: name,
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      margin: '0 0 8px'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "photo-grid"
  }, pics.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "photo-thumb"
  }, /*#__PURE__*/React.createElement("img", {
    src: p.data,
    alt: "",
    loading: "lazy"
  }), /*#__PURE__*/React.createElement("div", {
    className: "photo-date"
  }, p.date)))))), photos.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("p", null, "Brak zdj\u0119\u0107. Dodaj zdj\u0119cia z poziomu profilu klienta.")));
}

// ========================================================================
// DIET PLAN VIEW — create diets for clients
// ========================================================================
function DietPlanView({
  clients,
  products,
  onBack
}) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [plans, setPlans] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const {
    confirm,
    dialog
  } = useConfirm();
  useEffect(() => {
    try {
      const list = storage.list('dietplan:');
      const loaded = [];
      if (list?.keys) {
        for (const key of list.keys) {
          try {
            const r = storage.get(key);
            if (r?.value) loaded.push(JSON.parse(r.value));
          } catch {}
        }
      }
      setPlans(loaded);
    } catch {}
  }, []);
  const savePlan = plan => {
    try {
      storage.set('dietplan:' + plan.id, JSON.stringify(plan));
      setPlans(prev => {
        const idx = prev.findIndex(p => p.id === plan.id);
        if (idx >= 0) {
          const n = [...prev];
          n[idx] = plan;
          return n;
        }
        return [...prev, plan];
      });
    } catch {}
    setShowCreator(false);
    setEditingPlan(null);
  };
  const deletePlan = async id => {
    if (await confirm('Usunąć ten plan diety?')) {
      storage.delete('dietplan:' + id);
      setPlans(prev => prev.filter(p => p.id !== id));
    }
  };
  const clientPlans = selectedClientId ? plans.filter(p => p.clientId === selectedClientId) : plans;
  const getClientName = id => clients.find(c => c.id === id)?.name || '?';
  if (showCreator || editingPlan) {
    return React.createElement(DietCreator, {
      plan: editingPlan,
      clients,
      products,
      onSave: savePlan,
      onCancel: () => {
        setShowCreator(false);
        setEditingPlan(null);
      }
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, dialog, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Plany dietetyczne",
    subtitle: `${plans.length} planów`,
    onBack: onBack,
    backLabel: "Wi\u0119cej",
    action: "Dodaj",
    onAction: () => setShowCreator(true)
  }), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: selectedClientId,
    onChange: e => setSelectedClientId(e.target.value),
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Wszystkie klientki"), clients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), clientPlans.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("p", null, "Brak plan\xF3w dietetycznych"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, "Kliknij + aby utworzy\u0107 pierwszy plan")), clientPlans.map(plan => {
    const totalKcal = (plan.meals || []).reduce((sum, meal) => sum + (meal.items || []).reduce((s, item) => s + (item.kcal || 0), 0), 0);
    return /*#__PURE__*/React.createElement("div", {
      key: plan.id,
      className: "card",
      style: {
        marginBottom: 8,
        padding: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 15
      }
    }, plan.name || 'Plan diety'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--muted)',
        marginTop: 2
      }
    }, getClientName(plan.clientId), " \xB7 ", Math.round(totalKcal), " kcal/dzie\u0144"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--muted)'
      }
    }, "Cel: ", GOALS.find(g => g.value === plan.goal)?.label || plan.goal)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      onClick: () => setEditingPlan(plan)
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "edit",
      size: 16
    })), /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      onClick: () => deletePlan(plan.id)
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "trash",
      size: 16,
      style: {
        color: 'var(--danger, #c65d3e)'
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4
      }
    }, (plan.meals || []).map((meal, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        fontSize: 11,
        background: 'var(--bg)',
        padding: '2px 8px',
        borderRadius: 10,
        color: 'var(--text-secondary)'
      }
    }, meal.name))));
  }));
}

// ========================================================================
// DIET CREATOR — calculate needs + build meals
// ========================================================================
function DietCreator({
  plan,
  clients,
  products,
  onSave,
  onCancel
}) {
  const isEdit = !!plan;
  const [clientId, setClientId] = useState(plan?.clientId || '');
  const [planName, setPlanName] = useState(plan?.name || '');
  const [goal, setGoal] = useState(plan?.goal || 'maintenance');
  const [activityLevel, setActivityLevel] = useState(plan?.activityLevel || 1.55);
  const [meals, setMeals] = useState(plan?.meals || MEAL_TYPES.map(name => ({
    name,
    items: []
  })));
  const [editingMealIdx, setEditingMealIdx] = useState(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const client = clients.find(c => c.id === clientId);

  // Mifflin-St Jeor BMR
  const bmr = useMemo(() => {
    if (!client) return 0;
    const w = parseFloat(client.weight) || 65;
    const h = parseFloat(client.height) || 165;
    const a = parseInt(client.age) || 30;
    const sex = (client.sex || client.gender || 'female').toLowerCase();
    if (sex === 'male' || sex === 'm' || sex === 'mężczyzna') return 10 * w + 6.25 * h - 5 * a + 5;
    return 10 * w + 6.25 * h - 5 * a - 161;
  }, [client]);
  const tdee = Math.round(bmr * activityLevel);
  const goalAdjust = GOALS.find(g => g.value === goal)?.adjust || 0;
  const targetKcal = Math.round(tdee * (1 + goalAdjust));
  const macros = useMemo(() => {
    let proteinPct, carbsPct, fatPct;
    if (goal === 'reduction') {
      proteinPct = 0.35;
      fatPct = 0.25;
      carbsPct = 0.40;
    } else if (goal === 'mass' || goal === 'lean_mass') {
      proteinPct = 0.25;
      fatPct = 0.25;
      carbsPct = 0.50;
    } else {
      proteinPct = 0.30;
      fatPct = 0.25;
      carbsPct = 0.45;
    }
    return {
      protein: Math.round(targetKcal * proteinPct / 4),
      carbs: Math.round(targetKcal * carbsPct / 4),
      fat: Math.round(targetKcal * fatPct / 9)
    };
  }, [targetKcal, goal]);
  const totals = useMemo(() => {
    let kcal = 0,
      protein = 0,
      carbs = 0,
      fat = 0;
    meals.forEach(meal => {
      (meal.items || []).forEach(item => {
        kcal += item.kcal || 0;
        protein += item.protein || 0;
        carbs += item.carbs || 0;
        fat += item.fat || 0;
      });
    });
    return {
      kcal: Math.round(kcal),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat)
    };
  }, [meals]);
  const addProductToMeal = (product, grams) => {
    if (editingMealIdx === null) return;
    const g = parseFloat(grams) || 100;
    const factor = g / 100;
    const item = {
      productId: product.id,
      name: product.name,
      grams: g,
      kcal: Math.round((product.kcal || 0) * factor),
      protein: Math.round((product.protein || 0) * factor * 10) / 10,
      carbs: Math.round((product.carbs || 0) * factor * 10) / 10,
      fat: Math.round((product.fat || 0) * factor * 10) / 10
    };
    setMeals(prev => {
      const n = [...prev];
      n[editingMealIdx] = {
        ...n[editingMealIdx],
        items: [...(n[editingMealIdx].items || []), item]
      };
      return n;
    });
    setShowProductPicker(false);
    setProdSearch('');
  };
  const removeItemFromMeal = (mealIdx, itemIdx) => {
    setMeals(prev => {
      const n = [...prev];
      n[mealIdx] = {
        ...n[mealIdx],
        items: n[mealIdx].items.filter((_, i) => i !== itemIdx)
      };
      return n;
    });
  };
  const handleSave = () => {
    if (!clientId) return;
    onSave({
      id: plan?.id || uid(),
      clientId,
      name: planName || 'Plan diety',
      goal,
      activityLevel,
      targetKcal,
      macros,
      meals,
      createdAt: plan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };
  const filteredProducts = useMemo(() => {
    if (!prodSearch) return products.slice(0, 30);
    const q = prodSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [products, prodSearch]);
  if (showProductPicker) {
    return /*#__PURE__*/React.createElement("div", {
      className: "page-content"
    }, /*#__PURE__*/React.createElement(PageHeader, {
      title: "Dodaj produkt",
      onBack: () => {
        setShowProductPicker(false);
        setProdSearch('');
      },
      backLabel: "Wr\xF3\u0107"
    }), /*#__PURE__*/React.createElement("div", {
      className: "search-bar"
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "search",
      size: 16,
      style: {
        color: 'var(--muted)'
      }
    }), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "Szukaj produktu...",
      value: prodSearch,
      onChange: e => setProdSearch(e.target.value),
      autoFocus: true
    })), filteredProducts.map(p => /*#__PURE__*/React.createElement(ProductPickerRow, {
      key: p.id,
      product: p,
      onAdd: addProductToMeal
    })), filteredProducts.length === 0 && /*#__PURE__*/React.createElement("div", {
      className: "empty-state"
    }, /*#__PURE__*/React.createElement("p", null, "Nie znaleziono produkt\xF3w")));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: isEdit ? 'Edytuj dietę' : 'Nowa dieta',
    onBack: onCancel,
    backLabel: "Anuluj"
  }), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Klientka"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: clientId,
    onChange: e => setClientId(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Wybierz..."), clients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      marginTop: 12
    }
  }, "Nazwa planu"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    value: planName,
    onChange: e => setPlanName(e.target.value),
    placeholder: "np. Dieta redukcyjna 1800 kcal"
  }), /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      marginTop: 12
    }
  }, "Cel"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: goal,
    onChange: e => setGoal(e.target.value)
  }, GOALS.map(g => /*#__PURE__*/React.createElement("option", {
    key: g.value,
    value: g.value
  }, g.label))), /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      marginTop: 12
    }
  }, "Poziom aktywno\u015Bci"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: activityLevel,
    onChange: e => setActivityLevel(parseFloat(e.target.value))
  }, ACTIVITY_LEVELS.map(a => /*#__PURE__*/React.createElement("option", {
    key: a.value,
    value: a.value
  }, a.label, " \u2014 ", a.hint))), client && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginTop: 12,
      padding: 12,
      background: 'var(--cream, var(--bg))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 8
    }
  }, "Wyliczone zapotrzebowanie"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("div", null, "BMR: ", /*#__PURE__*/React.createElement("strong", null, Math.round(bmr), " kcal")), /*#__PURE__*/React.createElement("div", null, "TDEE: ", /*#__PURE__*/React.createElement("strong", null, tdee, " kcal")), /*#__PURE__*/React.createElement("div", null, "Cel: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: GOALS.find(g => g.value === goal)?.color
    }
  }, targetKcal, " kcal")), /*#__PURE__*/React.createElement("div", null, "B: ", macros.protein, "g \xB7 W: ", macros.carbs, "g \xB7 T: ", macros.fat, "g")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, "Aktualnie: ", totals.kcal, " kcal"), /*#__PURE__*/React.createElement("span", null, targetKcal > 0 ? Math.round(totals.kcal / targetKcal * 100) : 0, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--border)',
      borderRadius: 3,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${targetKcal > 0 ? Math.min(100, totals.kcal / targetKcal * 100) : 0}%`,
      background: totals.kcal > targetKcal * 1.05 ? '#c65d3e' : 'var(--primary)',
      borderRadius: 3,
      transition: 'width 0.3s'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)',
      marginTop: 4
    }
  }, "B: ", totals.protein, "g/", macros.protein, "g \xB7 W: ", totals.carbs, "g/", macros.carbs, "g \xB7 T: ", totals.fat, "g/", macros.fat, "g"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginBottom: 8
    }
  }, "Posi\u0142ki"), meals.map((meal, mIdx) => {
    const mealKcal = (meal.items || []).reduce((s, i) => s + (i.kcal || 0), 0);
    return /*#__PURE__*/React.createElement("div", {
      key: mIdx,
      className: "card",
      style: {
        marginBottom: 8,
        padding: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500,
        fontSize: 14
      }
    }, meal.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--muted)'
      }
    }, Math.round(mealKcal), " kcal")), (meal.items || []).map((item, iIdx) => /*#__PURE__*/React.createElement("div", {
      key: iIdx,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
        fontSize: 13,
        borderTop: '1px solid var(--border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, item.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--muted)'
      }
    }, item.grams, "g \xB7 ", item.kcal, "kcal \xB7 B:", item.protein, " W:", item.carbs, " T:", item.fat)), /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      onClick: () => removeItemFromMeal(mIdx, iIdx),
      style: {
        marginLeft: 4
      }
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "x",
      size: 14,
      style: {
        color: 'var(--danger, #c65d3e)'
      }
    })))), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-sm btn-outline",
      style: {
        marginTop: 6,
        width: '100%'
      },
      onClick: () => {
        setEditingMealIdx(mIdx);
        setShowProductPicker(true);
      }
    }, /*#__PURE__*/React.createElement(Icon2, {
      name: "plus",
      size: 14
    }), " Dodaj produkt"));
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: '100%',
      marginTop: 12
    },
    onClick: handleSave,
    disabled: !clientId
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "save",
    size: 16
  }), " Zapisz diet\u0119"));
}
function ProductPickerRow({
  product,
  onAdd
}) {
  const [grams, setGrams] = useState('100');
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 4,
      padding: '8px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, product.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)',
      marginBottom: 6
    }
  }, product.kcal, "kcal/100g \xB7 B:", product.protein, " W:", product.carbs, " T:", product.fat), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    className: "field-input",
    style: {
      width: 80
    },
    value: grams,
    onChange: e => setGrams(e.target.value),
    placeholder: "g"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, "g"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-primary",
    onClick: () => onAdd(product, grams)
  }, "Dodaj")));
}

// ========================================================================
// WORKOUT PLAN VIEW — create training plans for clients
// ========================================================================
function WorkoutPlanView({
  clients,
  onBack
}) {
  const [plans, setPlans] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showCreator, setShowCreator] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const {
    confirm,
    dialog
  } = useConfirm();
  useEffect(() => {
    try {
      const list = storage.list('workoutplan:');
      const loaded = [];
      if (list?.keys) {
        for (const key of list.keys) {
          try {
            const r = storage.get(key);
            if (r?.value) loaded.push(JSON.parse(r.value));
          } catch {}
        }
      }
      setPlans(loaded);
    } catch {}
  }, []);
  const savePlan = plan => {
    storage.set('workoutplan:' + plan.id, JSON.stringify(plan));
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === plan.id);
      if (idx >= 0) {
        const n = [...prev];
        n[idx] = plan;
        return n;
      }
      return [...prev, plan];
    });
    setShowCreator(false);
    setEditingPlan(null);
  };
  const deletePlan = async id => {
    if (await confirm('Usunąć ten plan treningowy?')) {
      storage.delete('workoutplan:' + id);
      setPlans(prev => prev.filter(p => p.id !== id));
    }
  };
  const clientPlans = selectedClientId ? plans.filter(p => p.clientId === selectedClientId) : plans;
  const getClientName = id => clients.find(c => c.id === id)?.name || '?';
  if (showCreator || editingPlan) {
    return React.createElement(WorkoutCreator, {
      plan: editingPlan,
      clients,
      onSave: savePlan,
      onCancel: () => {
        setShowCreator(false);
        setEditingPlan(null);
      }
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, dialog, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Plany treningowe",
    subtitle: `${plans.length} planów`,
    onBack: onBack,
    backLabel: "Wi\u0119cej",
    action: "Dodaj",
    onAction: () => setShowCreator(true)
  }), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: selectedClientId,
    onChange: e => setSelectedClientId(e.target.value),
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Wszystkie klientki"), clients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), clientPlans.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("p", null, "Brak plan\xF3w treningowych"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, "Kliknij + aby utworzy\u0107 pierwszy plan")), clientPlans.map(plan => /*#__PURE__*/React.createElement("div", {
    key: plan.id,
    className: "card",
    style: {
      marginBottom: 8,
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'none',
      border: 'none',
      padding: 0,
      textAlign: 'left',
      cursor: 'pointer',
      flex: 1
    },
    onClick: () => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, plan.name || 'Plan treningowy'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)',
      marginTop: 2
    }
  }, getClientName(plan.clientId), " \xB7 ", (plan.days || []).length, " dni treningowych")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => setEditingPlan(plan)
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "edit",
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => deletePlan(plan.id)
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "trash",
    size: 16,
    style: {
      color: 'var(--danger, #c65d3e)'
    }
  })))), expandedPlan === plan.id && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, (plan.days || []).map((day, dIdx) => /*#__PURE__*/React.createElement("div", {
    key: dIdx,
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 13,
      color: 'var(--primary)',
      marginBottom: 4
    }
  }, day.name), (day.exercises || []).map((ex, eIdx) => /*#__PURE__*/React.createElement("div", {
    key: eIdx,
    style: {
      fontSize: 13,
      padding: '4px 0',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", null, ex.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, ex.sets, "\xD7", ex.reps, " ", ex.tempo ? `tempo ${ex.tempo}` : '', " ", ex.rest ? `· odp. ${ex.rest}s` : '')), ex.yt && /*#__PURE__*/React.createElement("a", {
    href: ex.yt,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: '#c00',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "play",
    size: 16
  }))))))))));
}

// ========================================================================
// WORKOUT CREATOR — build training days with exercises
// ========================================================================
function WorkoutCreator({
  plan,
  clients,
  onSave,
  onCancel
}) {
  const isEdit = !!plan;
  const [clientId, setClientId] = useState(plan?.clientId || '');
  const [planName, setPlanName] = useState(plan?.name || '');
  const [days, setDays] = useState(plan?.days || []);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [editingDayIdx, setEditingDayIdx] = useState(null);
  const [newDayName, setNewDayName] = useState('');
  const [swapTarget, setSwapTarget] = useState(null);
  const addDay = () => {
    const name = newDayName.trim() || `Dzień ${days.length + 1}`;
    setDays(prev => [...prev, {
      name,
      exercises: []
    }]);
    setNewDayName('');
  };
  const removeDay = idx => {
    setDays(prev => prev.filter((_, i) => i !== idx));
  };
  const addExerciseToDay = exercise => {
    if (editingDayIdx === null) return;
    const ex = {
      exerciseId: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle,
      yt: exercise.yt,
      sets: 3,
      reps: '12',
      tempo: '',
      rest: 60
    };
    setDays(prev => {
      const n = [...prev];
      n[editingDayIdx] = {
        ...n[editingDayIdx],
        exercises: [...n[editingDayIdx].exercises, ex]
      };
      return n;
    });
    setShowExercisePicker(false);
  };
  const swapExercise = newExercise => {
    if (!swapTarget) return;
    const {
      dayIdx,
      exIdx
    } = swapTarget;
    setDays(prev => {
      const n = [...prev];
      const oldEx = n[dayIdx].exercises[exIdx];
      n[dayIdx].exercises[exIdx] = {
        ...oldEx,
        exerciseId: newExercise.id,
        name: newExercise.name,
        muscle: newExercise.muscle,
        yt: newExercise.yt
      };
      return n;
    });
    setSwapTarget(null);
  };
  const removeExercise = (dayIdx, exIdx) => {
    setDays(prev => {
      const n = [...prev];
      n[dayIdx] = {
        ...n[dayIdx],
        exercises: n[dayIdx].exercises.filter((_, i) => i !== exIdx)
      };
      return n;
    });
  };
  const updateExercise = (dayIdx, exIdx, field, value) => {
    setDays(prev => {
      const n = [...prev];
      n[dayIdx].exercises[exIdx] = {
        ...n[dayIdx].exercises[exIdx],
        [field]: value
      };
      return n;
    });
  };
  const handleSave = () => {
    if (!clientId) return;
    onSave({
      id: plan?.id || uid(),
      clientId,
      name: planName || 'Plan treningowy',
      days,
      createdAt: plan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };
  if (showExercisePicker || swapTarget) {
    const filterMuscle = swapTarget?.muscle || null;
    return React.createElement(ExercisePicker, {
      filterMuscle,
      onSelect: swapTarget ? swapExercise : addExerciseToDay,
      onCancel: () => {
        setShowExercisePicker(false);
        setSwapTarget(null);
      }
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: isEdit ? 'Edytuj plan' : 'Nowy plan treningowy',
    onBack: onCancel,
    backLabel: "Anuluj"
  }), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Klientka"), /*#__PURE__*/React.createElement("select", {
    className: "field-input",
    value: clientId,
    onChange: e => setClientId(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Wybierz..."), clients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      marginTop: 12
    }
  }, "Nazwa planu"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    value: planName,
    onChange: e => setPlanName(e.target.value),
    placeholder: "np. Plan A \u2014 G\xF3ra/D\xF3\u0142"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginBottom: 8
    }
  }, "Dni treningowe"), days.map((day, dIdx) => /*#__PURE__*/React.createElement("div", {
    key: dIdx,
    className: "card",
    style: {
      marginBottom: 10,
      padding: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, day.name), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => removeDay(dIdx)
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "trash",
    size: 14,
    style: {
      color: 'var(--danger, #c65d3e)'
    }
  }))), (day.exercises || []).map((ex, eIdx) => /*#__PURE__*/React.createElement("div", {
    key: eIdx,
    style: {
      borderTop: '1px solid var(--border)',
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, ex.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, ex.muscle)), ex.yt && /*#__PURE__*/React.createElement("a", {
    href: ex.yt,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: '#c00',
      flexShrink: 0
    },
    title: "Film instrukta\u017Cowy"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "play",
    size: 18
  })), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => setSwapTarget({
      dayIdx: dIdx,
      exIdx: eIdx,
      muscle: ex.muscle
    }),
    title: "Zamie\u0144 na inne"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "swap",
    size: 16,
    style: {
      color: 'var(--primary)'
    }
  })), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => removeExercise(dIdx, eIdx)
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "x",
    size: 14,
    style: {
      color: 'var(--danger, #c65d3e)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr',
      gap: 6,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      color: 'var(--muted)',
      fontSize: 10
    }
  }, "Serie"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    className: "field-input",
    style: {
      fontSize: 13,
      padding: '4px 6px'
    },
    value: ex.sets,
    onChange: e => updateExercise(dIdx, eIdx, 'sets', parseInt(e.target.value) || 0)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      color: 'var(--muted)',
      fontSize: 10
    }
  }, "Powt\xF3rzenia"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    style: {
      fontSize: 13,
      padding: '4px 6px'
    },
    value: ex.reps,
    onChange: e => updateExercise(dIdx, eIdx, 'reps', e.target.value),
    placeholder: "12"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      color: 'var(--muted)',
      fontSize: 10
    }
  }, "Tempo"), /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    style: {
      fontSize: 13,
      padding: '4px 6px'
    },
    value: ex.tempo || '',
    onChange: e => updateExercise(dIdx, eIdx, 'tempo', e.target.value),
    placeholder: "2-1-2"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      color: 'var(--muted)',
      fontSize: 10
    }
  }, "Odp. (s)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    className: "field-input",
    style: {
      fontSize: 13,
      padding: '4px 6px'
    },
    value: ex.rest,
    onChange: e => updateExercise(dIdx, eIdx, 'rest', parseInt(e.target.value) || 0)
  }))))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-outline",
    style: {
      marginTop: 6,
      width: '100%'
    },
    onClick: () => {
      setEditingDayIdx(dIdx);
      setShowExercisePicker(true);
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "plus",
    size: 14
  }), " Dodaj \u0107wiczenie"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "field-input",
    style: {
      flex: 1
    },
    value: newDayName,
    onChange: e => setNewDayName(e.target.value),
    placeholder: "Nazwa dnia (np. Dzie\u0144 A \u2014 G\xF3ra)"
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    onClick: addDay
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "plus",
    size: 14
  }), " Dzie\u0144"))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: '100%',
      marginTop: 16
    },
    onClick: handleSave,
    disabled: !clientId
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "save",
    size: 16
  }), " Zapisz plan"));
}

// ========================================================================
// EXERCISE PICKER — browse & search exercises, filter by muscle
// ========================================================================
function ExercisePicker({
  filterMuscle,
  onSelect,
  onCancel
}) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState(filterMuscle || 'all');
  const filtered = useMemo(() => {
    let list = EXERCISES_DB;
    if (muscleFilter !== 'all') list = list.filter(e => e.muscle === muscleFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q));
    }
    return list;
  }, [search, muscleFilter]);
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: filterMuscle ? `Zamień (${filterMuscle})` : 'Wybierz ćwiczenie',
    onBack: onCancel,
    backLabel: "Anuluj"
  }), /*#__PURE__*/React.createElement("div", {
    className: "search-bar"
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "search",
    size: 16,
    style: {
      color: 'var(--muted)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Szukaj \u0107wiczenia...",
    value: search,
    onChange: e => setSearch(e.target.value),
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "category-scroll"
  }, /*#__PURE__*/React.createElement("button", {
    className: `cat-chip ${muscleFilter === 'all' ? 'active' : ''}`,
    onClick: () => setMuscleFilter('all')
  }, "Wszystkie"), MUSCLE_GROUPS.map(g => /*#__PURE__*/React.createElement("button", {
    key: g,
    className: `cat-chip ${muscleFilter === g ? 'active' : ''}`,
    onClick: () => setMuscleFilter(g)
  }, g))), filtered.map(ex => /*#__PURE__*/React.createElement("button", {
    key: ex.id,
    className: "card",
    style: {
      width: '100%',
      marginBottom: 4,
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      border: '1px solid var(--border)',
      background: 'var(--bg-card)'
    },
    onClick: () => onSelect(ex)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'left',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, ex.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, ex.muscle)), /*#__PURE__*/React.createElement("a", {
    href: ex.yt,
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: e => e.stopPropagation(),
    style: {
      color: '#c00',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon2, {
    name: "play",
    size: 18
  })))), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("p", null, "Nie znaleziono \u0107wicze\u0144")));
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

  // Request persistent storage (prevents iOS 7-day purge)
  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) console.log('Persistent storage granted');else console.log('Persistent storage denied');
      });
    }
  }, []);

  // Load data
  useEffect(() => {
    try {
      // Clients
      const clientList = storage.list('client:');
      const loadedClients = [];
      if (clientList?.keys) {
        for (const key of clientList.keys) {
          try {
            const r = storage.get(key);
            if (r?.value) loadedClients.push(JSON.parse(r.value));
          } catch {}
        }
      }
      setClients(loadedClients);

      // Products
      try {
        const pr = storage.get('products:all');
        if (pr?.value) setProducts(JSON.parse(pr.value));else {
          // Products will be loaded from the original data set
          setProducts([]);
        }
      } catch {}

      // Templates
      try {
        const tplList = storage.list('template:');
        const tpls = [];
        if (tplList?.keys) {
          for (const key of tplList.keys) {
            try {
              const r = storage.get(key);
              if (r?.value) tpls.push(JSON.parse(r.value));
            } catch {}
          }
        }
        setTemplates(tpls.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      } catch {}

      // Trainings
      try {
        const trList = storage.list('training:');
        const trs = [];
        if (trList?.keys) {
          for (const key of trList.keys) {
            try {
              const r = storage.get(key);
              if (r?.value) trs.push(JSON.parse(r.value));
            } catch {}
          }
        }
        setTrainings(trs);
      } catch {}

      // Finances
      try {
        const fnList = storage.list('finance:');
        const fns = [];
        if (fnList?.keys) {
          for (const key of fnList.keys) {
            try {
              const r = storage.get(key);
              if (r?.value) fns.push(JSON.parse(r.value));
            } catch {}
          }
        }
        setFinances(fns);
      } catch {}

      // Client packages
      try {
        const cpList = storage.list('cpkg:');
        const cps = [];
        if (cpList?.keys) {
          for (const key of cpList.keys) {
            try {
              const r = storage.get(key);
              if (r?.value) cps.push(JSON.parse(r.value));
            } catch {}
          }
        }
        setClientPackages(cps);
      } catch {}

      // Packages
      try {
        const pkgR = storage.get('packages:all');
        if (pkgR?.value) setPackages(JSON.parse(pkgR.value));else storage.set('packages:all', JSON.stringify(PRELOADED_PACKAGES));
      } catch {
        storage.set('packages:all', JSON.stringify(PRELOADED_PACKAGES));
      }
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }, []);

  // Load photos for selected client
  useEffect(() => {
    if (selectedClientId) {
      photoDB.getByClient(selectedClientId).then(photos => {
        setClientPhotos(prev => ({
          ...prev,
          [selectedClientId]: photos
        }));
      });
    }
  }, [selectedClientId]);

  // CRUD
  const saveClient = client => {
    try {
      storage.set(`client:${client.id}`, JSON.stringify(client));
      setClients(prev => {
        const idx = prev.findIndex(c => c.id === client.id);
        if (idx >= 0) {
          const n = [...prev];
          n[idx] = client;
          return n;
        }
        return [...prev, client];
      });
    } catch (e) {
      console.error(e);
    }
  };
  const deleteClient = id => {
    try {
      storage.delete(`client:${id}`);
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClientId === id) setSelectedClientId(null);
    } catch (e) {
      console.error(e);
    }
  };
  const saveProducts = p => {
    setProducts(p);
    try {
      storage.set('products:all', JSON.stringify(p));
    } catch {}
  };
  const saveTemplate = tpl => {
    try {
      storage.set(`template:${tpl.id}`, JSON.stringify(tpl));
      setTemplates(prev => [tpl, ...prev.filter(t => t.id !== tpl.id)]);
    } catch {}
  };
  const deleteTemplate = id => {
    try {
      storage.delete(`template:${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch {}
  };
  const saveTraining = t => {
    try {
      storage.set('training:' + t.id, JSON.stringify(t));
      setTrainings(prev => {
        const idx = prev.findIndex(x => x.id === t.id);
        if (idx >= 0) {
          const n = [...prev];
          n[idx] = t;
          return n;
        }
        return [...prev, t];
      });
    } catch {}
  };
  const deleteTraining = id => {
    try {
      storage.delete('training:' + id);
      setTrainings(prev => prev.filter(t => t.id !== id));
    } catch {}
  };
  const saveFinance = f => {
    try {
      storage.set('finance:' + f.id, JSON.stringify(f));
      setFinances(prev => {
        const idx = prev.findIndex(x => x.id === f.id);
        if (idx >= 0) {
          const n = [...prev];
          n[idx] = f;
          return n;
        }
        return [...prev, f];
      });
    } catch {}
  };
  const deleteFinance = id => {
    try {
      storage.delete('finance:' + id);
      setFinances(prev => prev.filter(f => f.id !== id));
    } catch {}
  };
  const saveClientPackage = cp => {
    try {
      storage.set('cpkg:' + cp.id, JSON.stringify(cp));
      setClientPackages(prev => {
        const idx = prev.findIndex(x => x.id === cp.id);
        if (idx >= 0) {
          const n = [...prev];
          n[idx] = cp;
          return n;
        }
        return [...prev, cp];
      });
    } catch {}
  };
  const deleteClientPackage = id => {
    try {
      storage.delete('cpkg:' + id);
      setClientPackages(prev => prev.filter(cp => cp.id !== id));
    } catch {}
  };
  const savePackage = pkg => {
    try {
      setPackages(prev => {
        const idx = prev.findIndex(p => p.id === pkg.id);
        const next = idx >= 0 ? [...prev.slice(0, idx), pkg, ...prev.slice(idx + 1)] : [...prev, pkg];
        storage.set('packages:all', JSON.stringify(next));
        return next;
      });
    } catch {}
  };
  const deletePackage = id => {
    try {
      setPackages(prev => {
        const next = prev.filter(p => p.id !== id);
        storage.set('packages:all', JSON.stringify(next));
        return next;
      });
    } catch {}
  };
  const handlePhotoAdd = async photo => {
    await photoDB.save(photo);
    setClientPhotos(prev => ({
      ...prev,
      [photo.clientId]: [photo, ...(prev[photo.clientId] || [])]
    }));
    setToast('Zdjęcie dodane');
  };
  const handlePhotoDelete = async id => {
    await photoDB.deletePhoto(id);
    // Refresh
    if (selectedClientId) {
      const photos = await photoDB.getByClient(selectedClientId);
      setClientPhotos(prev => ({
        ...prev,
        [selectedClientId]: photos
      }));
    }
  };
  const importData = data => {
    try {
      if (data.clients) {
        for (const c of data.clients) {
          storage.set(`client:${c.id}`, JSON.stringify(c));
        }
        setClients(prev => {
          const map = {};
          [...prev, ...data.clients].forEach(c => {
            map[c.id] = c;
          });
          return Object.values(map);
        });
      }
      if (data.products) {
        storage.set('products:all', JSON.stringify(data.products));
        setProducts(data.products);
      }
      if (data.templates) {
        for (const t of data.templates) {
          storage.set(`template:${t.id}`, JSON.stringify(t));
        }
        setTemplates(prev => {
          const map = {};
          [...prev, ...data.templates].forEach(t => {
            map[t.id] = t;
          });
          return Object.values(map).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        });
      }
      if (data.trainings) {
        for (const t of data.trainings) {
          storage.set('training:' + t.id, JSON.stringify(t));
        }
        setTrainings(prev => {
          const map = {};
          [...prev, ...data.trainings].forEach(t => {
            map[t.id] = t;
          });
          return Object.values(map);
        });
      }
      if (data.finances) {
        for (const f of data.finances) {
          storage.set('finance:' + f.id, JSON.stringify(f));
        }
        setFinances(prev => {
          const map = {};
          [...prev, ...data.finances].forEach(f => {
            map[f.id] = f;
          });
          return Object.values(map);
        });
      }
      if (data.clientPackages) {
        for (const cp of data.clientPackages) {
          storage.set('cpkg:' + cp.id, JSON.stringify(cp));
        }
        setClientPackages(prev => {
          const map = {};
          [...prev, ...data.clientPackages].forEach(cp => {
            map[cp.id] = cp;
          });
          return Object.values(map);
        });
      }
      if (data.packages) {
        storage.set('packages:all', JSON.stringify(data.packages));
        setPackages(data.packages);
      }
      setToast('Dane zaimportowane!');
    } catch (e) {
      console.error('Import error:', e);
    }
  };
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Determine active tab for bottom bar
  const activeTab = subView ? 'more' : view;
  const handleTab = tab => {
    setSubView(null);
    setSelectedClientId(null);
    setView(tab);
  };
  const handleSubNav = sub => {
    setSubView(sub);
    setSelectedClientId(null);
  };
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "app-root"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        color: 'var(--muted)',
        fontStyle: 'italic'
      }
    }, "Wczytywanie\u2026")));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "app-root"
  }, !storage.isAvailable && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#c65d3e',
      color: '#fff',
      padding: '10px 16px',
      fontSize: 13,
      textAlign: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }
  }, "\u26A0\uFE0F Tryb prywatny \u2014 dane nie b\u0119d\u0105 zapisane po zamkni\u0119ciu przegl\u0105darki. Wy\u0142\u0105cz tryb prywatny lub dodaj aplikacj\u0119 na ekran g\u0142\xF3wny."), /*#__PURE__*/React.createElement("div", {
    className: "main-content"
  }, selectedClient ? /*#__PURE__*/React.createElement(ClientDetailView, {
    client: selectedClient,
    products: products,
    templates: templates,
    onBack: () => setSelectedClientId(null),
    onSave: saveClient,
    onEdit: () => setEditingClient(selectedClient),
    onSaveTemplate: saveTemplate,
    trainings: trainings,
    onSaveTraining: saveTraining,
    onDeleteTraining: deleteTraining,
    clientPackages: clientPackages,
    packages: packages,
    photos: clientPhotos[selectedClientId] || [],
    onPhotoAdd: handlePhotoAdd,
    onPhotoDelete: handlePhotoDelete
  }) : subView === 'diets' ? /*#__PURE__*/React.createElement(DietPlanView, {
    clients: clients,
    products: products,
    onBack: () => setSubView(null)
  }) : subView === 'workouts' ? /*#__PURE__*/React.createElement(WorkoutPlanView, {
    clients: clients,
    onBack: () => setSubView(null)
  }) : subView === 'billing' ? /*#__PURE__*/React.createElement(BillingView, {
    clients: clients,
    packages: packages,
    clientPackages: clientPackages,
    onSaveClientPackage: saveClientPackage,
    onDeleteClientPackage: deleteClientPackage,
    trainings: trainings,
    onBack: () => setSubView(null)
  }) : subView === 'packages' ? /*#__PURE__*/React.createElement(PackagesView, {
    packages: packages,
    onSavePackage: savePackage,
    onDeletePackage: deletePackage,
    onBack: () => setSubView(null)
  }) : subView === 'products' ? /*#__PURE__*/React.createElement(ProductsView, {
    products: products,
    onSave: saveProducts,
    onBack: () => setSubView(null)
  }) : subView === 'templates' ? /*#__PURE__*/React.createElement(TemplatesView, {
    templates: templates,
    onDelete: deleteTemplate,
    products: products,
    onBack: () => setSubView(null)
  }) : subView === 'recipes' ? /*#__PURE__*/React.createElement(RecipesView, {
    recipes: [],
    products: products,
    onBack: () => setSubView(null)
  }) : subView === 'photos' ? /*#__PURE__*/React.createElement(PhotosGalleryView, {
    clients: clients,
    onBack: () => setSubView(null)
  }) : subView === 'backup' ? /*#__PURE__*/React.createElement(BackupView, {
    clients: clients,
    products: products,
    templates: templates,
    trainings: trainings,
    finances: finances,
    clientPackages: clientPackages,
    packages: packages,
    onImport: importData,
    onBack: () => setSubView(null)
  }) : subView === 'about' ? /*#__PURE__*/React.createElement(AboutView, {
    onBack: () => setSubView(null)
  }) : view === 'clients' ? /*#__PURE__*/React.createElement(ClientsView, {
    clients: clients,
    onSelect: id => setSelectedClientId(id),
    onAdd: () => {
      setEditingClient(null);
      setShowClientForm(true);
    },
    onDelete: deleteClient
  }) : view === 'calendar' ? /*#__PURE__*/React.createElement(CalendarView, {
    clients: clients,
    trainings: trainings,
    onSaveTraining: saveTraining,
    onDeleteTraining: deleteTraining
  }) : view === 'finances' ? /*#__PURE__*/React.createElement(FinancesView, {
    finances: finances,
    onSaveFinance: saveFinance,
    onDeleteFinance: deleteFinance,
    clients: clients
  }) : view === 'dashboard' ? /*#__PURE__*/React.createElement(DashboardView, {
    clients: clients,
    trainings: trainings,
    finances: finances,
    clientPackages: clientPackages
  }) : view === 'more' ? /*#__PURE__*/React.createElement(MoreMenu, {
    onNavigate: handleSubNav
  }) : null), /*#__PURE__*/React.createElement(BottomTabBar, {
    activeTab: activeTab,
    onTab: handleTab
  }), (showClientForm || editingClient) && /*#__PURE__*/React.createElement(ClientFormSheet, {
    client: editingClient,
    onSave: c => {
      saveClient(c);
      setShowClientForm(false);
      setEditingClient(null);
    },
    onCancel: () => {
      setShowClientForm(false);
      setEditingClient(null);
    }
  }), toast && /*#__PURE__*/React.createElement(Toast, {
    message: toast,
    onClose: () => setToast(null)
  }));
}

// ===== ERROR BOUNDARY =====
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, info) {
    console.error('REACT ERROR:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          padding: 20,
          textAlign: 'center'
        }
      }, React.createElement('h2', null, 'Wystąpił błąd'), React.createElement('p', {
        style: {
          color: '#666',
          fontSize: 14
        }
      }, String(this.state.error)), React.createElement('button', {
        onClick: () => this.setState({
          hasError: false
        }),
        style: {
          marginTop: 12,
          padding: '8px 16px',
          background: '#2d3f2f',
          color: '#fff',
          border: 'none',
          borderRadius: 4
        }
      }, 'Spróbuj ponownie'));
    }
    return this.props.children;
  }
}

// ===== MOUNT =====
const rootEl = document.getElementById('root');
ReactDOM.createRoot(rootEl).render(React.createElement(AppErrorBoundary, null, React.createElement(StudioTreneraApp, null)));
