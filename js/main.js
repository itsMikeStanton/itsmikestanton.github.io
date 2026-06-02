'use strict';

// ── KEYBOARD NAV ─────────────────────────────────────────────────────────────
function navFocus(idx) {
  if (!navItems.length) return;
  if (navIndex >= 0 && navIndex < navItems.length)
    navItems[navIndex].classList.remove('nav-focus');
  navIndex = Math.max(0, Math.min(navItems.length - 1, idx));
  navItems[navIndex].classList.add('nav-focus');
  navItems[navIndex].scrollIntoView({ block: 'nearest' });
  if (snd) snd.hover();
}

function clearNav() {
  if (navIndex >= 0 && navIndex < navItems.length)
    navItems[navIndex].classList.remove('nav-focus');
  navItems = [];
  navIndex = -1;
  navCols  = 1;
}

// ── EXECUTE COMMAND ──────────────────────────────────────────────────────────
function execute(cmd) {
  if (cmd.trim()) addLine(PROMPT + cmd, 'dim');

  if (/^(cls|clear)$/i.test(cmd.trim())) {
    animatedClear();
    return;
  }

  if (/^menu$/i.test(cmd.trim())) {
    animatedClear(showMenu);
    return;
  }

  if (menuMode) {
    const match = SECTIONS.find(s => s.toLowerCase() === cmd.trim().toLowerCase());
    if (match) { openSection(match); return; }
  }

  menuMode = false;
  currentSection = null;

  const routine = getRoutineFor(cmd);

  if (state === 'HACKING') {
    routine.forEach(i => hackQueue.push(i));
    hackQueue.push(null);
    return;
  }

  state = 'HACKING';
  promptSpan.textContent = '';
  inputDispEl.textContent = '';
  cursorEl.style.visibility = 'hidden';

  routine.forEach(i => hackQueue.push(i));
  hackQueue.push(null);
  processQueue();
}

// ── KEYBOARD ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (state === 'BOOT') return;

  if (e.key === 'Tab') {
    e.preventDefault();
    document.getElementById('sidebar').classList.toggle('collapsed');
    return;
  }

  // arrow keys — nav when items exist, otherwise ignore
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
    if (!navItems.length) return;
    keyboardActive = true;
    ghostCursorEl.style.display = 'none';
    if (e.key === 'ArrowUp')    navFocus(navIndex - navCols);
    if (e.key === 'ArrowDown')  navFocus(navIndex + navCols);
    if (e.key === 'ArrowLeft')  navFocus(navIndex - 1);
    if (e.key === 'ArrowRight') navFocus(navIndex + 1);
    return;
  }

  const skip = ['Shift','Control','Alt','Meta','CapsLock',
                'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
                'Home','End','PageUp','PageDown','Insert','Delete'];
  if (skip.includes(e.key)) return;
  e.preventDefault();

  if (e.key === 'Escape') {
    if (inputBuffer) {
      inputBuffer = '';
      inputDispEl.textContent = '';
      return;
    }
    const detail = document.querySelector('.panel-detail.open');
    if (detail) { detail.classList.remove('open'); clearNav(); return; }
    const coll = document.querySelector('.panel-collection.open');
    if (coll) { coll.classList.remove('open'); clearNav(); return; }
    const panel = document.getElementById('content-panel');
    if (panel && panel.classList.contains('open')) { closePanel(); return; }
    if (menuMode) { animatedClear(showSplash); return; }
    return;
  }

  if (e.key === 'Backspace') {
    inputBuffer = inputBuffer.slice(0,-1);
    inputDispEl.textContent = inputBuffer;
    return;
  }

  if (e.key === 'Enter') {
    if (navItems.length && navIndex >= 0 && !inputBuffer) {
      navItems[navIndex].click();
      return;
    }
    const cmd = inputBuffer;
    inputBuffer = '';
    inputDispEl.textContent = '';
    execute(cmd);
    return;
  }

  if (e.key.length === 1) {
    if (snd) snd.key();
    inputBuffer += e.key;
    inputDispEl.textContent = inputBuffer;
  }
});

// ── SOUND TOGGLE ─────────────────────────────────────────────────────────────
document.getElementById('sound-toggle').addEventListener('click', toggleMute);

// ── BOOT SEQUENCE ────────────────────────────────────────────────────────────
const BOOT = [
  [0,    'dim',   'PHANTOM BIOS v3.1.7  (C) 1998-2024 PhantomSystems Inc.'],
  [110,  '',      ''],
  [200,  '',      'CPU: Intel Core i9-13900K @ 5.80GHz [OVERCLOCKED]'],
  [320,  '',      'RAM: 65536MB ECC DDR5-6400   GPU: RTX 4090 24GB'],
  [430,  '',      'NVMe: 2TB   NET: 10GbE [STEALTH MODE]'],
  [570,  '',      ''],
  [660,  '',      'POST....... PASS   Memory........ PASS   PCI-E......... OK'],
  [800,  '',      ''],
  [900,  'bright','═══════════════════ DARKNET OS v7.3.1 ═══════════════════'],
  [1020, '',      ''],
  [1100, 'dim',   'Loading kernel: darknet-7.3.1-amd64 ...'],
  [1200, 'dim',   '[    0.000000] Booting Linux kernel 7.3.1-darknet'],
  [1300, 'dim',   '[    0.148320] PCI: Using configuration type 1'],
  [1400, 'dim',   '[    0.891020] phantom_net module ................. OK'],
  [1500, 'dim',   '[    1.234100] eth0: MAC spoofing ENABLED'],
  [1600, 'dim',   '[    1.789300] Mounting encrypted filesystem ...... OK'],
  [1700, '',      '[    2.103400] Starting services:'],
  [1830, '',      '[    2.412000]   TOR relay (multi-hop) ............. [ OK ]'],
  [1940, '',      '[    2.534000]   VPN tunnel (AES-256-GCM) .......... [ OK ]'],
  [2050, '',      '[    2.656000]   Packet obfuscation ................ [ OK ]'],
  [2160, '',      '[    2.778000]   PHANTOM intrusion suite v9.1 ...... [ OK ]'],
  [2270, '',      '[    2.900000]   Payload library (32,768 exploits) . [ OK ]'],
  [2380, '',      '[    3.022000]   Neural hash cracker ................ [ OK ]'],
  [2490, '',      '[    3.144000]   Botnet C2 interface ............... [ OK ]'],
  [2600, '',      '[    3.266000]   Zero-day broker ................... [ OK ]'],
  [2720, '',      ''],
  [2820, 'dim',   'Origin masked. Traffic encrypted. Logging disabled.'],
  [2980, 'bright','Welcome back, GHOST.'],
  [3150, '',      ''],
  [3260, 'dim',   `Last login: Fri May 23 03:14:15 2026 via tor-relay [${G.ip()}]`],
  [3380, '',      ''],
  [3480, 'dim',   'Initializing navigation interface...'],
  [3580, '',      ''],
];

function runBoot() {
  if (snd) snd.boot();
  BOOT.forEach(([delay, cls, text]) => setTimeout(() => addLine(text, cls), delay));
  setTimeout(() => { animatedClear(showMenu); }, 3900);
}

// ── GHOST CURSOR + PARALLAX ───────────────────────────────────────────────────
const ghostCursorEl  = document.getElementById('ghost-cursor');
const screenEl       = document.getElementById('screen');
const reflectionEl   = document.getElementById('reflection');

let targetX = 0, targetY = 0;
let lerpX   = 0, lerpY   = 0;
let cursorStarted  = false;
let keyboardActive = false;
const LERP        = 0.22;
const CURSOR_CHUNK = 8;     // px grid the cursor snaps to

// ── PHOSPHOR TRAILS ───────────────────────────────────────────────────────────
const TRAIL_POOL  = 14;      // afterimage element pool
const TRAIL_SPAWN = 6;      // frames between stamping a new afterimage (lower freq)
const TRAIL_FADE  = 0.015;  // opacity lost per frame (smaller = slower fadeaway)
const TRAIL_START = 0.4;    // opacity a fresh afterimage starts at
const trailEls    = [];
for (let k = 0; k < TRAIL_POOL; k++) {
  const t = document.createElement('div');
  t.className = 'ghost-trail';
  t._op = 0;
  ghostCursorEl.parentNode.insertBefore(t, ghostCursorEl);
  trailEls.push(t);
}
let trailFrame = 0, trailNext = 0, lastStampX = 0, lastStampY = 0;

// ── CURSOR HIDE ON INTERACTIVE ELEMENTS ──────────────────────────────────────
const INTERACTIVE_SEL = '.menu-item, .menu-back, .splash-item, .panel-card, ' +
  '.panel-close, .panel-detail-prev, .panel-detail-next, .sb-nav-item, #sound-toggle, .crt-sb-thumb';

document.addEventListener('mouseover', e => {
  if (e.target.closest(INTERACTIVE_SEL)) {
    ghostCursorEl.classList.add('cursor-hot');
  } else {
    ghostCursorEl.classList.remove('cursor-hot');
  }
});

document.addEventListener('mousemove', e => {
  if (!cursorStarted) {
    lerpX = e.clientX;
    lerpY = e.clientY;
    cursorStarted = true;
  }
  if (keyboardActive) {
    keyboardActive = false;
    lerpX = e.clientX;
    lerpY = e.clientY;
  }
  targetX = e.clientX;
  targetY = e.clientY;

  const nx = e.clientX / window.innerWidth  - 0.5;
  const ny = e.clientY / window.innerHeight - 0.5;
  const tx = (-nx * 80).toFixed(1);
  const ty = (-ny * 55).toFixed(1);
  screenEl.style.transform     = `translate(${tx}px, ${ty}px)`;
  reflectionEl.style.transform = `translate(${(-tx * 0.45).toFixed(1)}px, ${(-ty * 0.45).toFixed(1)}px)`;
});

// cursor lerp loop — runs independently of mousemove
(function animateCursor() {
  if (cursorStarted) {
    lerpX += (targetX - lerpX) * LERP;
    lerpY += (targetY - lerpY) * LERP;

    if (keyboardActive) {
      // keyboard in control — hide cursor and clear all afterimages
      ghostCursorEl.style.display = 'none';
      trailEls.forEach(t => { t._op = 0; t.style.display = 'none'; });
    } else {
      // fade every live afterimage a little each frame
      const hot = ghostCursorEl.classList.contains('cursor-hot');
      trailEls.forEach(t => {
        if (t._op > 0) {
          t._op -= TRAIL_FADE;
          if (t._op <= 0) { t._op = 0; t.style.display = 'none'; }
          else t.style.opacity = t._op.toFixed(3);
        }
      });

      const cx = Math.round(lerpX / CURSOR_CHUNK) * CURSOR_CHUNK;
      const cy = Math.round(lerpY / CURSOR_CHUNK) * CURSOR_CHUNK;
      ghostCursorEl.style.display = 'block';
      ghostCursorEl.style.left = cx + 'px';
      ghostCursorEl.style.top  = cy + 'px';

      // stamp a fresh afterimage occasionally, only when actually moving
      trailFrame++;
      const moved = Math.abs(cx - lastStampX) + Math.abs(cy - lastStampY) > CURSOR_CHUNK;
      if (trailFrame % TRAIL_SPAWN === 0 && moved) {
        const t = trailEls[trailNext];
        trailNext = (trailNext + 1) % TRAIL_POOL;
        t.style.left = cx + 'px';
        t.style.top  = cy + 'px';
        t.style.background = hot
          ? 'repeating-linear-gradient(to bottom,#ffcc00 0px,#ffcc00 3px,rgba(0,0,0,0.10) 3px,rgba(0,0,0,0.10) 4px)'
          : '';
        t._op = TRAIL_START;
        t.style.opacity = TRAIL_START.toFixed(3);
        t.style.display = 'block';
        lastStampX = cx; lastStampY = cy;
      }
    }
  }
  requestAnimationFrame(animateCursor);
})();

// ── ROUTER ────────────────────────────────────────────────────────────────────
window.addEventListener('popstate', e => {
  const s = e.state;
  _fromHistory = true;
  if (!s || s.view === 'splash') { showSplash(); return; }
  if (s.view === 'menu')         { showMenu();   return; }
  if (s.view === 'section')      { showMenu(); _fromHistory = true; openSection(s.name); }
});

// ── INIT ─────────────────────────────────────────────────────────────────────
cursorEl.style.visibility = 'hidden';

(function initRoute() {
  const hash = location.hash.slice(1).toLowerCase();
  if (hash === 'menu') {
    history.replaceState({view:'menu'}, '', '#menu');
    document.body.classList.remove('splash');
    _fromHistory = true;
    showMenu();
  } else if (SECTIONS.some(s => s.toLowerCase() === hash)) {
    const name = SECTIONS.find(s => s.toLowerCase() === hash);
    history.replaceState({view:'section', name}, '', '#' + hash);
    document.body.classList.remove('splash');
    _fromHistory = true; showMenu();
    _fromHistory = true; openSection(name);
  } else {
    showSplash();
  }
})();
