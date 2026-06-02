'use strict';

// ── MENU / NAV ───────────────────────────────────────────────────────────────
function addBackButton() {
  if (outputEl.querySelector('.menu-back')) return;
  const btn = document.createElement('div');
  btn.className = 'menu-back';
  btn.textContent = '[ ↩ back ]';
  btn.addEventListener('click', showMenu);
  outputEl.appendChild(btn);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function showMenu() {
  if (!_fromHistory) history.pushState({view:'menu'}, '', '#menu');
  _fromHistory = false;
  menuMode = true;
  currentSection = null;
  if (hackTimer) { clearTimeout(hackTimer); hackTimer = null; }
  hackQueue = [];
  outputEl.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'menu-wrap';
  SECTIONS.forEach((name, i) => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.textContent = `[ ${name} ]`;
    item.addEventListener('click', () => openSection(name));
    item.addEventListener('mouseenter', () => { if (snd) snd.hover(); navFocus(i); });
    wrap.appendChild(item);
    if (i < SECTIONS.length - 1) {
      const conn = document.createElement('div');
      conn.className = 'menu-conn';
      conn.textContent = '|';
      wrap.appendChild(conn);
    }
  });

  outputEl.appendChild(wrap);
  updateSidebarNav();
  setIdle();

  // keyboard nav — up/down through menu items
  clearNav();
  navItems = Array.from(wrap.querySelectorAll('.menu-item'));
  navCols  = 1;
  navFocus(0);
}

function getSectionBoot(name) {
  const ok  = s => ('> ' + s).padEnd(46, '.') + ' OK';
  const bar = (label, steps=10, delay=140) => ({type:'bar', label, steps, delay, done:'DONE', doneCls:'dim'});
  switch (name) {
    case 'ART': return [
      ['dim', '> init /vol/art'],
      null,
      ['dim', ok('verify partition integrity')],
      ['dim', ok('mount read-only filesystem')],
      null,
      ['dim', '> scanning gallery index...'],
      bar('[*] indexing:      ', 10, 150),
      null,
      ['dim', `> ${rnd(38, 84)} objects found`],
      ['dim', ok('build metadata cache')],
      ['dim', ok('generate access token')],
      null,
      ['dim', '> ready'],
      null,
    ];
    case 'GAMES': return [
      ['dim', '> init game_catalog_v2'],
      null,
      ['dim', ok('fetch build manifests')],
      ['dim', ok('resolve dependencies')],
      null,
      bar('[*] loading:       ', 8, 130),
      null,
      ['dim', `> ${rnd(2, 9)} projects loaded`],
      ['dim', ok('verify signatures')],
      null,
      ['dim', '> ready'],
      null,
    ];
    case 'MUSIC': return [
      ['dim', '> init audio_subsystem'],
      null,
      ['dim', ok('load codec registry')],
      ['dim', ok('scan /releases/*')],
      null,
      ['dim', '> processing waveforms...'],
      bar('[*] analyzing:     ', 12, 120),
      null,
      ['dim', `> ${rnd(42, 61)} tracks indexed`],
      ['dim', ok('build frequency map')],
      null,
      ['dim', '> ready'],
      null,
    ];
    case 'WORK': return [
      ['dim', '> fetch portfolio.json'],
      null,
      ['dim', ok('verify ssl certificate')],
      ['dim', ok('decrypt client records')],
      ['dim', ok('validate signatures')],
      null,
      bar('[*] compiling:     ', 8, 140),
      null,
      ['dim', '> [REDACTED] entries loaded'],
      null,
      ['dim', '> ready'],
      null,
    ];
    case 'WRITING': return [
      ['dim', '> scan /archive/**/*.md'],
      null,
      ['dim', ok('parse frontmatter')],
      null,
      bar('[*] indexing:      ', 10, 135),
      null,
      ['dim', `> ${rnd(40000, 55000).toLocaleString()} words indexed`],
      ['dim', ok('build search index')],
      ['dim', ok('generate tag graph')],
      null,
      ['dim', '> ready'],
      null,
    ];
    default: return [
      ['dim', ok(`init ${name.toLowerCase()}`)],
      null,
      ['dim', '> ready'],
      null,
    ];
  }
}

function openSection(name) {
  if (!_fromHistory) history.pushState({view:'section', name}, '', '#' + name.toLowerCase());
  _fromHistory = false;
  currentSection = name;
  if (hackTimer) { clearTimeout(hackTimer); hackTimer = null; }
  hackQueue = [];
  clearNav();
  updateSidebarNav();

  animatedClear(() => {
    state = 'HACKING';
    promptSpan.textContent = '';
    inputDispEl.textContent = '';
    cursorEl.style.visibility = 'hidden';

    // fetch the section's JS file in parallel with the boot animation
    let sectionDef = undefined;            // undefined = still loading
    loadSection(name, def => { sectionDef = def || null; });

    getSectionBoot(name).forEach(l => hackQueue.push(l));

    // wait for the file before rendering — boot usually covers it,
    // but if the network is slow we pulse until it lands
    hackQueue.push({ type: 'callback', fn: function awaitSection() {
      if (sectionDef === undefined) {
        addLine('> awaiting data stream...', 'dim');
        hackTimer = setTimeout(awaitSection, 140);
        return;
      }
      renderSection(name, sectionDef);
    }});

    processQueue();
  });
}

function renderSection(name, def) {
  // panel section — slides the visual panel in over the terminal
  if (def && def.type === 'panel') {
    if (openPanel(name, def)) return;
  }

  // terminal section — type the content into the output queue
  outputEl.innerHTML = '';
  state = 'HACKING';
  promptSpan.textContent = '';
  inputDispEl.textContent = '';
  cursorEl.style.visibility = 'hidden';

  if (def && def.type === 'terminal') {
    def.content.forEach(item => hackQueue.push(item));
  } else {
    hackQueue.push(['err', `[!] section "${name.toLowerCase()}" not found`]);
  }
  hackQueue.push(null);
  processQueue();
}

// ── SPLASH ───────────────────────────────────────────────────────────────────
function showSplash() {
  history.replaceState({view:'splash'}, '', location.pathname + location.search);
  menuMode = false;
  currentSection = null;
  hackQueue = [];
  if (hackTimer) { clearTimeout(hackTimer); hackTimer = null; }
  outputEl.innerHTML = '';
  inputBuffer = '';
  document.body.classList.add('splash');
  state = 'IDLE';
  promptSpan.textContent = '';
  cursorEl.style.visibility = 'hidden';

  const wrap = document.createElement('div');
  wrap.className = 'menu-wrap splash-wrap';

  const title = document.createElement('div');
  title.className = 'menu-item splash-title';
  title.style.marginBottom = '0.6em';
  title.textContent = '[ NOT QUIETLY . COM ]';
  const GLITCH_CHARS = '!@#$%^&*[]{}|<>?/\\~`±§';
  let titleGlitch = null;
  title.addEventListener('mouseenter', () => {
    let running = true;

    function scheduleNext() {
      if (!running) return;
      if (Math.random() < 0.45) {
        // calm period — clean title, no FUCKING
        title.textContent = '[ NOT QUIETLY . COM ]';
        setTimeout(scheduleNext, rnd(180, 550));
      } else {
        const end = Date.now() + rnd(100, 400);
        function burst() {
          if (!running) return;
          if (Date.now() >= end) {
            // burst over — drop FUCKING, back to clean title
            title.textContent = '[ NOT QUIETLY . COM ]';
            title.style.transform = '';
            title.style.filter = '';
            title.style.textShadow = '';
            setTimeout(scheduleNext, rnd(60, 280));
            return;
          }
          const base = '[ NOT FUCKING QUIETLY . COM ]';
          title.textContent = Math.random() < 0.35
            ? base.split('').map(c => Math.random() < 0.2 ? GLITCH_CHARS[Math.floor(Math.random()*GLITCH_CHARS.length)] : c).join('')
            : base;
          title.style.transform = `translate(${((Math.random()-0.5)*32).toFixed(0)}px,${((Math.random()-0.5)*6).toFixed(0)}px) skewX(${((Math.random()-0.5)*22).toFixed(1)}deg)`;
          title.style.filter = `brightness(${(0.3+Math.random()*2.5).toFixed(2)}) saturate(${rnd(1,13)}) hue-rotate(${rnd(0,360)}deg)`;
          title.style.textShadow = `${((Math.random()-0.5)*22).toFixed(0)}px 0 rgba(255,40,40,0.95),${((Math.random()-0.5)*22).toFixed(0)}px 0 rgba(40,40,255,0.95),0 0 32px rgba(255,204,0,1)`;
          if (snd && Math.random() < 0.35) snd.glitch();
          setTimeout(burst, rnd(30, 65));
        }
        burst();
      }
    }

    titleGlitch = { stop: () => { running = false; } };
    scheduleNext();
  });
  title.addEventListener('mouseleave', () => {
    if (titleGlitch) { titleGlitch.stop(); titleGlitch = null; }
    title.textContent = '[ NOT QUIETLY . COM ]';
    title.style.transform = '';
    title.style.filter = '';
    title.style.textShadow = '';
  });
  wrap.appendChild(title);

  const bootEl = document.createElement('div');
  bootEl.className = 'menu-item splash-item';
  bootEl.textContent = '[ BOOT ]';
  bootEl.addEventListener('mouseenter', () => { if (snd) snd.hover(); navFocus(0); });
  bootEl.addEventListener('click', () => {
    clearNav();
    document.body.classList.remove('splash');
    state = 'BOOT';
    outputEl.innerHTML = '';
    promptSpan.textContent = '';
    cursorEl.style.visibility = 'hidden';
    runBoot();
  });
  wrap.appendChild(bootEl);

  const conn = document.createElement('div');
  conn.className = 'menu-conn splash-item';
  conn.textContent = '|';
  wrap.appendChild(conn);

  const exitEl = document.createElement('div');
  exitEl.className = 'menu-item splash-item';
  exitEl.textContent = '[ EXIT ]';
  exitEl.addEventListener('mouseenter', () => { if (snd) snd.hover(); navFocus(1); });
  exitEl.addEventListener('click', () => {
    clearNav();
    window.open('https://www.google.com/search?q=kittens+gif', '_blank');
  });
  wrap.appendChild(exitEl);

  outputEl.appendChild(wrap);

  // keyboard nav for splash — up/down between BOOT and EXIT
  clearNav();
  navItems = [bootEl, exitEl];
  navCols  = 1;
  navFocus(0);
}
