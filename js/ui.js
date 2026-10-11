/* Hjemliv — brugerflade */
'use strict';
(function () {
  const UI = H.UI = {};
  const S = H.sim, W = H.W, M = H.M, A = H.A, T = THREE;
  UI.state = 'boot'; UI.mode = 'live'; UI.modal = null; UI.tab = 'needs';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SAVE_KEY = 'hjemliv-save-v1';
  const store = {
    get() { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(SAVE_KEY, v); return true; } catch (e) { return false; } },
    del() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
  };
  const G = () => H.G;
  const needColor = v => `hsl(${Math.round(H.clamp(v, 0, 100) * 1.18)}, 68%, ${v > 60 ? 44 : 50}%)`;
  const hhmm = m => { const t = Math.floor(m % 1440); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };

  const ICON = {
    live: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>',
    buy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/></svg>',
    build: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V10l7-6 7 6v11"/><path d="M10 21v-6h4v6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    walls: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 20h18M5 20V8h14v12"/><path d="M5 12h14"/></svg>'
  };

  /* ===================== Portrætter ===================== */
  const portraitCache = new Map();
  UI.portrait = function (a) {
    if (a.portrait) return a.portrait;
    const key = a.kind === 'pet' ? 'p' + a.species + a.color + (a.color2 || '') : JSON.stringify(a.look) + a.age;
    if (portraitCache.has(key)) return (a.portrait = portraitCache.get(key));
    let url = '';
    try {
      const v = new T.Vector3();
      if (a.kind === 'pet') { const P = M.buildPet(a); P.root.updateMatrixWorld(true); P.head.getWorldPosition(v); url = W.thumb(P.root, { portrait: true, headY: v.y, dist: 0.8 }); }
      else {
        const P = M.buildPerson(a); P.root.updateMatrixWorld(true); P.head.getWorldPosition(v);
        const ag = H.AGES[H.ageIdx(a.age)];
        url = W.thumb(P.root, { portrait: true, headY: v.y + 0.015 * ag.scale, dist: 0.6 * ag.scale * ag.head });
      }
    } catch (e) { console.warn(e); }
    portraitCache.set(key, url); a.portrait = url; return url;
  };
  const ptStyle = a => `background-image:url('${UI.portrait(a)}')`;

  /* ===================== Init ===================== */
  UI.init = function () {
    $('#btnNew').onclick = () => UI.openCAS();
    $('#btnContinue').onclick = () => UI.load();
    $('#btnHelp').onclick = () => UI.openHelp();
    bindInput();
    W.selRing = M.selectionRing(); W.scene.add(W.selRing); W.selRing.visible = false;
  };

  /* ===================== Titel ===================== */
  function randomFamily() {
    const last = H.pick(H.LAST);
    const g1 = Math.random() < 0.5 ? 'f' : 'm', g2 = g1 === 'f' ? 'm' : 'f';
    const mk = (g, age, rel) => ({ kind: 'human', first: H.pick(g === 'f' ? H.FIRST_F : H.FIRST_M), age, look: S.randomLook(g, age), traits: S.randomTraits(H.TRAIT_SLOTS[age]), asp: H.isAdult({ age }) ? H.pick(H.ASPIRATIONS).id : null, relTo: rel });
    const members = [mk(g1, 'adult', null), mk(g2, 'adult', 'gift'), mk(Math.random() < 0.5 ? 'f' : 'm', 'child', 'barn')];
    return { name: last, members, pets: [{ kind: 'pet', species: 'dog', name: H.pick(H.PET_NAMES), color: '#b07a45' }] };
  }
  UI.showTitle = function () {
    UI.state = 'title'; UI.casActive = false;
    $('#title').hidden = false; $('#hud').hidden = true; $('#cas').hidden = true;
    const fam = randomFamily(); fam.home = 'starter';
    S.newGame(Object.assign({}, fam, { members: fam.members.map(m => Object.assign({}, m, { gender: m.look.gender })) }));
    H.G.speed = 1;
    UI.loadWorld();
    W.camT.tx = 15; W.camT.tz = 14; W.camT.dist = 30; W.camT.pitch = 0.62; W.camT.yaw = 2.4;
    $('#btnContinue').hidden = !store.get();
  };

  UI.loadWorld = function () {
    while (W.agentRoot.children.length) W.agentRoot.remove(W.agentRoot.children[0]);
    while (W.objRoot.children.length) W.objRoot.remove(W.objRoot.children[0]);
    W.objMeshes = {};
    W.cars.forEach(c => W.scene.remove(c.g)); W.cars = [];
    W.rebuildWalls(); W.rebuildFloors();
    for (const o of H.G.objects) W.addObjectMesh(o);
    W.rebuildOcc();
    for (const id in H.G.agents) H.G.agents[id]._v = null;
    W.updateLamps();
  };

  /* ===================== Opret familie (CAS) ===================== */
  function newMember(g, age, rel) {
    return { kind: 'human', first: H.pick(g === 'f' ? H.FIRST_F : H.FIRST_M), age, look: S.randomLook(g, age), traits: S.randomTraits(H.TRAIT_SLOTS[age]), asp: H.isAdult({ age }) || age === 'teen' ? H.pick(H.ASPIRATIONS).id : null, relTo: rel || null };
  }
  function newPet(sp) { return { kind: 'pet', species: sp || 'dog', name: H.pick(H.PET_NAMES), color: H.pick(H.PET_COLORS), color2: null, size: 1 }; }
  const REL_OPTS = [['partner', 'Kæreste'], ['gift', 'Ægtefælle'], ['barn', 'Barn'], ['soeskende', 'Søskende'], ['foraelder', 'Forælder'], ['bofaelle', 'Bofælle']];

  UI.openCAS = function (opts) {
    opts = opts || {};
    UI.casOpts = opts;
    if (opts.edit) {
      const a = opts.edit;
      UI.casFam = { name: H.G.familyName, members: [{ kind: 'human', first: a.first, age: a.age, look: JSON.parse(JSON.stringify(a.look)), traits: a.traits.slice(), asp: a.asp }], pets: [] };
      UI.casTab = opts.only === 'clothes' ? 'clothes' : 'look';
      UI.prevSpeed = H.G.speed; H.G.speed = 0;
      $('#hud').hidden = true;
    } else {
      UI.casFam = { name: H.pick(H.LAST), members: [newMember(Math.random() < 0.5 ? 'f' : 'm', 'young')], pets: [] };
      UI.casTab = 'basic'; UI.state = 'cas';
      $('#title').hidden = true;
    }
    UI.casSel = { k: 'm', i: 0 };
    UI.casActive = true; UI.casRot = 0; UI.casAnim = 'idle';
    $('#cas').hidden = false;
    ensureCasScene(); renderCAS(); rebuildCasModel();
  };
  function casCur() { return UI.casSel.k === 'm' ? UI.casFam.members[UI.casSel.i] : UI.casFam.pets[UI.casSel.i]; }

  function ensureCasScene() {
    if (UI.casScene) return;
    const sc = new T.Scene();
    const c = document.createElement('canvas'); c.width = 4; c.height = 512; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#eaf2f5'); gr.addColorStop(0.65, '#d3e1e8'); gr.addColorStop(1, '#b9cbd6');
    x.fillStyle = gr; x.fillRect(0, 0, 4, 512);
    const bt = new T.CanvasTexture(c); bt.encoding = T.sRGBEncoding; sc.background = bt;
    sc.add(new T.HemisphereLight('#ffffff', '#9aa7b2', 0.75));
    const key = new T.DirectionalLight('#fff4e6', 1.7); key.position.set(2.5, 4.5, 3.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    const kc = key.shadow.camera; kc.left = -3; kc.right = 3; kc.top = 3; kc.bottom = -3; key.shadow.bias = -0.0005; sc.add(key);
    const fill = new T.DirectionalLight('#cfe3ff', 0.55); fill.position.set(-3, 2, 2); sc.add(fill);
    const rim = new T.DirectionalLight('#ffffff', 0.9); rim.position.set(0, 3, -4); sc.add(rim);
    const disc = new T.Mesh(new T.CylinderGeometry(1.5, 1.6, 0.14, 64), M.mat('#f4f6f7', 0.45)); disc.position.y = -0.07; disc.receiveShadow = true; sc.add(disc);
    const ring = new T.Mesh(new T.TorusGeometry(1.52, 0.025, 8, 80), M.mat('#23a08f', 0.4)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0; sc.add(ring);
    const sh = new T.Mesh(new T.PlaneGeometry(20, 20), new T.ShadowMaterial({ opacity: 0.12 })); sh.rotation.x = -Math.PI / 2; sh.position.y = -0.14; sh.receiveShadow = true; sc.add(sh);
    UI.casScene = sc; UI.casCam = new T.PerspectiveCamera(26, 1, 0.05, 50);
    UI.casHolder = new T.Group(); sc.add(UI.casHolder);
  }
  let casRebuildT = 0;
  function rebuildCasModel() {
    clearTimeout(casRebuildT);
    casRebuildT = setTimeout(() => {
      const d = casCur(); if (!d) return;
      while (UI.casHolder.children.length) UI.casHolder.remove(UI.casHolder.children[0]);
      let P;
      if (d.kind === 'pet') P = M.buildPet(d); else P = M.buildPerson(d);
      UI.casHolder.add(P.root);
      UI.casFake = { kind: d.kind, species: d.species, age: d.age, x: 0, z: 0, ry: UI.casRot, anim: UI.casAnim, mood: 50, _pose: null, _v: { P, t: 0, blink: 2, walkP: 0, prop: null, propKind: '' } };
      d._thumb = null; renderRoster();
    }, 30);
  }
  function casThumb(d) {
    if (d._thumb) return d._thumb;
    const fake = d.kind === 'pet' ? Object.assign({}, d) : { kind: 'human', look: d.look, age: d.age };
    d._thumb = UI.portrait(fake); return d._thumb;
  }
  function renderRoster() {
    const r = $('#casRoster'); if (!r) return;
    const f = UI.casFam;
    r.innerHTML = f.members.map((m, i) => `<button class="member ${UI.casSel.k === 'm' && UI.casSel.i === i ? 'on' : ''}" data-sel="m${i}"><span class="pt" style="background-image:url('${casThumb(m)}')"></span><span><div class="nm">${esc(m.first)}</div><div class="ag">${H.AGES[H.ageIdx(m.age)].name}${i > 0 && m.relTo ? ' · ' + (REL_OPTS.find(o => o[0] === m.relTo) || ['', ''])[1] : ''}</div></span>${f.members.length > 1 ? `<span class="x" data-del="m${i}" role="button" aria-label="Fjern">×</span>` : ''}</button>`).join('') +
      f.pets.map((p, i) => `<button class="member ${UI.casSel.k === 'p' && UI.casSel.i === i ? 'on' : ''}" data-sel="p${i}"><span class="pt" style="background-image:url('${casThumb(p)}')"></span><span><div class="nm">${esc(p.name)}</div><div class="ag">${p.species === 'dog' ? 'Hund' : 'Kat'}</div></span><span class="x" data-del="p${i}" role="button" aria-label="Fjern">×</span></button>`).join('');
  }
  function renderCAS() {
    const edit = UI.casOpts.edit;
    const f = UI.casFam;
    const root = $('#cas');
    root.innerHTML = `
      ${edit ? '' : `<div class="glass cas-left">
        <div><h2 class="cas-title">Opret familie</h2></div>
        <div class="cas-sub">Skab op til 6 personer og 2 kæledyr.</div>
        <div class="field"><label for="casFamName">Efternavn</label><input class="input" id="casFamName" maxlength="20" value="${esc(f.name)}"></div>
        <div class="lbl">Husstand</div>
        <div class="roster" id="casRoster"></div>
        <div class="cas-add"><button class="btn small" id="casAddP" ${f.members.length >= 6 ? 'disabled' : ''}>+ Person</button><button class="btn small" id="casAddPet" ${f.pets.length >= 2 ? 'disabled' : ''}>+ Kæledyr</button></div>
        <button class="btn small ghost" id="casRandFam">Tilfældig familie</button>
        <div class="hint">Træk i figuren for at dreje den.</div>
      </div>`}
      <div class="glass cas-right">
        <div class="tabs" id="casTabs"></div>
        <div class="cas-body" id="casBody"></div>
        <div class="cas-foot">
          <button class="btn ghost small" id="casCancel">${edit ? 'Annuller' : 'Tilbage'}</button>
          <button class="btn primary" id="casDone">${edit ? 'Gem ændringer' : 'Færdig'}</button>
        </div>
      </div>
      <div class="glass cas-tools">
        <button class="btn small" id="casRotL" aria-label="Drej venstre">⟲</button>
        <button class="btn small ${UI.casAnim === 'wave' ? 'primary' : ''}" data-anim="wave">Vink</button>
        <button class="btn small ${UI.casAnim === 'dance' ? 'primary' : ''}" data-anim="dance">Dans</button>
        <button class="btn small ${UI.casAnim === 'idle' ? 'primary' : ''}" data-anim="idle">Stå</button>
        <button class="btn small" id="casRand">Tilfældig</button>
        <button class="btn small" id="casRotR" aria-label="Drej højre">⟳</button>
      </div>`;
    renderRoster(); renderCasTabs();
    const on = (id, ev, fn) => { const e = $('#' + id); if (e) e.addEventListener(ev, fn); };
    on('casFamName', 'input', e => { f.name = e.target.value.trim() || 'Familien'; });
    on('casAddP', 'click', () => { if (f.members.length >= 6) return; const g = Math.random() < 0.5 ? 'f' : 'm'; f.members.push(newMember(g, 'young', f.members.length === 1 ? 'partner' : 'bofaelle')); UI.casSel = { k: 'm', i: f.members.length - 1 }; renderCAS(); rebuildCasModel(); });
    on('casAddPet', 'click', () => { if (f.pets.length >= 2) return; f.pets.push(newPet()); UI.casSel = { k: 'p', i: f.pets.length - 1 }; UI.casTab = 'pet'; renderCAS(); rebuildCasModel(); });
    on('casRandFam', 'click', () => { const r = randomFamily(); r.name = f.name; UI.casFam = r; UI.casSel = { k: 'm', i: 0 }; UI.casTab = 'basic'; renderCAS(); rebuildCasModel(); });
    on('casCancel', 'click', () => { if (edit) closeCAS(); else { $('#cas').hidden = true; UI.casActive = false; UI.showTitle(); } });
    on('casDone', 'click', casDone);
    on('casRotL', 'click', () => { UI.casRot -= 0.7; });
    on('casRotR', 'click', () => { UI.casRot += 0.7; });
    on('casRand', 'click', () => { const d = casCur(); if (d.kind === 'pet') { Object.assign(d, newPet(d.species), { name: d.name }); } else { const lk = S.randomLook(d.look.gender, d.age); if (UI.casOpts.only === 'clothes') { ['top', 'topColor', 'bottom', 'bottomColor', 'shoeColor'].forEach(k => d.look[k] = lk[k]); } else d.look = lk; } renderCasTabs(); rebuildCasModel(); });
    $$('[data-anim]', root).forEach(b => b.onclick = () => { UI.casAnim = b.dataset.anim; if (UI.casFake) UI.casFake.anim = UI.casAnim; $$('[data-anim]', root).forEach(x => x.classList.toggle('primary', x === b)); });
    root.onclick = (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { e.stopPropagation(); const k = del.dataset.del[0], i = +del.dataset.del.slice(1); if (k === 'm' && f.members.length > 1) f.members.splice(i, 1); if (k === 'p') f.pets.splice(i, 1); UI.casSel = { k: 'm', i: 0 }; UI.casTab = 'basic'; renderCAS(); rebuildCasModel(); return; }
      const sel = e.target.closest('[data-sel]');
      if (sel) { const k = sel.dataset.sel[0], i = +sel.dataset.sel.slice(1); UI.casSel = { k, i }; UI.casTab = k === 'p' ? 'pet' : (UI.casTab === 'pet' ? 'basic' : UI.casTab); renderRoster(); renderCasTabs(); rebuildCasModel(); }
    };
  }
  function renderCasTabs() {
    const d = casCur(); const only = UI.casOpts.only;
    let tabs;
    if (d.kind === 'pet') tabs = [['pet', 'Kæledyr']];
    else if (only === 'clothes') tabs = [['clothes', 'Tøj']];
    else if (only === 'look') tabs = [['look', 'Udseende'], ['clothes', 'Tøj']];
    else tabs = [['basic', 'Grundlæggende'], ['look', 'Udseende'], ['clothes', 'Tøj'], ['person', 'Personlighed']];
    if (!tabs.some(t => t[0] === UI.casTab)) UI.casTab = tabs[0][0];
    $('#casTabs').innerHTML = tabs.map(([id, n]) => `<button class="tab ${UI.casTab === id ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('');
    $$('#casTabs [data-tab]').forEach(b => b.onclick = () => { UI.casTab = b.dataset.tab; renderCasTabs(); });
    $('#casBody').innerHTML = casTabHTML(d);
    bindCasBody(d);
  }
  const chips = (list, cur, key, dis) => `<div class="seg">${list.map(([v, n]) => `<button class="chip ${cur === v ? 'on' : ''}" data-k="${key}" data-v="${v}" ${dis && dis(v) ? 'disabled' : ''}>${n}</button>`).join('')}</div>`;
  const swatches = (cols, cur, key) => `<div class="sw">${cols.map(c => `<button class="swatch ${cur === c ? 'on' : ''}" style="background:${c}" data-k="${key}" data-v="${c}" aria-label="Farve ${c}"></button>`).join('')}</div>`;
  function casTabHTML(d) {
    const L = d.look;
    if (d.kind === 'pet') return `
      <div class="field"><label for="casPetName">Navn</label><input class="input" id="casPetName" maxlength="16" value="${esc(d.name)}"></div>
      <div><div class="lbl">Art</div>${chips([['dog', 'Hund'], ['cat', 'Kat']], d.species, 'species')}</div>
      <div><div class="lbl">Pels</div>${swatches(H.PET_COLORS, d.color, 'color')}</div>
      <div><div class="lbl">Aftegninger</div>${swatches(['#f2ead8', '#2a221d', '#d9b380', '#8a8a8a', '#ffffff'], d.color2, 'color2')}</div>
      ${d.species === 'dog' ? `<div><div class="lbl">Størrelse</div><input type="range" class="range" min="0.75" max="1.3" step="0.05" value="${d.size || 1}" data-range="size"></div>` : ''}
      <div class="hint">Kæledyr skal have mad, kærlighed og leg. Køb en madskål og en kurv i Køb-tilstand.</div>`;
    const idx = UI.casFam.members.indexOf(d);
    if (UI.casTab === 'basic') return `
      <div class="field"><label for="casFirst">Fornavn</label><div style="display:flex;gap:6px"><input class="input" id="casFirst" maxlength="16" value="${esc(d.first)}"><button class="btn small" id="casRndName" aria-label="Tilfældigt navn">🎲</button></div></div>
      <div><div class="lbl">Køn</div>${chips([['f', 'Kvinde'], ['m', 'Mand']], L.gender, 'look.gender')}</div>
      <div><div class="lbl">Livsfase</div>${chips(H.AGES.map(a => [a.id, a.name]), d.age, 'age')}</div>
      ${idx > 0 ? `<div><div class="lbl">Forhold til ${esc(UI.casFam.members[0].first)}</div>${chips(REL_OPTS, d.relTo, 'relTo', v => (v === 'partner' || v === 'gift') && (!H.isAdult(d) || !H.isAdult(UI.casFam.members[0])))}</div>` : ''}
      <div class="hint">${H.AGES[H.ageIdx(d.age)].days === Infinity ? 'Ældre er sidste livsfase.' : `${H.AGES[H.ageIdx(d.age)].name} varer ${H.AGES[H.ageIdx(d.age)].days} dage, før personen bliver ældre.`}</div>`;
    if (UI.casTab === 'look') return `
      <div><div class="lbl">Hudfarve</div>${swatches(H.SKIN, L.skin, 'look.skin')}</div>
      <div><div class="lbl">Kropsbygning</div>${chips(H.BUILDS.map(b => [b.id, b.name]), L.build, 'look.build')}</div>
      <div><div class="lbl">Højde</div><input type="range" class="range" min="0.92" max="1.08" step="0.01" value="${L.height || 1}" data-range="look.height"></div>
      <div><div class="lbl">Frisure</div>${chips(H.HAIR_STYLES.map(s => [s.id, s.name]), L.hair, 'look.hair')}</div>
      <div><div class="lbl">Hårfarve</div>${swatches(H.HAIRCOL, L.hairColor, 'look.hairColor')}</div>
      <div><div class="lbl">Øjenfarve</div>${swatches(H.EYECOL, L.eyes, 'look.eyes')}</div>
      <div><div class="lbl">Detaljer</div>${chips(H.FACIAL.map(s => [s.id, s.name]), L.facial || 'none', 'look.facial')}</div>`;
    if (UI.casTab === 'clothes') return `
      ${d.age === 'baby' ? '<div class="hint">Babyer har en heldragt. Vælg farven herunder.</div>' : ''}
      <div><div class="lbl">Overdel</div>${chips(H.TOPS.map(s => [s.id, s.name]), L.top, 'look.top', () => d.age === 'baby')}</div>
      <div><div class="lbl">Farve på overdel</div>${swatches(H.CLOTHCOL, L.topColor, 'look.topColor')}</div>
      ${L.top === 'dress' || d.age === 'baby' ? '' : `<div><div class="lbl">Underdel</div>${chips(H.BOTTOMS.map(s => [s.id, s.name]), L.bottom, 'look.bottom')}</div>
      <div><div class="lbl">Farve på underdel</div>${swatches(H.CLOTHCOL, L.bottomColor, 'look.bottomColor')}</div>`}
      ${d.age === 'baby' ? '' : `<div><div class="lbl">Sko</div>${swatches(['#2a2a2e', '#f4f1ec', '#8b5a3c', '#c33c3c', '#3d7fc4', '#e8c34a', '#2f7a5b'], L.shoeColor, 'look.shoeColor')}</div>`}`;
    if (UI.casTab === 'person') {
      const slots = H.TRAIT_SLOTS[d.age];
      const conflict = t => d.traits.some(x => H.TRAIT_CONFLICT.some(([p, q]) => (p === t && q === x) || (q === t && p === x)));
      return `
      <div><div class="lbl">Personlighed (${d.traits.length}/${slots})</div>${slots === 0 ? '<div class="hint">Babyer får personlighed, når de vokser op.</div>' : `<div class="traits">${H.TRAITS.map(t => `<button class="trait ${d.traits.includes(t.id) ? 'on' : ''}" data-trait="${t.id}" title="${esc(t.desc)}" ${!d.traits.includes(t.id) && (d.traits.length >= slots || conflict(t.id)) ? 'disabled' : ''}><span class="ic">${t.icon}</span>${t.name}</button>`).join('')}</div>`}</div>
      ${['teen', 'young', 'adult', 'elder'].includes(d.age) ? `<div><div class="lbl">Livsmål</div><div class="asps">${H.ASPIRATIONS.map(a => `<button class="asp ${d.asp === a.id ? 'on' : ''}" data-asp="${a.id}"><span class="ic">${a.icon}</span><span><b>${a.name}</b><span>${a.desc}</span></span></button>`).join('')}</div></div>` : '<div class="hint">Livsmål vælges, når personen er teenager eller ældre.</div>'}`;
    }
    return '';
  }
  function bindCasBody(d) {
    const body = $('#casBody');
    body.onclick = (e) => {
      const b = e.target.closest('[data-k]');
      if (b && !b.disabled) {
        const k = b.dataset.k, v = b.dataset.v;
        if (k === 'age') {
          d.age = v; const slots = H.TRAIT_SLOTS[v]; d.traits = d.traits.slice(0, slots);
          while (d.traits.length < slots) { const t = S.randomTraits(1)[0]; if (!d.traits.includes(t)) d.traits.push(t); }
          if (['teen', 'young', 'adult', 'elder'].includes(v) && !d.asp) d.asp = H.pick(H.ASPIRATIONS).id;
          if (!H.isAdult(d) && (d.relTo === 'partner' || d.relTo === 'gift')) d.relTo = 'barn';
        } else if (k.startsWith('look.')) { d.look[k.slice(5)] = v; }
        else d[k] = v;
        if (k === 'look.gender') { d.first = H.pick(v === 'f' ? H.FIRST_F : H.FIRST_M); }
        renderCasTabs(); rebuildCasModel(); return;
      }
      const t = e.target.closest('[data-trait]');
      if (t && !t.disabled) { const id = t.dataset.trait; if (d.traits.includes(id)) d.traits = d.traits.filter(x => x !== id); else d.traits.push(id); renderCasTabs(); return; }
      const a = e.target.closest('[data-asp]');
      if (a) { d.asp = a.dataset.asp; renderCasTabs(); return; }
    };
    $$('[data-range]', body).forEach(r => r.oninput = () => { const k = r.dataset.range; if (k.startsWith('look.')) d.look[k.slice(5)] = +r.value; else d[k] = +r.value; rebuildCasModel(); });
    const fi = $('#casFirst'); if (fi) fi.oninput = () => { d.first = fi.value.trim() || 'Navn'; renderRoster(); };
    const pn = $('#casPetName'); if (pn) pn.oninput = () => { d.name = pn.value.trim() || 'Kæledyr'; renderRoster(); };
    const rn = $('#casRndName'); if (rn) rn.onclick = () => { d.first = H.pick(d.look.gender === 'f' ? H.FIRST_F : H.FIRST_M); renderCasTabs(); renderRoster(); };
  }
  function closeCAS() {
    UI.casActive = false; $('#cas').hidden = true;
    if (UI.casOpts.edit) { $('#hud').hidden = false; H.G.speed = UI.prevSpeed || 1; }
  }
  function casDone() {
    const f = UI.casFam;
    if (UI.casOpts.edit) {
      const a = UI.casOpts.edit; const d = f.members[0];
      a.look = d.look; a.portrait = null; A.create(a);
      closeCAS(); UI.refreshHousehold(); UI.renderPanel(true);
      note(`${a.first} har fået et nyt look.`, { icon: '✨', type: 'good' });
      return;
    }
    if (!f.members.some(m => H.isAdult(m))) { UI.toast('Familien skal have mindst én voksen (ung voksen eller ældre).'); return; }
    const value = estimateStarter();
    UI.openModal('Vælg et hjem', `
      <button class="opt" data-home="starter"><span class="ic">🏡</span><span><b>Starthus</b><span>Et hyggeligt møbleret hus med stue, køkken, bad og soveværelse.</span></span><span class="r num">${H.money(value)}</span></button>
      <button class="opt" data-home="empty"><span class="ic">🌱</span><span><b>Tom grund</b><span>Byg alt selv fra bunden. I får hele startkapitalen.</span></span><span class="r num">${H.money(0)}</span></button>
      <div class="hint">Startkapital: ${H.money(H.START_MONEY)}. Resten bliver på kontoen.</div>`, (box) => {
      $$('[data-home]', box).forEach(b => b.onclick = () => { UI.closeModal(); UI.startGame(f, b.dataset.home); });
    });
  }
  function estimateStarter() { return S.starterValue(); }

  /* ===================== Start spil ===================== */
  UI.startGame = function (f, home) {
    const fam = { name: f.name, home, members: f.members.map(m => ({ first: m.first, age: m.age, gender: m.look.gender, look: m.look, traits: m.traits, asp: m.asp, relTo: m.relTo })), pets: f.pets.map(p => ({ species: p.species, name: p.name, color: p.color, color2: p.color2, size: p.size })) };
    S.newGame(fam);
    UI.casActive = false; $('#cas').hidden = true; $('#title').hidden = true;
    UI.loadWorld(); UI.enterGame();
    W.camT.tx = home === 'starter' ? 15 : 16; W.camT.tz = home === 'starter' ? 12.5 : 12; W.camT.dist = 25; W.camT.pitch = 0.8; W.camT.yaw = 2.55;
    setTimeout(() => {
      note(`Velkommen til Hjemliv, familien ${f.name}! Klik på møbler og personer for at gøre noget.`, { icon: '🏡', type: 'big', big: true });
      if (home === 'empty') note('I har en tom grund. Gå til Byg for at opføre vægge, og til Køb for at købe møbler.', { icon: '🔨' });
      else note('Tip: Gå til Køb for at købe flere ting, og opgrader møbler for at gøre dem bedre.', { icon: '💡' });
    }, 400);
    UI.save(false);
  };
  UI.enterGame = function () {
    UI.state = 'game'; UI.mode = 'live';
    buildHUD();
    $('#hud').hidden = false;
    UI.refreshHousehold(); UI.select(H.G.selected);
    UI.lastSave = performance.now();
  };

  /* ===================== HUD ===================== */
  function buildHUD() {
    const hud = $('#hud');
    hud.innerHTML = `
      <div class="topbar">
        <div class="glass clock"><div><div class="time num" id="hTime">08:00</div><div class="day" id="hDay">Mandag</div></div>
          <div class="speeds" id="hSpeeds" role="group" aria-label="Spilhastighed">
            <button class="speed" data-s="0" title="Pause (mellemrum)">❚❚</button><button class="speed" data-s="1" title="Normal (1)">▶</button><button class="speed" data-s="2" title="Hurtig (2)">▶▶</button><button class="speed" data-s="3" title="Ekstra hurtig (3)">▶▶▶</button>
          </div></div>
        <div class="glass money" id="hMoney"><span class="coin"></span><span class="num" id="hMoneyV">0 kr</span></div>
      </div>
      <div class="modes">
        <button class="glass iconbtn wallbtn" id="hWalls" title="Skift vægvisning (V)">${ICON.walls}<span id="hWallsL">Kort</span></button>
        <div class="glass modebar" role="group" aria-label="Tilstand">
          <button class="mode on" data-m="live" title="Liv">${ICON.live}<span>Liv</span></button>
          <button class="mode" data-m="buy" title="Køb">${ICON.buy}<span>Køb</span></button>
          <button class="mode" data-m="build" title="Byg">${ICON.build}<span>Byg</span></button>
        </div>
        <button class="glass iconbtn" id="hMenuBtn" aria-label="Menu">${ICON.menu}</button>
      </div>
      <div class="glass menu" id="hMenu" hidden>
        <button data-menu="save">Gem spillet</button><button data-menu="load">Indlæs gemt spil</button>
        <button data-menu="unstick">Nulstil fastlåste personer</button>
        <button data-menu="settings">Indstillinger</button><button data-menu="help">Sådan spiller du</button>
        <button data-menu="quit">Til hovedmenuen</button>
      </div>
      <div class="glass camhint" id="hCamHint"><span><kbd>Højreklik</kbd> + træk: drej</span><span><kbd>Hjul</kbd>: zoom</span><span><kbd>W A S D</kbd>: flyt</span></div>
      <div class="notes" id="hNotes"></div>
      <div class="queue" id="hQueue"></div>
      <div class="house" id="hHouse">
        <div class="glass strip" id="hStrip"></div>
        <div class="glass selcard" id="hSel">
          <div class="selhead" id="hSelHead"></div>
          <div class="ptabs" id="hTabs"></div>
          <div class="pbody" id="hBody"></div>
        </div>
      </div>
      <div class="glass dock" id="hBuy" hidden></div>
      <div class="glass dock" id="hBuild" hidden></div>
      <div class="glass objinfo" id="hObj" hidden></div>`;
    $$('#hSpeeds [data-s]').forEach(b => b.onclick = () => UI.setSpeed(+b.dataset.s));
    $$('.modebar [data-m]').forEach(b => b.onclick = () => UI.setMode(b.dataset.m));
    $('#hWalls').onclick = cycleWalls;
    $('#hMenuBtn').onclick = () => { $('#hMenu').hidden = !$('#hMenu').hidden; };
    $$('#hMenu [data-menu]').forEach(b => b.onclick = () => { $('#hMenu').hidden = true; menuAction(b.dataset.menu); });
    setTimeout(() => { const h = $('#hCamHint'); if (h) h.hidden = true; }, 25000);
    updateWallsLabel();
  }
  function menuAction(k) {
    if (k === 'save') UI.save(true);
    if (k === 'load') { if (store.get()) UI.confirm('Indlæs det gemte spil? Ændringer siden sidst gemt går tabt.', 'Indlæs', () => UI.load()); else UI.toast('Der er intet gemt spil endnu.'); }
    if (k === 'unstick') { S.resetStuck(); if (H.G.speed === 0) UI.setSpeed(1); UI.toast('Alle personer er nulstillet og klar igen.'); UI.lastQSig = ''; }
    if (k === 'settings') UI.openSettings();
    if (k === 'help') UI.openHelp();
    if (k === 'quit') UI.confirm('Gå til hovedmenuen? Spillet gemmes først.', 'Gem og afslut', () => { UI.save(false); UI.showTitle(); });
  }
  function cycleWalls() {
    W.wallMode = { cut: 'up', up: 'down', down: 'cut' }[W.wallMode];
    updateWallsLabel();
  }
  function updateWallsLabel() { const l = $('#hWallsL'); if (l) l.textContent = { cut: 'Kort', up: 'Op', down: 'Nede' }[W.wallMode]; }
  UI.setSpeed = function (s) {
    if (!H.G) return;
    if (UI.mode !== 'live') { UI.setMode('live'); }
    H.G.speed = s;
    $$('#hSpeeds [data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s === s));
  };

  UI.refreshHousehold = function () {
    const st = $('#hStrip'); if (!st || !H.G) return;
    const ids = H.G.household.concat(H.G.pets);
    st.innerHTML = ids.map(id => { const a = H.G.agents[id]; if (!a) return ''; const mi = H.moodInfo(a.mood || 0); return `<button class="pp ${id === H.G.selected ? 'on' : ''}" data-id="${id}" style="${ptStyle(a)};--mc:${mi.color}" title="${esc(S.name(a))}">${a.atWork ? `<span class="away">${a.career && a.career.id === 'school' ? '🏫' : '💼'}</span>` : ''}</button>`; }).join('');
    $$('.pp', st).forEach(b => {
      b.onclick = () => UI.select(b.dataset.id);
      b.ondblclick = () => { const a = H.G.agents[b.dataset.id]; if (a && !a._hidden) W.focus(a.x, a.z); };
    });
  };
  UI.select = function (id) {
    if (!H.G || !H.G.agents[id]) return;
    H.G.selected = id; UI.lastSelSig = '';
    UI.refreshHousehold(); UI.renderPanel(true);
  };
  const TABS_H = [['needs', '📊', 'Behov'], ['mood', '🙂', 'Humør'], ['skills', '🎓', 'Færdigheder'], ['job', '💼', 'Job og skole'], ['rel', '👥', 'Relationer'], ['wants', '⭐', 'Ønsker og livsmål'], ['traits', '🧬', 'Personlighed']];
  const TABS_P = [['needs', '📊', 'Behov'], ['rel', '👥', 'Relationer']];
  const TABS_B = [['needs', '📊', 'Behov'], ['mood', '🙂', 'Humør'], ['rel', '👥', 'Relationer']];
  UI.renderPanel = function (full) {
    const a = H.G && H.G.agents[H.G.selected]; if (!a || !$('#hSel')) return;
    const tabs = a.kind === 'pet' ? TABS_P : a.age === 'baby' ? TABS_B : TABS_H;
    if (!tabs.some(t => t[0] === UI.tab)) UI.tab = 'needs';
    const mi = H.moodInfo(a.mood || 0);
    const age = H.AGES[H.ageIdx(a.age)];
    const status = a.atWork ? (a.career && a.career.id === 'school' ? `I skole til ${S.careerOf(a).end}:00` : `På arbejde til ${S.careerOf(a).end}:00`) : (a.kind === 'pet' ? (a.species === 'dog' ? 'Hund' : 'Kat') : `${age.name}${age.days !== Infinity && H.G.settings.aging ? ` · dag ${Math.min(a.ageDays + 1, age.days)} af ${age.days}` : ''}`);
    const headSig = a.id + mi.name + status + a.first + (a.portrait || '').length + a.age;
    if (full || UI.lastHeadSig !== headSig) {
      UI.lastHeadSig = headSig;
      $('#hSelHead').innerHTML = `<div class="bigpt" id="hBigPt" style="${ptStyle(a)};--mc:${mi.color}" title="Vis på kortet"></div><div style="min-width:0"><div class="selname">${esc(S.name(a))}</div><div class="selmeta">${esc(status)}</div><span class="moodpill" style="--mc:${mi.color}"><i></i>${mi.name}</span></div>`;
      $('#hBigPt').onclick = () => { if (!a._hidden) W.focus(a.x, a.z); };
      $('#hTabs').innerHTML = tabs.map(([id, ic, n]) => `<button class="ptab ${UI.tab === id ? 'on' : ''}" data-tab="${id}" title="${n}" aria-label="${n}">${ic}</button>`).join('');
      $$('#hTabs [data-tab]').forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; UI.renderPanel(true); });
    }
    const body = $('#hBody'); const sc = body.scrollTop;
    body.innerHTML = panelHTML(a);
    body.scrollTop = sc;
    bindPanel(a, body);
  };
  function panelHTML(a) {
    const g = H.G;
    switch (UI.tab) {
      case 'needs': {
        const keys = a.kind === 'pet' ? H.PET_NEEDS : a.age === 'baby' ? H.BABY_NEEDS : H.NEEDS.map(n => n.id);
        return `<div class="needs">${keys.map(k => { const n = H.NEEDS.find(x => x.id === k); const v = a.needs[k]; return `<div class="need"><div class="t"><span>${n.icon} ${n.name}</span><span class="num" style="color:${v < 25 ? 'var(--bad)' : 'var(--muted)'}">${Math.round(v)}</span></div><div class="bar"><i style="width:${v}%;background:${needColor(v)}"></i></div></div>`; }).join('')}</div>
          ${a.age === 'baby' ? '<p class="hint" style="margin-top:12px">Klik på babyen med en voksen for at give flaske, skifte ble, lege eller lægge den i seng.</p>' : ''}
          ${a.kind === 'pet' ? '<p class="hint" style="margin-top:12px">Klik på kæledyret med en person for at kæle, lege eller give mad.</p>' : ''}`;
      }
      case 'mood': {
        const ml = S.moodlets(a).sort((x, y) => Math.abs(y.v) - Math.abs(x.v));
        return `<h4>${H.moodInfo(a.mood).name} <span class="num" style="color:var(--muted);font-size:13px">(${a.mood > 0 ? '+' : ''}${Math.round(a.mood)})</span></h4><div class="rows">${ml.length ? ml.map(m => `<div class="moodlet ${m.v >= 0 ? 'pos' : 'neg'}"><span>${m.icon}</span><span>${esc(m.label)}${m.until ? ` <span class="hint">· ${Math.max(1, Math.round((m.until - g.time) / 60))} t</span>` : ''}</span><span class="v num">${m.v > 0 ? '+' : ''}${Math.round(m.v)}</span></div>`).join('') : '<div class="hint">Ingen særlige følelser lige nu. Humøret afhænger mest af behovene.</div>'}</div>`;
      }
      case 'skills':
        return `<div class="rows">${H.SKILLS.map(s => { const l = a.skills[s.id] || 0; const x0 = H.skillXpFor(l), x1 = H.skillXpFor(l + 1); const p = l >= 10 ? 100 : H.clamp(((a.xp[s.id] || 0) - x0) / (x1 - x0) * 100, 0, 100); return `<div class="row"><span style="width:22px">${s.icon}</span><div class="grow"><div style="display:flex;justify-content:space-between;font-weight:800;font-size:12px"><span>${s.name}</span><span class="num">Niveau ${l}</span></div><div class="pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div><div class="bar" style="height:4px;margin-top:3px"><i style="width:${p}%;background:var(--gold)"></i></div></div></div>`; }).join('')}</div>`;
      case 'job': {
        if (!a.career) return H.isAdult(a) ? `<h4>Intet job</h4><p class="hint">Find et job for at tjene penge. Hver karriere har sin egen arbejdstid og færdighed.</p><button class="btn primary small" data-do="findjob">Find et job</button>` : `<p class="hint">${a.first} er for ung til at arbejde.</p>`;
        const ci = S.careerOf(a); const school = a.career.id === 'school';
        const grade = p => p >= 85 ? '12' : p >= 70 ? '10' : p >= 50 ? '7' : p >= 30 ? '4' : '02';
        return `<h4>${ci.c.icon} ${school ? 'Skole' : esc(ci.title)}</h4><div class="kv">${school ? '' : `<b>Karriere</b><span>${ci.c.name} · niveau ${a.career.level + 1} af ${ci.c.levels.length}</span><b>Løn</b><span class="num">${H.money(ci.pay)} pr. dag</span>`}<b>Tid</b><span class="num">${String(ci.start).padStart(2, '0')}:00–${ci.end}:00, mandag–fredag</span>${school ? `<b>Karakter</b><span class="num">${grade(a.career.perf)}</span>` : `<b>Færdighed</b><span>${H.SKILLS.find(s => s.id === ci.c.skill).name} (krav til næste: ${ci.c.req[Math.min(a.career.level + 1, 5)]})</span>`}</div>
          <div style="margin-top:10px"><div class="lbl">${school ? 'Skolepræstation' : 'Præstation'}</div><div class="bar"><i style="width:${H.clamp(a.career.perf, 0, 100)}%;background:var(--accent)"></i></div><p class="hint">${school ? 'Godt humør og lektier giver bedre karakterer.' : 'Godt humør og den rigtige færdighed giver forfremmelser.'}</p></div>
          ${school ? '' : `<div style="display:flex;gap:6px"><button class="btn small" data-do="findjob">Skift job</button><button class="btn small danger" data-do="quit">Sig op</button></div>`}`;
      }
      case 'rel': {
        const list = S.knownPeople(a);
        const pets = a.kind === 'human' ? g.pets.map(id => g.agents[id]).filter(p => p && p !== a) : [];
        if (a.kind === 'pet') { const hs = g.household.map(id => g.agents[id]).filter(Boolean); return `<div class="rows">${hs.map(h => relRow(h, S.rel(a, h))).join('')}</div>`; }
        if (!list.length && !pets.length) return '<p class="hint">Ingen relationer endnu. Snak med naboerne, når de kommer forbi.</p>';
        return `<div class="rows">${list.map(x => relRow(x.a, x.r)).join('')}${pets.map(p => relRow(p, S.rel(a, p))).join('')}</div>`;
      }
      case 'wants': {
        if (a.age === 'baby') return '';
        const asp = a.asp && H.ASPIRATIONS.find(x => x.id === a.asp);
        return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h4 style="margin:0">Ønsker</h4><span class="points num">✦ ${H.fmt(a.points)} lykkepoint</span></div>
          <div class="rows">${(a.wants || []).map((w, i) => `<div class="want"><span class="st">⭐</span><span><div style="font-weight:800;font-size:13px">${esc(w.label)}</div><div class="p num">+${w.pts}</div></span><button class="x" data-reroll="${i}" title="Skift ønske" aria-label="Skift ønske">↻</button></div>`).join('') || '<div class="hint">Nye ønsker dukker op om lidt.</div>'}</div>
          ${asp ? `<h4 style="margin-top:14px">${asp.icon} ${asp.name}</h4><div class="rows">${asp.steps.map((s, i) => `<div class="step ${i < a.aspStep ? 'done' : ''}"><span class="ck">${i < a.aspStep ? '✓' : ''}</span>${esc(s.label)} <span class="hint num">+${H.ASP_POINTS[i]}</span></div>`).join('')}</div>` : ''}
          <button class="btn gold small" style="margin-top:12px" data-do="rewards">Belønninger</button>`;
      }
      case 'traits': {
        const age = H.AGES[H.ageIdx(a.age)];
        return `<div>${a.traits.map(t => { const d = H.TRAITS.find(x => x.id === t); return d ? `<span class="tchip" title="${esc(d.desc)}">${d.icon} ${d.name}</span>` : ''; }).join('') || '<span class="hint">Ingen træk endnu.</span>'}</div>
          <div class="rows" style="margin-top:6px">${a.traits.map(t => { const d = H.TRAITS.find(x => x.id === t); return d ? `<div class="hint"><b>${d.name}:</b> ${esc(d.desc)}</div>` : ''; }).join('')}</div>
          <div class="kv" style="margin-top:12px"><b>Livsfase</b><span>${age.name}</span>${age.days !== Infinity ? `<b>Næste fase</b><span>${H.G.settings.aging && !S.hasReward(a, 'evigung') ? `om ${Math.max(0, age.days - a.ageDays)} dag(e)` : 'Aldring er slået fra'}</span>` : ''}${a.rewards.length ? `<b>Belønninger</b><span>${a.rewards.map(r => H.REWARDS.find(x => x.id === r).name).join(', ')}</span>` : ''}</div>`;
      }
    }
    return '';
  }
  function relRow(b, r) {
    const fw = Math.abs(r.f) / 2, fl = r.f >= 0 ? 50 : 50 - fw;
    return `<div class="relrow"><span class="pt" style="${ptStyle(b)}"></span><div class="grow" style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800"><span>${esc(b.first)}</span><span class="hint">${esc(S.relLabel(r))}</span></div><div class="relbars"><div class="dbar" title="Venskab ${Math.round(r.f)}"><i style="left:${fl}%;width:${fw}%;background:${r.f >= 0 ? 'var(--good)' : 'var(--bad)'}"></i></div>${r.r > 0 ? `<div class="dbar" title="Romantik ${Math.round(r.r)}"><i style="left:0;width:${r.r}%;background:#e86a9a"></i></div>` : ''}</div></div></div>`;
  }
  function bindPanel(a, body) {
    $$('[data-do]', body).forEach(b => b.onclick = () => {
      const k = b.dataset.do;
      if (k === 'findjob') UI.openJobPicker(a);
      if (k === 'quit') UI.confirm(`Skal ${a.first} sige sit job op?`, 'Sig op', () => { S.setCareer(a, null); UI.renderPanel(true); });
      if (k === 'rewards') UI.openRewards(a);
    });
    $$('[data-reroll]', body).forEach(b => b.onclick = () => { S.rerollWant(a, +b.dataset.reroll); UI.renderPanel(); });
  }

  /* ===================== Notifikationer ===================== */
  function note(t, o) { UI.notify(t, o); }
  UI.notify = function (text, o) {
    o = o || {};
    if (UI.state !== 'game') return;
    const box = $('#hNotes'); if (!box) return;
    const n = document.createElement('div');
    n.className = `glass note ${o.type || ''} ${o.big ? 'big' : ''} ${o.quiet ? 'quiet' : ''}`;
    n.innerHTML = `<span class="ic">${o.icon || 'ℹ️'}</span><div style="flex:1"><div class="tx">${esc(text)}</div>${o.buttons ? `<div class="acts">${o.buttons.map((b, i) => `<button class="btn small ${i === 0 ? 'primary' : ''}" data-b="${i}">${esc(b.label)}</button>`).join('')}</div>` : ''}</div>`;
    box.prepend(n);
    const kill = () => { if (!n.parentNode) return; n.classList.add('out'); setTimeout(() => n.remove(), 400); };
    if (o.buttons) $$('[data-b]', n).forEach(b => b.onclick = (e) => { e.stopPropagation(); o.buttons[+b.dataset.b].fn(); kill(); });
    n.onclick = () => { if (o.agent && H.G.agents[o.agent]) { const a = H.G.agents[o.agent]; if (a.isHousehold) UI.select(a.id); if (!a._hidden) W.focus(a.x, a.z); } if (o.obj) { const ob = S.obj(o.obj); if (ob) { const c = W.objCenter(ob); W.focus(c.x, c.z); } } if (!o.buttons) kill(); };
    setTimeout(kill, (o.sticky ? o.sticky : o.quiet ? 4 : o.buttons ? 30 : 8) * 1000);
    while (box.children.length > 5) box.lastChild.remove();
  };
  UI.toast = function (t) {
    const d = document.createElement('div'); d.className = 'glass toast'; d.textContent = t; document.body.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  };

  /* ===================== Pie-menu ===================== */
  UI.openPie = function (cx, cy, items, title) {
    const pie = $('#pie');
    if (!items || !items.length) return;
    pie.hidden = false; UI.pieOpen = true;
    const render = (list, center, back) => {
      const n = list.length; const r = Math.max(84, Math.min(170, 46 + n * 16));
      const vw = window.innerWidth, vh = window.innerHeight;
      const x = H.clamp(cx, r * 1.3 + 90, vw - r * 1.3 - 90), y = H.clamp(cy, r + 40, vh - r - 40);
      pie.innerHTML = `<div class="pie-c" style="left:${x}px;top:${y}px"><div class="pie-center">${back ? '‹ ' : ''}${esc(center)}</div>${list.map((it, i) => { const ang = -Math.PI / 2 + i / n * Math.PI * 2; const c = Math.cos(ang); const tx = c < -0.25 ? '-100%' : c > 0.25 ? '0%' : '-50%'; const ox = 0; return `<button class="pie-item ${it.sub ? 'cat' : ''}" data-i="${i}" style="--tx:${tx};left:${c * r * 1.15 + ox}px;top:${Math.sin(ang) * r}px;animation-delay:${i * 20}ms"><span class="ic">${it.icon || '•'}</span>${esc(it.label)}</button>`; }).join('')}</div>`;
      $$('.pie-item', pie).forEach(b => b.onclick = (e) => {
        e.stopPropagation(); const it = list[+b.dataset.i];
        if (it.sub) { render(it.sub, it.label, true); return; }
        UI.closePie(); it.act && it.act();
      });
      const c = $('.pie-center', pie); c.style.cursor = back ? 'pointer' : 'default';
      c.onclick = (e) => { e.stopPropagation(); if (back) render(items, title, false); };
    };
    render(items, title || '', false);
    pie.onclick = () => UI.closePie();
    pie.oncontextmenu = (e) => { e.preventDefault(); UI.closePie(); };
  };
  UI.closePie = function () { const p = $('#pie'); p.hidden = true; p.innerHTML = ''; UI.pieOpen = false; };

  /* ===================== Modal ===================== */
  UI.openModal = function (title, html, bind, wide) {
    const m = $('#modal'); m.hidden = false; UI.modal = title;
    m.innerHTML = `<div class="glass mbox" role="dialog" aria-label="${esc(title)}" style="${wide ? 'width:min(820px,100%)' : ''}"><div class="mhead"><h2>${esc(title)}</h2><button class="btn small ghost close" aria-label="Luk">Luk</button></div><div class="mbody">${html}</div></div>`;
    $('.close', m).onclick = UI.closeModal;
    m.onclick = (e) => { if (e.target === m) UI.closeModal(); };
    if (bind) bind($('.mbox', m));
  };
  UI.closeModal = function () { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; UI.modal = null; };
  UI.confirm = function (text, okLabel, fn) {
    UI.openModal('Er du sikker?', `<p style="margin:0;font-size:15px">${esc(text)}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-c="0">Annuller</button><button class="btn primary" data-c="1">${esc(okLabel)}</button></div>`, box => {
      $$('[data-c]', box).forEach(b => b.onclick = () => { UI.closeModal(); if (b.dataset.c === '1') fn(); });
    });
  };
  UI.openJobPicker = function (a) {
    if (!H.isAdult(a)) { note(`${a.first} er for ung til at have et job.`, {}); return; }
    UI.openModal(`Job til ${a.first}`, H.CAREERS.map(c => { const l = c.levels[0]; const cur = a.career && a.career.id === c.id; return `<button class="opt" data-c="${c.id}" ${cur ? 'disabled style="opacity:.6"' : ''}><span class="ic">${c.icon}</span><span><b>${c.name}: ${l[0]}</b><span>${String(l[2]).padStart(2, '0')}:00–${l[3]}:00 · Færdighed: ${H.SKILLS.find(s => s.id === c.skill).name} · Top: ${c.levels[5][0]}</span></span><span class="r num">${H.money(l[1])}/dag</span></button>`; }).join('') + `<div class="hint">Man arbejder mandag til fredag. Bilen henter personen, og lønnen udbetales, når personen kommer hjem.</div>`, box => {
      $$('[data-c]', box).forEach(b => b.onclick = () => { S.setCareer(a, b.dataset.c); UI.closeModal(); UI.renderPanel(true); });
    });
  };
  UI.openInvite = function (a) {
    const g = H.G;
    const nbs = g.neighbors.map(id => g.agents[id]).filter(Boolean);
    const known = nbs.filter(n => S.rel(a, n).met);
    UI.openModal('Inviter på besøg', (known.length ? known : []).map(n => { const r = S.rel(a, n); const here = n.visitor && n.visitor.state !== 'away'; return `<button class="opt" data-n="${n.id}" ${here ? 'disabled style="opacity:.55"' : ''}><span class="pt" style="width:44px;height:44px;border-radius:50%;flex:none;background:#dfe6ec center/cover;${ptStyle(n)}"></span><span><b>${esc(S.name(n))}</b><span>${S.relLabel(r)} · ${H.AGES[H.ageIdx(n.age)].name}</span></span><span class="r">${here ? 'Er her' : 'Inviter'}</span></button>`; }).join('') || '<p class="hint">Du kender ingen naboer endnu. Hils på dem, når de går forbi på fortovet eller ringer på døren.</p>', box => {
      $$('[data-n]', box).forEach(b => b.onclick = () => { const n = g.agents[b.dataset.n]; UI.closeModal(); S.visit(n, { invited: true }); note(`${n.first} er på vej.`, { icon: '📨' }); });
    });
  };
  UI.openRewards = function (a) {
    const draw = () => UI.openModal(`Belønninger · ${a.first}`, `<div class="points num" style="font-size:16px">✦ ${H.fmt(a.points)} lykkepoint</div>` + H.REWARDS.map(r => { const own = S.hasReward(a, r.id); return `<button class="opt" data-r="${r.id}" ${own || a.points < r.cost ? 'disabled style="opacity:.6"' : ''}><span class="ic">🎁</span><span><b>${r.name}</b><span>${r.desc}</span></span><span class="r num">${own ? 'Ejet' : '✦ ' + H.fmt(r.cost)}</span></button>`; }).join('') + '<div class="hint">Lykkepoint optjenes ved at opfylde ønsker og livsmål.</div>', box => {
      $$('[data-r]', box).forEach(b => b.onclick = () => { if (S.buyReward(a, b.dataset.r)) { draw(); UI.renderPanel(true); } });
    });
    draw();
  };
  UI.openSettings = function () {
    const s = H.G.settings;
    const draw = () => UI.openModal('Indstillinger', `
      ${[['freeWill', 'Fri vilje', 'Personerne gør selv ting, når de ikke har noget at lave.'], ['aging', 'Aldring', 'Personerne vokser op og bliver ældre med tiden.'], ['autosave', 'Automatisk gem', 'Gemmer spillet hvert andet minut.']].map(([k, n, d]) => `<div class="toggle"><span><b>${n}</b><span>${d}</span></span><button class="sw-t ${s[k] ? 'on' : ''}" data-t="${k}" role="switch" aria-checked="${!!s[k]}" aria-label="${n}"></button></div>`).join('')}
      <div class="toggle"><span><b>Skygger i høj kvalitet</b><span>Slå fra, hvis spillet kører langsomt.</span></span><button class="sw-t ${W.sun.shadow.mapSize.x >= 2048 ? 'on' : ''}" data-t="shadows" role="switch" aria-label="Skygger"></button></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span class="hint">Familie: ${esc(H.G.familyName)} · Boligens værdi: ${H.money(S.homeValue())}</span><button class="btn small danger" data-del="1">Slet gemt spil</button></div>`, box => {
      $$('[data-t]', box).forEach(b => b.onclick = () => {
        const k = b.dataset.t;
        if (k === 'shadows') { const hi = W.sun.shadow.mapSize.x < 2048; W.sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024); if (W.sun.shadow.map) { W.sun.shadow.map.dispose(); W.sun.shadow.map = null; } }
        else s[k] = !s[k];
        draw();
      });
      $('[data-del]', box).onclick = () => { store.del(); UI.toast('Det gemte spil er slettet.'); };
    });
    draw();
  };
  UI.openHelp = function () {
    UI.openModal('Sådan spiller du', `
      <div class="keys">
        <kbd>Venstreklik</kbd><span>Vælg en handling: klik på møbler, personer, dyr eller gulvet.</span>
        <kbd>Venstre træk</kbd><span>Flyt kameraet (i Liv- og Køb-tilstand).</span>
        <kbd>Højre træk</kbd><span>Drej kameraet. <kbd>Q</kbd>/<kbd>E</kbd> drejer også.</span>
        <kbd>Hjul</kbd><span>Zoom ind og ud.</span>
        <kbd>W A S D</kbd><span>Flyt kameraet.</span>
        <kbd>Mellemrum</kbd><span>Pause. <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> vælger hastighed.</span>
        <kbd>V</kbd><span>Skift vægvisning (kort, op, nede).</span>
        <kbd>R</kbd><span>Drej et møbel, du er ved at placere.</span>
        <kbd>Esc</kbd><span>Annuller.</span>
        <kbd>Delete</kbd><span>Sælg det valgte møbel i Køb-tilstand.</span>
      </div>
      <h4 style="margin:10px 0 0;font-family:var(--f-display)">Kom godt i gang</h4>
      <div class="hint" style="font-size:13px;line-height:1.5">Hold øje med behovene nederst til venstre. Lav mad ved køleskabet, sov i sengen, og tal med andre for at fylde det sociale behov. Find et job på computeren eller via personens egen menu. Opfyld ønsker for at få lykkepoint, som kan bruges på belønninger. I Køb-tilstand kan du købe, flytte og opgradere møbler, og i Byg-tilstand kan du bygge vægge, døre, vinduer og gulve.</div>`);
  };

  /* ===================== Overlay og kvalitet ===================== */
  UI.showOverlay = function (text, btn, fn) {
    UI.hideOverlay();
    const d = document.createElement('div'); d.id = 'overlay';
    d.style.cssText = 'position:fixed;inset:0;z-index:70;display:grid;place-items:center;background:rgba(15,26,36,0.6);padding:16px';
    d.innerHTML = `<div class="glass" style="padding:22px;max-width:380px;text-align:center;display:grid;gap:14px"><div style="font-weight:800;font-size:15px">${esc(text)}</div><button class="btn primary">${esc(btn)}</button></div>`;
    d.querySelector('button').onclick = fn; document.body.appendChild(d);
  };
  UI.hideOverlay = function () { const d = document.getElementById('overlay'); if (d) d.remove(); };
  UI.lowerQuality = function () {
    W.renderer.setPixelRatio(1); W.resize();
    W.sun.shadow.mapSize.set(1024, 1024); if (W.sun.shadow.map) { W.sun.shadow.map.dispose(); W.sun.shadow.map = null; }
    W.lampLights.forEach((l, i) => { if (i >= 4) { l.visible = false; l.intensity = 0; } });
    W.lampLights.length = 4;
  };

  /* ===================== Gem og indlæs ===================== */
  UI.save = function (manual) {
    if (!H.G || UI.state !== 'game') return;
    const ok = store.set(S.serialize());
    UI.lastSave = performance.now();
    if (manual) UI.toast(ok ? 'Spillet er gemt.' : 'Spillet kunne ikke gemmes i denne browser.');
  };
  UI.load = function () {
    const s = store.get(); if (!s) return;
    let g; try { g = JSON.parse(s); } catch (e) { UI.toast('Det gemte spil kunne ikke læses.'); return; }
    if (!g || !g.agents || !g.household || !g.objects) { UI.toast('Det gemte spil er ufuldstændigt og kunne ikke indlæses.'); return; }
    UI.closeModal(); UI.closePie();
    S.attach(g); UI.loadWorld();
    if (!isFinite(g.time)) g.time = 8 * 60;
    if (!(g.speed >= 0 && g.speed <= 3)) g.speed = 1;
    for (const id in g.agents) { const a = g.agents[id]; for (const n in a.needs) if (!isFinite(a.needs[n])) a.needs[n] = 60; if (!isFinite(a.x) || !isFinite(a.z)) { a.x = H.LOT.entryX + 0.5; a.z = 7.5; } }
    S.unstick();
    $('#title').hidden = true; $('#cas').hidden = true; UI.casActive = false;
    UI.enterGame();
    const a = g.agents[g.selected]; if (a) W.focus(a.x, a.z, 24);
    note(`Velkommen tilbage, familien ${g.familyName}.`, { icon: '🏡', type: 'good' });
  };

  /* ===================== Tilstande ===================== */
  UI.setMode = function (m) {
    if (UI.state !== 'game' || m === UI.mode) return;
    cancelPlace(); clearBuildPreview(); $('#hObj').hidden = true; UI.selObj = null; UI.closePie();
    if (UI.mode === 'live') UI.liveSpeed = H.G.speed;
    UI.mode = m;
    $$('.modebar [data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    $('#hBuy').hidden = m !== 'buy'; $('#hBuild').hidden = m !== 'build';
    $('#hHouse').hidden = m !== 'live'; $('#hQueue').hidden = m !== 'live';
    W.showGrid(m !== 'live'); W.cursor.visible = false;
    if (m === 'live') { H.G.speed = UI.liveSpeed === undefined ? 1 : UI.liveSpeed; UI.save(false); }
    else H.G.speed = 0;
    $$('#hSpeeds [data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s === H.G.speed));
    if (m === 'buy') renderBuy();
    if (m === 'build') renderBuild();
  };

  /* ---------- Køb ---------- */
  UI.buyCat = 'all';
  const thumbs = {};
  function renderBuy() {
    const d = $('#hBuy');
    d.innerHTML = `<div class="tabs">${[['all', 'Alt']].concat(H.CATS.map(c => [c.id, c.name])).map(([id, n]) => `<button class="tab ${UI.buyCat === id ? 'on' : ''}" data-cat="${id}">${n}</button>`).join('')}</div>
      <div class="catgrid" id="hCat"></div><div class="dockhint">Klik på en vare og derefter på grunden. <kbd>R</kbd> drejer. Klik på et møbel, du ejer, for at flytte, opgradere eller sælge det.</div>`;
    $$('[data-cat]', d).forEach(b => b.onclick = () => { UI.buyCat = b.dataset.cat; renderBuy(); });
    const list = H.CATALOG.filter(c => UI.buyCat === 'all' || c.cat === UI.buyCat);
    const grid = $('#hCat', d);
    grid.innerHTML = list.map(c => `<button class="card ${H.G.money < c.price ? 'cant' : ''} ${UI.place && UI.place.type === c.id && !UI.place.moving ? 'on' : ''}" data-buy="${c.id}" title="${esc(c.name)}"><span class="im" data-thumb="${c.id}" style="${thumbs[c.id] ? `background-image:url('${thumbs[c.id]}')` : ''}"></span><span class="nm">${esc(c.name)}</span><span class="pr num">${H.money(c.price)}</span></button>`).join('');
    $$('[data-buy]', grid).forEach(b => b.onclick = () => startPlace(b.dataset.buy));
    // lav miniaturer lidt ad gangen
    const todo = list.filter(c => !thumbs[c.id]);
    const step = () => {
      const c = todo.shift(); if (!c) return;
      thumbs[c.id] = W.thumb(M.buildObject(c.id, 0, 7));
      const el = $(`[data-thumb="${c.id}"]`); if (el) el.style.backgroundImage = `url('${thumbs[c.id]}')`;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function makeGhost(type, tier) {
    const g = M.buildObject(type, tier || 0, 3);
    const mats = [];
    g.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = Math.min(m.material.opacity, 0.82); m.castShadow = false; m.userData.pick = false; if (m.material.emissive) mats.push(m.material); } });
    g.userData.mats = mats;
    return g;
  }
  function startPlace(type, moving) {
    cancelPlace();
    const o = moving;
    UI.place = { type, rot: o ? o.rot : (UI.lastRot || 0), moving: o || null, g: makeGhost(type, o ? o.tier : 0) };
    UI.place.foot = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: '#5bd36b', transparent: true, opacity: 0.35, depthWrite: false }));
    UI.place.foot.rotation.x = -Math.PI / 2; UI.place.foot.position.y = 0.025; UI.place.foot.renderOrder = 3;
    W.previewRoot.add(UI.place.g); W.previewRoot.add(UI.place.foot);
    UI.place.g.visible = false; UI.place.foot.visible = false;
    if (o) { const m = W.objMeshes[o.uid]; if (m) m.visible = false; }
    $('#hObj').hidden = true;
    $$('[data-buy]').forEach(b => b.classList.toggle('on', b.dataset.buy === type && !o));
  }
  function cancelPlace() {
    if (!UI.place) return;
    W.previewRoot.remove(UI.place.g); W.previewRoot.remove(UI.place.foot);
    if (UI.place.moving) { const m = W.objMeshes[UI.place.moving.uid]; if (m) m.visible = true; }
    UI.place = null;
    $$('[data-buy]').forEach(b => b.classList.remove('on'));
  }
  function updatePlace(cx, cy) {
    const p = UI.place; if (!p) return;
    const gp = W.groundPoint(cx, cy); if (!gp) return;
    const fake = { type: p.type, x: 0, z: 0, rot: p.rot }; const f = W.footprint(fake);
    p.x = Math.round(gp.x - f.w / 2); p.z = Math.round(gp.z - f.d / 2);
    fake.x = p.x; fake.z = p.z;
    const c = W.objCenter(fake);
    p.g.position.set(c.x, 0, c.z); p.g.rotation.y = p.rot * Math.PI / 2; p.g.visible = true;
    p.foot.scale.set(f.w, f.d, 1); p.foot.position.set(c.x, 0.025, c.z); p.foot.visible = true;
    const ok = S.canPlace(p.type, p.x, p.z, p.rot, p.moving ? p.moving.uid : undefined) === true;
    const afford = p.moving || H.G.money >= H.CAT_BY_ID[p.type].price;
    p.ok = ok && afford;
    p.foot.material.color.set(p.ok ? '#5bd36b' : '#ff5a4f');
    p.g.userData.mats.forEach(m => { m.emissive.set(p.ok ? '#000000' : '#ff2020'); m.emissiveIntensity = p.ok ? 0 : 0.45; });
  }
  function commitPlace() {
    const p = UI.place; if (!p || p.x === undefined) return;
    if (!p.ok) { if (!p.moving && H.G.money < H.CAT_BY_ID[p.type].price) UI.toast('Der er ikke penge nok.'); return; }
    if (p.moving) {
      const o = p.moving;
      if (S.moveObj(o, p.x, p.z, p.rot)) { cancelPlace(); selectObj(o); }
    } else {
      const o = S.buy(p.type, p.x, p.z, p.rot);
      if (o) { const c = W.objCenter(o); W.spawnSparkles(c.x, 0.6, c.z, '#ffffff', 10); UI.lastRot = p.rot; refreshCards(); }
    }
  }
  function refreshCards() { $$('[data-buy]').forEach(b => { const c = H.CAT_BY_ID[b.dataset.buy]; b.classList.toggle('cant', H.G.money < c.price); }); }
  function selectObj(o) {
    UI.selObj = o; const box = $('#hObj'); if (!o) { box.hidden = true; return; }
    const c = H.CAT_BY_ID[o.type]; box.hidden = false;
    const up = o.tier < 2 ? S.upgradeCost(o) : 0;
    box.innerHTML = `<div><h3>${esc(c.name)}</h3><span class="tierbadge t${o.tier}">${H.TIER_NAMES[o.tier]}</span>${o.broken ? ' <span class="tierbadge" style="background:#fde2df;color:#a3332a">I stykker</span>' : ''}</div>
      <div class="hint">${o.tier === 0 ? 'Opgrader for hurtigere og bedre resultater og et flottere udseende.' : o.tier === 1 ? 'Luksus går aldrig i stykker og virker bedst.' : 'Den bedste kvalitet. Går aldrig i stykker.'}</div>
      <div class="btns">
        <button class="btn small" data-o="move">Flyt</button><button class="btn small" data-o="rot">Drej</button>
        ${o.tier < 2 ? `<button class="btn small gold" data-o="up" style="grid-column:span 2" ${H.G.money < up ? 'disabled' : ''}>Opgrader til ${H.TIER_NAMES[o.tier + 1]} · ${H.money(up)}</button>` : ''}
        ${o.broken ? `<button class="btn small" data-o="fix" style="grid-column:span 2">Reparer · ${H.money(Math.round(c.price * 0.15))}</button>` : ''}
        <button class="btn small danger" data-o="sell" style="grid-column:span 2">Sælg · +${H.money(S.sellValue(o))}</button>
      </div>`;
    $$('[data-o]', box).forEach(b => b.onclick = () => {
      const k = b.dataset.o;
      if (k === 'move') startPlace(o.type, o);
      if (k === 'rot') { const nr = (o.rot + 1) % 4; if (!S.moveObj(o, o.x, o.z, nr)) UI.toast('Der er ikke plads til at dreje den her.'); selectObj(o); }
      if (k === 'up') { const cost = S.upgradeCost(o); if (H.G.money < cost) return; H.G.money -= cost; S.applyUpgrade(o); S.emit('upgrade', {}); selectObj(o); }
      if (k === 'fix') { const cost = Math.round(c.price * 0.15); if (H.G.money < cost) return; H.G.money -= cost; o.broken = false; selectObj(o); }
      if (k === 'sell') { S.sell(o); selectObj(null); refreshCards(); }
    });
  }

  /* ---------- Byg ---------- */
  UI.buildTool = 'wall'; UI.floorSel = 'oak'; UI.paintSel = 'kalk';
  const TOOLS = [['wall', '🧱', 'Væg', `${H.WALL_COST} kr/m`], ['room', '⬜', 'Rum', 'træk et rektangel'], ['door', '🚪', 'Dør', `${H.DOOR_COST} kr`], ['window', '🪟', 'Vindue', `${H.WINDOW_COST} kr`], ['arch', '⛩️', 'Åbning', `${H.ARCH_COST} kr`], ['floor', '🟫', 'Gulv', 'træk et område'], ['paint', '🎨', 'Maling', 'gratis'], ['demolish', '🔨', 'Nedriv', '50 % retur']];
  function renderBuild() {
    const d = $('#hBuild');
    d.innerHTML = `<div class="tools">${TOOLS.map(([id, ic, n, s]) => `<button class="tool ${UI.buildTool === id ? 'on' : ''}" data-tool="${id}"><span class="ic">${ic}</span>${n}<small>${s}</small></button>`).join('')}</div>
      <div class="opts" id="hOpts"></div><div class="dockhint" id="hBuildHint"></div>`;
    $$('[data-tool]', d).forEach(b => b.onclick = () => { UI.buildTool = b.dataset.tool; clearBuildPreview(); renderBuild(); });
    const opts = $('#hOpts', d);
    if (UI.buildTool === 'floor') {
      opts.innerHTML = H.FLOORS.map(f => `<button class="fopt ${UI.floorSel === f.id ? 'on' : ''}" data-f="${f.id}" title="${f.name}"><span class="im" style="background-image:url('${M.floorTex(f.id).image.toDataURL()}')"></span>${f.name}<span class="num">${f.price} kr</span></button>`).join('') + `<button class="fopt ${UI.floorSel === 'none' ? 'on' : ''}" data-f="none"><span class="im" style="background:#7fae4e"></span>Fjern gulv<span>græs</span></button>`;
      $$('[data-f]', opts).forEach(b => b.onclick = () => { UI.floorSel = b.dataset.f; renderBuild(); });
    } else if (UI.buildTool === 'paint') {
      opts.innerHTML = `<div class="sw">${H.WALLPAINTS.map(p => `<button class="swatch ${UI.paintSel === p.id ? 'on' : ''}" style="background:${p.c};width:34px;height:34px" data-p="${p.id}" title="${p.name}" aria-label="${p.name}"></button>`).join('')}</div><span class="hint">${H.WALLPAINTS.find(p => p.id === UI.paintSel).name}</span>`;
      $$('[data-p]', opts).forEach(b => b.onclick = () => { UI.paintSel = b.dataset.p; renderBuild(); });
    } else opts.innerHTML = '';
    const hints = { wall: 'Træk langs gitteret for at bygge en væg.', room: 'Træk et rektangel for at bygge fire vægge på én gang.', door: 'Klik på en væg for at sætte en dør i.', window: 'Klik på en væg for at sætte et vindue i.', arch: 'Klik på en væg for at lave en åben passage.', floor: 'Træk over fliserne for at lægge gulv.', paint: 'Klik eller træk over vægge for at male dem.', demolish: 'Træk over vægge for at rive dem ned. Du får halvdelen af prisen igen.' };
    $('#hBuildHint', d).textContent = hints[UI.buildTool];
  }
  const prevMat = new T.MeshBasicMaterial({ color: '#7fe0ff', transparent: true, opacity: 0.45, depthWrite: false });
  const prevBad = new T.MeshBasicMaterial({ color: '#ff5a4f', transparent: true, opacity: 0.45, depthWrite: false });
  function clearBuildPreview() { const keep = UI.place ? [UI.place.g, UI.place.foot] : []; W.previewRoot.children.slice().forEach(c => { if (!keep.includes(c)) W.previewRoot.remove(c); }); }
  const lotClampV = (x, z) => [H.clamp(Math.round(x), H.LOT.x0, H.LOT.x1), H.clamp(Math.round(z), H.LOT.z0, H.LOT.z1)];
  function lineEdges(a, b) {
    const out = []; const dx = b[0] - a[0], dz = b[1] - a[1];
    if (Math.abs(dx) >= Math.abs(dz)) { const z = a[1]; for (let x = Math.min(a[0], b[0]); x < Math.max(a[0], b[0]); x++) out.push(['h', x, z]); }
    else { const x = a[0]; for (let z = Math.min(a[1], b[1]); z < Math.max(a[1], b[1]); z++) out.push(['v', x, z]); }
    return out;
  }
  function rectEdges(a, b) {
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), z0 = Math.min(a[1], b[1]), z1 = Math.max(a[1], b[1]);
    if (x1 === x0 || z1 === z0) return lineEdges(a, b);
    const out = [];
    for (let x = x0; x < x1; x++) { out.push(['h', x, z0]); out.push(['h', x, z1]); }
    for (let z = z0; z < z1; z++) { out.push(['v', x0, z]); out.push(['v', x1, z]); }
    return out;
  }
  function edgeBlockedByObj(o, x, z) {
    const N = H.WORLD;
    const t1 = o === 'h' ? [x, z - 1] : [x - 1, z], t2 = [x, z];
    if (!W.inWorld(...t1) || !W.inWorld(...t2)) return false;
    const a = W.occ[t1[1] * N + t1[0]], b = W.occ[t2[1] * N + t2[0]];
    if (a > 0 && a === b) return true;
    // tæpper der krydses
    return H.G.objects.some(q => H.CAT_BY_ID[q.type].rug && W.objTiles(q).some(t => t[0] === t1[0] && t[1] === t1[1]) && W.objTiles(q).some(t => t[0] === t2[0] && t[1] === t2[1]));
  }
  function edgePreview(edges, mat, h) {
    for (const [o, x, z] of edges) {
      const m = new T.Mesh(M.boxG(1, h || H.WALL_H, 0.14), mat);
      if (o === 'h') m.position.set(x + 0.5, (h || H.WALL_H) / 2, z); else { m.position.set(x, (h || H.WALL_H) / 2, z + 0.5); m.rotation.y = Math.PI / 2; }
      W.previewRoot.add(m);
    }
  }
  function nearestEdge(gp) {
    const hz = Math.round(gp.z), hx = Math.floor(gp.x), vx = Math.round(gp.x), vz = Math.floor(gp.z);
    const dh = Math.abs(gp.z - hz), dv = Math.abs(gp.x - vx);
    return dh < dv ? ['h', hx, hz] : ['v', vx, vz];
  }
  function buildHover(cx, cy) {
    if (UI.bdrag) return buildDragMove(cx, cy);
    clearBuildPreview();
    const gp = W.groundPoint(cx, cy); if (!gp) return;
    const t = UI.buildTool;
    if (t === 'floor') { const tx = Math.floor(gp.x), tz = Math.floor(gp.z); if (W.inLot(tx, tz)) { W.cursor.visible = true; W.cursor.scale.set(1, 1, 1); W.cursor.position.set(tx + 0.5, 0.03, tz + 0.5); } else W.cursor.visible = false; return; }
    W.cursor.visible = false;
    if (t === 'wall' || t === 'room') { const v = lotClampV(gp.x, gp.z); const m = new T.Mesh(M.cylG(0.12, 0.12, 0.05, 16), prevMat); m.position.set(v[0], 0.03, v[1]); W.previewRoot.add(m); return; }
    const e = nearestEdge(gp); const w = W.wallAt(...e);
    edgePreview([e], w ? prevMat : prevBad, w ? H.WALL_H + 0.05 : 0.3);
  }
  function buildDown(cx, cy) {
    const gp = W.groundPoint(cx, cy); if (!gp) return;
    const t = UI.buildTool;
    if (t === 'wall' || t === 'room' || t === 'demolish') UI.bdrag = { a: lotClampV(gp.x, gp.z), b: lotClampV(gp.x, gp.z) };
    else if (t === 'floor') UI.bdrag = { a: [Math.floor(gp.x), Math.floor(gp.z)], b: [Math.floor(gp.x), Math.floor(gp.z)] };
    else if (t === 'paint') { UI.bdrag = { paint: true }; paintAt(gp); }
    else if (t === 'door' || t === 'window' || t === 'arch') { setOpening(nearestEdge(gp), t); }
  }
  function buildDragMove(cx, cy) {
    const gp = W.groundPoint(cx, cy); if (!gp) return;
    const t = UI.buildTool, d = UI.bdrag;
    if (d.paint) { paintAt(gp); return; }
    clearBuildPreview();
    if (t === 'floor') {
      d.b = [Math.floor(gp.x), Math.floor(gp.z)];
      const x0 = Math.max(H.LOT.x0, Math.min(d.a[0], d.b[0])), x1 = Math.min(H.LOT.x1 - 1, Math.max(d.a[0], d.b[0])), z0 = Math.max(H.LOT.z0, Math.min(d.a[1], d.b[1])), z1 = Math.min(H.LOT.z1 - 1, Math.max(d.a[1], d.b[1]));
      W.cursor.visible = true; W.cursor.scale.set(x1 - x0 + 1, z1 - z0 + 1, 1); W.cursor.position.set((x0 + x1 + 1) / 2, 0.03, (z0 + z1 + 1) / 2);
      const n = (x1 - x0 + 1) * (z1 - z0 + 1); const f = H.FLOORS.find(q => q.id === UI.floorSel);
      $('#hBuildHint').textContent = UI.floorSel === 'none' ? `Fjerner gulv på ${n} fliser.` : `${n} fliser · ${H.money(n * (f ? f.price : 0))}`;
      return;
    }
    d.b = lotClampV(gp.x, gp.z);
    const edges = t === 'room' ? rectEdges(d.a, d.b) : lineEdges(d.a, d.b);
    if (t === 'demolish') { const ex = edges.filter(e => W.wallAt(...e)); edgePreview(ex, prevBad); $('#hBuildHint').textContent = `River ${ex.length} vægstykker ned · +${H.money(ex.length * H.WALL_COST / 2)}`; return; }
    const neu = edges.filter(e => !W.wallAt(...e));
    const ok = neu.filter(e => !edgeBlockedByObj(...e));
    edgePreview(ok, H.G.money >= ok.length * H.WALL_COST ? prevMat : prevBad);
    $('#hBuildHint').textContent = `${ok.length} m væg · ${H.money(ok.length * H.WALL_COST)}`;
  }
  function buildUp() {
    const d = UI.bdrag; UI.bdrag = null; if (!d) return;
    const t = UI.buildTool; clearBuildPreview(); W.cursor.visible = false;
    if (d.paint) { renderBuild(); return; }
    if (t === 'floor') {
      const x0 = Math.max(H.LOT.x0, Math.min(d.a[0], d.b[0])), x1 = Math.min(H.LOT.x1 - 1, Math.max(d.a[0], d.b[0])), z0 = Math.max(H.LOT.z0, Math.min(d.a[1], d.b[1])), z1 = Math.min(H.LOT.z1 - 1, Math.max(d.a[1], d.b[1]));
      const f = H.FLOORS.find(q => q.id === UI.floorSel);
      let cost = 0, tiles = [];
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x + ',' + z; if (UI.floorSel === 'none') { if (H.G.floors[k]) tiles.push(k); } else if (H.G.floors[k] !== UI.floorSel) { tiles.push(k); cost += f.price; } }
      if (cost > H.G.money) { UI.toast('Der er ikke penge nok til så meget gulv.'); renderBuild(); return; }
      H.G.money -= cost;
      tiles.forEach(k => { if (UI.floorSel === 'none') delete H.G.floors[k]; else H.G.floors[k] = UI.floorSel; });
      W.rebuildFloors(); renderBuild(); return;
    }
    const edges = t === 'room' ? rectEdges(d.a, d.b) : lineEdges(d.a, d.b);
    if (t === 'demolish') {
      let refund = 0; edges.forEach(e => { const k = W.ek(...e); const w = H.G.walls[k]; if (w) { refund += (w.t === 'door' ? H.DOOR_COST : w.t === 'window' ? H.WINDOW_COST : H.WALL_COST) / 2; delete H.G.walls[k]; } });
      H.G.money += Math.round(refund);
    } else {
      const neu = edges.filter(e => !W.wallAt(...e) && !edgeBlockedByObj(...e));
      const cost = neu.length * H.WALL_COST;
      if (cost > H.G.money) { UI.toast('Der er ikke penge nok til så mange vægge.'); renderBuild(); return; }
      H.G.money -= cost;
      neu.forEach(e => { H.G.walls[W.ek(...e)] = { t: 'wall', p: UI.paintSel || 'kalk' }; });
    }
    W.rebuildWalls(); W.rebuildOcc(); S.unstick(); renderBuild();
  }
  function paintAt(gp) {
    const e = nearestEdge(gp); const k = W.ek(...e); const w = H.G.walls[k];
    if (w && w.p !== UI.paintSel) { w.p = UI.paintSel; const old = W.wallMeshes[k]; W.rebuildWalls(); }
    clearBuildPreview(); if (w) edgePreview([e], prevMat, H.WALL_H + 0.05);
  }
  function setOpening(e, type) {
    const k = W.ek(...e); const w = H.G.walls[k];
    if (!w) { UI.toast('Klik på en væg.'); return; }
    if (w.t === type) return;
    const cost = type === 'door' ? H.DOOR_COST : type === 'window' ? H.WINDOW_COST : H.ARCH_COST;
    if (H.G.money < cost) { UI.toast('Der er ikke penge nok.'); return; }
    H.G.money -= cost; w.t = type;
    W.rebuildWalls(); W.rebuildOcc();
  }

  /* ===================== Input ===================== */
  function bindInput() {
    const cv = W.renderer.domElement;
    const ptrs = new Map(); let drag = null; let pinch = null; let hoverT = 0;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      if (UI.pieOpen) { UI.closePie(); }
      try { cv.setPointerCapture(e.pointerId); } catch (er) { }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        const [p1, p2] = [...ptrs.values()];
        pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), a: Math.atan2(p2.y - p1.y, p2.x - p1.x), cx: (p1.x + p2.x) / 2, cy: (p1.y + p2.y) / 2 };
        drag = null; UI.bdrag = null; clearBuildPreview(); return;
      }
      drag = { btn: e.button, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false, touch: e.pointerType === 'touch' };
      if (UI.casActive) { drag.cas = true; return; }
      if (e.button === 0 && UI.state === 'game' && UI.mode === 'build') buildDown(e.clientX, e.clientY);
    });
    cv.addEventListener('pointermove', e => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size === 2) {
        const [p1, p2] = [...ptrs.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y), a = Math.atan2(p2.y - p1.y, p2.x - p1.x), cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
        if (UI.casActive) { UI.casZoom = H.clamp((UI.casZoom || 1) * pinch.d / d, 0.6, 1.6); }
        else { W.zoomBy(pinch.d / d); W.rotateBy(-(a - pinch.a), 0); W.panScreen(cx - pinch.cx, cy - pinch.cy); }
        pinch = { d, a, cx, cy }; return;
      }
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > (drag.touch ? 10 : 5)) drag.moved = true;
        if (drag.cas) { UI.casRot += dx * 0.012; return; }
        if (drag.btn === 2) { W.rotateBy(-dx * 0.006, dy * 0.004); return; }
        if (drag.btn === 1) { W.panScreen(dx, dy); return; }
        if (drag.btn === 0 && drag.moved) {
          if (UI.mode === 'build' && UI.bdrag) { buildHover(e.clientX, e.clientY); return; }
          if (!(UI.place && !drag.touch)) W.panScreen(dx, dy);
          if (UI.place) updatePlace(e.clientX, e.clientY);
          return;
        }
      }
      if (UI.state !== 'game' || UI.casActive) return;
      const now = performance.now();
      if (UI.mode === 'buy' && UI.place) { updatePlace(e.clientX, e.clientY); return; }
      if (UI.mode === 'build') { buildHover(e.clientX, e.clientY); return; }
      if (now - hoverT > 90) { hoverT = now; hover(e.clientX, e.clientY); }
    });
    const up = e => {
      ptrs.delete(e.pointerId);
      if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
      const d = drag; drag = null; if (!d) return;
      if (d.cas) return;
      if (UI.state !== 'game') return;
      if (d.btn === 0 && UI.mode === 'build') { buildUp(); return; }
      if (d.btn === 0 && !d.moved) click(e.clientX, e.clientY, d.touch);
      if (d.btn === 2 && !d.moved) { if (UI.place) cancelPlace(); }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => { $('#tip').hidden = true; });
    cv.addEventListener('wheel', e => { e.preventDefault(); if (UI.casActive) { UI.casZoom = H.clamp((UI.casZoom || 1) * (e.deltaY > 0 ? 1.08 : 0.93), 0.6, 1.6); return; } W.zoomBy(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
    window.addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { if (UI.modal) UI.closeModal(); else if (UI.pieOpen) UI.closePie(); else if (UI.place) cancelPlace(); else if (UI.selObj) selectObj(null); else if (UI.mode !== 'live') UI.setMode('live'); return; }
      if (UI.modal || UI.casActive || UI.state !== 'game') { if (UI.state === 'title' || UI.casActive) W.keys = {}; return; }
      W.keys[k] = true;
      if (k === ' ') { e.preventDefault(); UI.setSpeed(H.G.speed === 0 ? (UI.unpause || 1) : (UI.unpause = H.G.speed, 0)); }
      if (k === '1' || k === '2' || k === '3') UI.setSpeed(+k);
      if (k === '0' || k === 'p') UI.setSpeed(0);
      if (k === 'v') cycleWalls();
      if (k === 'r' && UI.place) { UI.place.rot = (UI.place.rot + 1) % 4; UI.lastRot = UI.place.rot; if (UI.lastPtr) updatePlace(UI.lastPtr.x, UI.lastPtr.y); }
      if ((k === 'delete' || k === 'backspace') && UI.mode === 'buy' && UI.selObj) { S.sell(UI.selObj); selectObj(null); refreshCards(); }
      if (k === 'f') { const a = H.G.agents[H.G.selected]; if (a && !a._hidden) W.focus(a.x, a.z); }
    });
    window.addEventListener('keyup', e => { W.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { W.keys = {}; });
    window.addEventListener('pointermove', e => { UI.lastPtr = { x: e.clientX, y: e.clientY }; });
  }
  function hover(cx, cy) {
    const tip = $('#tip');
    const h = W.pick(cx, cy, ['agent', 'object']);
    if (!h || h.kind === 'ground') { tip.hidden = true; return; }
    let t = '', s = '';
    if (h.kind === 'agent') {
      const a = H.G.agents[h.id]; if (!a) { tip.hidden = true; return; }
      t = S.name(a);
      const sel = H.G.agents[H.G.selected];
      if (a.isHousehold) s = a.kind === 'pet' ? (a.species === 'dog' ? 'Hund' : 'Kat') : H.AGES[H.ageIdx(a.age)].name;
      else s = sel ? S.relLabel(S.rel(sel, a)) : '';
      if (a.visitor && a.visitor.state === 'walking') s += ' · går forbi';
      const q = a.queue[0]; if (q && q.label && a.isHousehold) s += ' · ' + q.label;
    } else if (h.kind === 'object') {
      const o = S.obj(h.uid); if (!o) { tip.hidden = true; return; }
      t = H.CAT_BY_ID[o.type].name; s = H.TIER_NAMES[o.tier] + (o.broken ? ' · i stykker' : '');
    }
    tip.innerHTML = `${esc(t)}<small>${esc(s)}</small>`; tip.hidden = false;
    tip.style.left = cx + 'px'; tip.style.top = cy + 'px';
  }
  function nearAgent(x, z) {
    let best = null, bd = 0.55;
    for (const id in H.G.agents) { const a = H.G.agents[id]; if (a._hidden) continue; const d = Math.hypot(a.x - x, a.z - z); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  function click(cx, cy, touch) {
    $('#tip').hidden = true;
    if (UI.mode === 'buy') {
      if (UI.place) { if (touch) updatePlace(cx, cy); commitPlace(); return; }
      const h = W.pick(cx, cy, ['object']);
      if (h && h.kind === 'object') selectObj(S.obj(h.uid)); else selectObj(null);
      return;
    }
    if (UI.mode !== 'live') return;
    let sel = H.G.agents[H.G.selected];
    if (sel && (sel._hidden || sel.kind !== 'human' || sel.age === 'baby')) {
      const alt = H.G.household.map(id => H.G.agents[id]).find(x => x && !x._hidden && x.kind === 'human' && x.age !== 'baby');
      if (alt) { UI.select(alt.id); sel = alt; }
    }
    let h = W.pick(cx, cy, ['agent', 'object']); if (!h) return;
    if (h.kind === 'ground') { const near = nearAgent(h.x, h.z); if (near) h = { kind: 'agent', id: near.id }; }
    const away = () => note(`${sel.first} er ikke hjemme lige nu.`, { type: 'bad' });
    if (h.kind === 'agent') {
      const b = H.G.agents[h.id]; if (!b) return;
      const items = [];
      if (b.isHousehold && b.id !== H.G.selected) items.push({ label: `Vælg ${b.first}`, icon: '👆', act: () => UI.select(b.id) });
      if (sel && !sel._hidden) items.push(...S.agentMenu(sel, b));
      else if (sel && sel._hidden && b.id !== H.G.selected) { }
      if (!items.length) { if (b.isHousehold) UI.select(b.id); return; }
      if (b.isHousehold && b.id !== H.G.selected && (b.kind === 'pet' || b.age === 'baby') && items.length === 1) { UI.select(b.id); return; }
      UI.openPie(cx, cy, items, b === sel ? b.first : S.name(b));
      return;
    }
    if (!sel) return;
    if (sel._hidden) { away(); return; }
    if (sel.kind !== 'human' || sel.age === 'baby') { note(`Vælg en person, der kan ${sel.kind === 'pet' ? 'styres' : 'gå selv'}.`, {}); return; }
    if (h.kind === 'object') {
      const o = S.obj(h.uid); if (!o) return;
      const items = S.objectMenu(sel, o);
      if (!items.length) { UI.toast(`${H.CAT_BY_ID[o.type].name} kan ikke bruges af ${sel.first}.`); return; }
      UI.openPie(cx, cy, items, H.CAT_BY_ID[o.type].name);
      return;
    }
    if (h.kind === 'ground') {
      const items = S.groundMenu(sel, h.x, h.z);
      if (items.length) UI.openPie(cx, cy, items, 'Her');
      W.marker.position.set(h.x, 0.03, h.z); W.marker.visible = true; UI.markerT = 1.2;
    }
  }

  /* ===================== Bobler og løbende opdatering ===================== */
  const bubbleEls = {};
  UI.frame = function (dt) {
    // CAS-figur
    if (UI.casActive && UI.casFake) {
      UI.casFake.ry = UI.casRot; A.update(UI.casFake, dt, 1);
    }
    if (!H.G) return;
    const g = H.G;
    // bobler
    const now = performance.now(); const box = $('#bubbles');
    const seen = {};
    if (!UI.casActive) for (const id in g.agents) {
      const a = g.agents[id];
      if (a._hidden || !a._bubble || a._bubble.until < now) continue;
      const v = a._v; if (!v) continue;
      const hgt = a.kind === 'pet' ? 0.95 : (H.AGES[H.ageIdx(a.age)].scale * 2.05 + (a._pose && a._pose.h ? a._pose.h * 0.4 : 0));
      const p = W.project(a.x, (a._carriedBy ? 0.9 : 0) + hgt, a.z);
      let el = bubbleEls[id];
      if (!el) { el = document.createElement('div'); el.className = 'bub'; box.appendChild(el); bubbleEls[id] = el; }
      if (el._icon !== a._bubble.icon) { el.textContent = a._bubble.icon; el._icon = a._bubble.icon; }
      el.className = 'bub ' + (a._bubble.kind === 'speak' ? 'speak' : '');
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.display = p.vis ? '' : 'none';
      seen[id] = 1;
    }
    for (const id in bubbleEls) if (!seen[id]) { bubbleEls[id].remove(); delete bubbleEls[id]; }
    if (UI.state !== 'game') { W.selRing.visible = false; return; }
    // markering
    const sel = g.agents[g.selected];
    if (sel && !sel._hidden && UI.mode === 'live') {
      W.selRing.visible = true; W.selRing.position.set(sel.x, 0.025 + (sel._pose && sel._pose.h && sel.age === 'baby' ? sel._pose.h : 0), sel.z);
      W.selRing.material.color.set(H.moodInfo(sel.mood || 0).color);
      const s = (sel.kind === 'pet' ? 0.9 : H.AGES[H.ageIdx(sel.age)].scale) * (1 + Math.sin(now / 300) * 0.04);
      W.selRing.scale.set(s, s, s);
    } else W.selRing.visible = false;
    if (UI.markerT > 0) { UI.markerT -= dt; W.marker.visible = UI.markerT > 0; W.marker.scale.setScalar(1 + (1.2 - UI.markerT) * 0.5); W.marker.material.opacity = Math.max(0, UI.markerT); }
    // ur og penge
    UI.hudT = (UI.hudT || 0) + dt;
    if (UI.hudT > 0.2) {
      UI.hudT = 0;
      const t = $('#hTime'); if (t) {
        t.textContent = hhmm(g.time);
        $('#hDay').textContent = `${H.DAYS[S.weekday()]} · dag ${S.dayIdx() + 1}`;
        const mv = $('#hMoneyV'); mv.textContent = H.money(g.money); $('#hMoney').classList.toggle('neg', g.money < 0);
        $$('#hSpeeds [data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s === g.speed));
      }
      // kø
      const q = $('#hQueue');
      if (q && sel && UI.mode === 'live') {
        const sig = sel.id + sel.queue.map(x => x.icon + x.label + !!x.st).join('|');
        if (sig !== UI.lastQSig) {
          UI.lastQSig = sig;
          q.innerHTML = sel.queue.slice(0, 6).map((x, i) => `<button class="qi ${i === 0 ? 'cur' : ''}" data-q="${i}" title="${esc(x.label || '')}">${x.icon || '•'}<span class="cx">×</span>${i === 0 && x.label ? `<span class="qlabel">${esc(x.label)}</span>` : ''}</button>`).join('');
          $$('[data-q]', q).forEach(b => b.onclick = () => { S.cancelIdx(sel, +b.dataset.q); UI.lastQSig = ''; });
        }
        const hs = $('#hHouse'); if (hs) q.style.bottom = (hs.offsetHeight + 34) + 'px';
      }
    }
    UI.panelT = (UI.panelT || 0) + dt;
    if (UI.panelT > 0.5 && UI.mode === 'live' && !UI.modal) {
      UI.panelT = 0; UI.renderPanel(false);
      // humørfarver i strip
      $$('#hStrip .pp').forEach(b => { const a = g.agents[b.dataset.id]; if (a) b.style.setProperty('--mc', H.moodInfo(a.mood || 0).color); const away = !!a.atWork; if (!!b.querySelector('.away') !== away) UI.refreshHousehold(); });
    }
    if (UI.mode === 'buy') { UI.cardT = (UI.cardT || 0) + dt; if (UI.cardT > 1) { UI.cardT = 0; refreshCards(); } }
    // autogem
    if (g.settings.autosave && performance.now() - (UI.lastSave || 0) > 120000) UI.save(false);
  };
  UI.casCamera = function () {
    const d = casCur(); const cam = UI.casCam; if (!d) return cam;
    const vw = window.innerWidth, vh = window.innerHeight;
    cam.aspect = vw / vh;
    const z = UI.casZoom || 1;
    let ty, dist;
    if (d.kind === 'pet') { ty = 0.35; dist = 2.6 * z; }
    else { const s = H.AGES[H.ageIdx(d.age)].scale; ty = 0.86 * s + 0.05; dist = (5.6 * s + 1.0) * z; }
    cam.position.set(0, ty + 0.25, dist); cam.lookAt(0, ty, 0);
    if (vw > 900) { const left = UI.casOpts && UI.casOpts.edit ? 16 : 306; const right = 396; const gap = (left + (vw - right)) / 2; cam.setViewOffset(vw, vh, vw / 2 - gap, 0, vw, vh); }
    else { cam.setViewOffset(vw, vh, 0, vh * 0.31, vw, vh); }
    cam.updateProjectionMatrix();
    return cam;
  };
})();
