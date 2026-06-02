'use strict';

// ── CONTENT PANEL ENGINE ──────────────────────────────────────────────────────
// Section data lives in js/sections/<name>.js and is loaded on demand.
// Each section file calls registerSection(name, def). Two def shapes:
//   { type:'panel',    title, sub, collections:[ {id,label,desc,path,cover,items} ] }
//   { type:'terminal', content:[ ...queue items ] }
const panelEl = document.getElementById('content-panel');

const PANEL_SECTIONS = {};   // name → def (filled by section files)
const _sectionLoaded = {};   // name → true once its <script> has run

function registerSection(name, def) {
  PANEL_SECTIONS[name] = def;
}

// Inject js/sections/<name>.js once; done(def|null) fires when ready.
function loadSection(name, done) {
  if (_sectionLoaded[name]) { done(PANEL_SECTIONS[name] || null); return; }
  const s = document.createElement('script');
  s.src = `js/sections/${name.toLowerCase()}.js`;
  s.onload  = () => { _sectionLoaded[name] = true; done(PANEL_SECTIONS[name] || null); };
  s.onerror = () => { _sectionLoaded[name] = true; done(null); };
  document.head.appendChild(s);
}

// ── JSON MANIFEST FETCH ───────────────────────────────────────────────────────
function fetchJSON(url) {
  return fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
}

// dim "> ..." status line used while a manifest loads
function statusLine(text) {
  const el = document.createElement('div');
  el.className = 'panel-status';
  el.textContent = '> ' + text;
  return el;
}

// ── REAL-PROGRESS IMAGE FETCH ─────────────────────────────────────────────────
// Streams the file so we can show genuine byte progress — that's the flavor.
async function fetchImageProgress(src, onProgress) {
  const resp = await fetch(src);
  if (!resp.ok) throw new Error(resp.status);
  const total  = +resp.headers.get('Content-Length') || 0;
  const reader = resp.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress(received / total, received, total);
  }
  if (!total) onProgress(1, received, received);
  return URL.createObjectURL(new Blob(chunks));
}

// Loads `src` into `container` with a terminal-style progress readout.
function loadImageInto(container, src, label) {
  container.innerHTML = '';
  container.classList.add('img-loading');

  const readout = document.createElement('div');
  readout.className = 'img-readout';
  readout.textContent = `> fetching ${label}...`;
  container.appendChild(readout);

  const W = 22;
  const draw = p => {
    const f = Math.round(p * W);
    readout.textContent = `> ${label}\n[${'█'.repeat(f)}${'░'.repeat(W - f)}] ${String(Math.round(p*100)).padStart(3)}%`;
  };
  draw(0);

  fetchImageProgress(src, (p) => { draw(p); if (snd) snd.barTick(p); })
    .then(url => {
      const img = new Image();
      img.onload = () => {
        container.classList.remove('img-loading');
        container.innerHTML = '';
        img.className = 'img-loaded';
        container.appendChild(img);
        if (snd) snd.done();
      };
      img.src = url;
      img.alt = label;
    })
    .catch(() => {
      container.classList.remove('img-loading');
      container.innerHTML = '';
      const err = document.createElement('div');
      err.className = 'img-readout';
      err.textContent = '[ NO SIGNAL ]';
      container.appendChild(err);
    });
}

// ── GRID BUILDER ──────────────────────────────────────────────────────────────
function initGridNav(cards) {
  clearNav();
  navItems = cards;
  if (cards.length) {
    const firstTop = cards[0].getBoundingClientRect().top;
    navCols = cards.filter(c => Math.abs(c.getBoundingClientRect().top - firstTop) < 2).length || 1;
  }
  navFocus(0);
}

// items: [{label, sub|tag/year, src(optional)}], onClick(item, i)
function buildGrid(items, onClick) {
  const grid = document.createElement('div');
  grid.className = 'panel-grid';
  const cards = [];

  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';

    const thumb = document.createElement('div');
    thumb.className = 'panel-thumb';
    if (item.src) {
      // grid thumbs use native lazy loading — only fetch when scrolled near
      thumb.classList.add('img-pending');
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = item.src;
      img.alt = item.label;
      img.addEventListener('load',  () => thumb.classList.remove('img-pending'));
      img.addEventListener('error', () => { thumb.classList.remove('img-pending'); thumb.textContent = '[ ? ]'; });
      thumb.appendChild(img);
    } else {
      thumb.textContent = '[ img ]';
    }
    card.appendChild(thumb);

    const caption = document.createElement('div');
    caption.className = 'panel-caption';
    caption.textContent = item.label;
    card.appendChild(caption);

    const tagEl = document.createElement('div');
    tagEl.className = 'panel-tag';
    tagEl.textContent = item.sub || `${item.tag || ''}  ${item.year || ''}`.trim();
    card.appendChild(tagEl);

    card.addEventListener('mouseenter', () => { if (snd) snd.hover(); navFocus(i); });
    card.addEventListener('click', () => onClick(item, i));
    grid.appendChild(card);
    cards.push(card);
  });

  return { grid, cards };
}

// ── COLLECTION OVERLAY ────────────────────────────────────────────────────────
function openCollection(coll, rootEl) {
  clearNav();

  const overlay = document.createElement('div');
  overlay.className = 'panel-collection';

  const hdr = document.createElement('div');
  hdr.className = 'panel-collection-header';

  const backBtn = document.createElement('div');
  backBtn.className = 'panel-close';
  backBtn.textContent = '[ ← back ]';
  backBtn.addEventListener('click', () => {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 240);
    if (snd) snd.hover();
    const grid = rootEl.querySelector('.panel-scroll-body .panel-grid');
    if (grid) requestAnimationFrame(() => initGridNav(Array.from(grid.querySelectorAll('.panel-card'))));
  });
  backBtn.addEventListener('mouseenter', () => snd && snd.hover());
  hdr.appendChild(backBtn);

  const crumb = document.createElement('div');
  crumb.className = 'panel-detail-breadcrumb';
  crumb.textContent = `${currentSection}  ›  ${coll.label}`;
  hdr.appendChild(crumb);
  overlay.appendChild(hdr);

  const body = document.createElement('div');
  body.className = 'panel-collection-body';
  const inner = document.createElement('div');
  inner.className = 'panel-inner';
  body.appendChild(inner);
  overlay.appendChild(body);

  rootEl.appendChild(overlay);

  function renderItems(items) {
    coll.items = items;
    crumb.textContent = `${currentSection}  ›  ${coll.label}  ·  ${items.length} works`;
    const gridItems = items.map(it => ({
      ...it,
      sub: `${it.tag}  ${it.year}`,
      src: it.file ? `${coll.path}/${it.file}` : null,
    }));
    const { grid, cards } = buildGrid(gridItems, (_, i) => openDetail(coll, i, overlay));
    inner.appendChild(grid);
    makeScrollbar(overlay, body);
    requestAnimationFrame(() => initGridNav(cards));
  }

  // items already loaded once? reuse. otherwise fetch this folder's manifest.
  if (coll.items) {
    renderItems(coll.items);
  } else {
    const status = statusLine(`reading ${coll.path}/meta.json ...`);
    inner.appendChild(status);
    fetchJSON(`${coll.path}/meta.json`)
      .then(data => { status.remove(); renderItems(data.items || []); })
      .catch(() => { status.className = 'panel-status err'; status.textContent = '[ collection unavailable ]'; });
  }

  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
}

// ── DETAIL OVERLAY ────────────────────────────────────────────────────────────
function openDetail(coll, idx, collOverlay) {
  clearNav();
  if (snd) snd.hover();
  const item = coll.items[idx];

  let detail = panelEl.querySelector('.panel-detail');
  if (!detail) {
    detail = document.createElement('div');
    detail.className = 'panel-detail';
    panelEl.appendChild(detail);
  }
  detail.innerHTML = '';

  const hdr = document.createElement('div');
  hdr.className = 'panel-detail-header';

  const backBtn = document.createElement('div');
  backBtn.className = 'panel-close';
  backBtn.textContent = '[ ← back ]';
  backBtn.addEventListener('click', () => {
    detail.classList.remove('open');
    if (snd) snd.hover();
    const grid = collOverlay.querySelector('.panel-grid');
    if (grid) requestAnimationFrame(() => initGridNav(Array.from(grid.querySelectorAll('.panel-card'))));
  });
  backBtn.addEventListener('mouseenter', () => snd && snd.hover());
  hdr.appendChild(backBtn);

  const crumb = document.createElement('div');
  crumb.className = 'panel-detail-breadcrumb';
  crumb.textContent = `${currentSection}  ›  ${coll.label}  ›  ${item.label}  ·  ${idx + 1} / ${coll.items.length}`;
  hdr.appendChild(crumb);
  detail.appendChild(hdr);

  if (idx > 0) {
    const prev = document.createElement('div');
    prev.className = 'panel-detail-prev';
    prev.textContent = '◀';
    prev.addEventListener('click', () => openDetail(coll, idx - 1, collOverlay));
    prev.addEventListener('mouseenter', () => snd && snd.hover());
    detail.appendChild(prev);
  }
  if (idx < coll.items.length - 1) {
    const next = document.createElement('div');
    next.className = 'panel-detail-next';
    next.textContent = '▶';
    next.addEventListener('click', () => openDetail(coll, idx + 1, collOverlay));
    next.addEventListener('mouseenter', () => snd && snd.hover());
    detail.appendChild(next);
  }

  const content = document.createElement('div');
  content.className = 'panel-detail-content';

  const imgEl = document.createElement('div');
  imgEl.className = 'panel-detail-img';
  content.appendChild(imgEl);

  const nameEl = document.createElement('div');
  nameEl.className = 'panel-detail-title';
  nameEl.textContent = item.label;
  content.appendChild(nameEl);

  const meta = document.createElement('div');
  meta.className = 'panel-detail-meta';
  meta.textContent = `${item.tag}  ·  ${item.year}`;
  content.appendChild(meta);

  detail.appendChild(content);

  // load the full-res image with real progress feedback
  if (item.file) loadImageInto(imgEl, `${coll.path}/${item.file}`, item.label);
  else imgEl.textContent = '[ img ]';

  requestAnimationFrame(() => requestAnimationFrame(() => detail.classList.add('open')));
}

// ── PANEL OPEN / CLOSE ────────────────────────────────────────────────────────
// Called with a loaded panel def. Returns true if it rendered a panel.
function openPanel(name, def) {
  if (!def || def.type !== 'panel') return false;

  panelEl.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'panel-header';
  const closeBtn = document.createElement('div');
  closeBtn.className = 'panel-close';
  closeBtn.textContent = '[ ✕ back ]';
  closeBtn.addEventListener('click', closePanel);
  closeBtn.addEventListener('mouseenter', () => snd && snd.hover());
  header.appendChild(closeBtn);
  panelEl.appendChild(header);

  const scrollBody = document.createElement('div');
  scrollBody.className = 'panel-scroll-body';
  const inner = document.createElement('div');
  inner.className = 'panel-inner';
  scrollBody.appendChild(inner);
  panelEl.appendChild(scrollBody);

  const titleEl = document.createElement('div');
  titleEl.className = 'panel-title';
  titleEl.textContent = def.title || `[ ${name} ]`;
  inner.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'panel-sub';
  if (def.sub) subEl.textContent = def.sub;
  inner.appendChild(subEl);

  // builds the collection grid once the registry is available
  function renderCollections(meta) {
    if (meta.title) titleEl.textContent = meta.title;
    if (meta.sub)   subEl.textContent   = meta.sub;
    const collections = meta.collections || [];
    def._collections = collections;

    const collItems = collections.map(c => ({
      label: c.label,
      sub:   `${c.count != null ? c.count : (c.items ? c.items.length : '—')} works  ·  ${c.desc}`,
      src:   c.cover ? `${c.path}/${c.cover}` : null,
    }));
    const { grid, cards } = buildGrid(collItems, (_, i) => openCollection(collections[i], panelEl));
    inner.appendChild(grid);
    makeScrollbar(panelEl, scrollBody);
    requestAnimationFrame(() => initGridNav(cards));
  }

  // inline collections (legacy) → render now; otherwise fetch the index manifest
  if (def._collections) {
    renderCollections({ collections: def._collections });
  } else if (def.collections) {
    renderCollections({ collections: def.collections });
  } else if (def.index) {
    const status = statusLine(`reading ${def.index} ...`);
    inner.appendChild(status);
    fetchJSON(def.index)
      .then(meta => { status.remove(); renderCollections(meta); })
      .catch(() => { status.className = 'panel-status err'; status.textContent = '[ index unavailable ]'; });
  }

  requestAnimationFrame(() => requestAnimationFrame(() => {
    panelEl.classList.add('open');
    promptSpan.textContent  = PROMPT;
    inputDispEl.textContent = inputBuffer;
    cursorEl.style.visibility = 'visible';
    state = 'IDLE';
  }));
  return true;
}

function closePanel() {
  clearNav();
  panelEl.classList.remove('open');
  setTimeout(() => {
    panelEl.innerHTML = '';
    showMenu();
  }, 240);
}
