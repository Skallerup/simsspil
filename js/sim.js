/* Hjemliv — simulation */
'use strict';
(function () {
  const S = H.sim = {};
  const W = H.W, A = H.A;
  let G = null;
  const note = (txt, o) => H.UI && H.UI.notify(txt, o || {});
  S.note = note;
  const MIN_DAY = 1440;
  const tod = () => G.time % MIN_DAY;
  const dayIdx = () => Math.floor(G.time / MIN_DAY);
  const weekday = () => dayIdx() % 7;
  S.tod = tod; S.weekday = weekday; S.dayIdx = dayIdx;
  const isNight = () => { const m = tod(); return m >= 22 * 60 || m < 6 * 60; };

  /* ===================== Oprettelse ===================== */
  S.randomLook = function (gender, age, base) {
    const f = gender === 'f';
    const skin = base ? base.skin : H.pick(H.SKIN);
    const hairs = f ? ['bob', 'lang', 'hestehale', 'knold', 'kroeller', 'sidebena'] : ['kort', 'sidebena', 'pjusket', 'kroeller', 'kort', 'skaldet'];
    const top = f ? H.pick(['tshirt', 'longsleeve', 'dress', 'tank', 'hoodie', 'suit']) : H.pick(['tshirt', 'longsleeve', 'hoodie', 'suit', 'tshirt']);
    return {
      gender, skin, build: H.pick(['slim', 'medium', 'medium', 'heavy']), height: 0.96 + Math.random() * 0.08,
      hair: age === 'baby' ? 'kort' : H.pick(hairs), hairColor: base ? base.hairColor : H.pick(H.HAIRCOL.slice(0, 7)), eyes: H.pick(H.EYECOL),
      facial: !f && Math.random() < 0.3 ? H.pick(['beard', 'stache', 'glasses']) : (Math.random() < 0.15 ? 'glasses' : 'none'),
      top, topColor: H.pick(H.CLOTHCOL), bottom: f ? H.pick(['pants', 'skirt', 'shorts']) : H.pick(['pants', 'pants', 'shorts']),
      bottomColor: H.pick(['#25407a', '#22252b', '#5d6470', '#8b5a3c', '#c8b28e', '#2f7a5b']), shoeColor: H.pick(['#2a2a2e', '#f4f1ec', '#8b5a3c', '#c33c3c'])
    };
  };
  function emptySkills() { const s = {}; H.SKILLS.forEach(k => s[k.id] = 0); return s; }
  S.makePerson = function (d) {
    const id = 'a' + (G.nextId++);
    const age = d.age || 'young';
    const a = {
      id, kind: 'human', first: d.first || 'Navn', last: d.last || G.familyName || '', age, ageDays: d.ageDays || 0,
      look: d.look || S.randomLook(d.gender || 'f', age), traits: d.traits || [], asp: d.asp || null, aspStep: 0,
      needs: { hunger: 80, energy: 85, hygiene: 85, bladder: 75, fun: 70, social: 70 },
      skills: Object.assign(emptySkills(), d.skills || {}), xp: {}, career: null, points: d.points || 0, rewards: [], moodlets: [], wants: [], stats: {},
      x: 12.5, z: 10.5, ry: 0, queue: [], isHousehold: !!d.household, visitor: null, mood: 20, atWork: false
    };
    for (const k in a.skills) a.xp[k] = H.skillXpFor(a.skills[k]);
    if (['child', 'teen'].includes(age)) a.career = { id: 'school', level: 0, perf: 50 };
    G.agents[id] = a; return a;
  };
  S.makePet = function (d) {
    const id = 'a' + (G.nextId++);
    const p = { id, kind: 'pet', species: d.species || 'dog', first: d.name || H.pick(H.PET_NAMES), last: '', age: 'adult', color: d.color || H.pick(H.PET_COLORS), color2: d.color2 || null,
      needs: { hunger: 80, energy: 85, fun: 70, social: 70 }, x: 13.5, z: 11.5, ry: 0, queue: [], isHousehold: true, mood: 20, traits: [], skills: {}, stats: {}, moodlets: [] };
    G.agents[id] = p; return p;
  };
  S.name = a => a ? (a.first + (a.kind === 'human' && a.last ? ' ' + a.last : '')) : '';

  /* ===================== Starthus ===================== */
  S.setWall = (o, x, z, t, p) => { G.walls[W.ek(o, x, z)] = { t: t || 'wall', p: p || 'kalk' }; };
  S.rectWalls = function (x0, z0, x1, z1, p) {
    for (let x = x0; x < x1; x++) { S.setWall('h', x, z0, 'wall', p); S.setWall('h', x, z1, 'wall', p); }
    for (let z = z0; z < z1; z++) { S.setWall('v', x0, z, 'wall', p); S.setWall('v', x1, z, 'wall', p); }
  };
  S.addObj = function (type, x, z, rot, tier) {
    const o = { uid: G.nextUid++, type, x, z, rot: rot || 0, tier: tier || 0, broken: false, food: 0, art: 0 };
    G.objects.push(o); return o;
  };
  S.buildStarterHome = function () {
    const ext = 'graa';
    S.rectWalls(9, 9, 21, 19, ext);
    for (let z = 9; z < 19; z++) S.setWall('v', 16, z, 'wall', 'kalk');
    for (let x = 16; x < 21; x++) S.setWall('h', x, 13, 'wall', 'himmel');
    // døre og vinduer
    S.setWall('h', 12, 9, 'door', ext);
    S.setWall('v', 16, 10, 'door', 'kalk'); S.setWall('v', 16, 16, 'door', 'kalk');
    [[10], [14]].forEach(([x]) => S.setWall('h', x, 9, 'window', ext));
    S.setWall('h', 18, 9, 'window', ext);
    [[10], [13], [18], [19]].forEach(([x]) => S.setWall('h', x, 19, 'window', ext));
    S.setWall('v', 9, 12, 'window', ext); S.setWall('v', 9, 16, 'window', ext);
    S.setWall('v', 21, 15, 'window', ext); S.setWall('v', 21, 17, 'window', ext); S.setWall('v', 21, 11, 'window', ext);
    // gulve
    for (let x = 9; x < 16; x++) for (let z = 9; z < 19; z++) G.floors[x + ',' + z] = z >= 15 ? 'tile' : 'oak';
    for (let x = 16; x < 21; x++) for (let z = 9; z < 13; z++) G.floors[x + ',' + z] = 'checker';
    for (let x = 16; x < 21; x++) for (let z = 13; z < 19; z++) G.floors[x + ',' + z] = 'carpet';
    for (let z = 5; z < 9; z++) G.floors['12,' + z] = 'stone';
    // køkken
    S.addObj('fridge', 9, 18, 2); S.addObj('counter', 10, 18, 2); S.addObj('stove', 11, 18, 2); S.addObj('counter', 12, 18, 2); S.addObj('kitchen_sink', 13, 18, 2);
    S.addObj('dining_table', 12, 16, 0); S.addObj('chair', 12, 15, 0); S.addObj('chair', 13, 15, 0);
    S.addObj('plant', 15, 18, 0);
    // stue
    S.addObj('sofa', 10, 10, 0); S.addObj('tv', 10, 13, 2); S.addObj('rug', 10, 11, 0); S.addObj('floor_lamp', 9, 9, 0);
    S.addObj('bookshelf', 9, 14, 1); S.addObj('armchair', 13, 11, 3); S.addObj('palm', 15, 9, 0);
    // bad
    S.addObj('toilet', 20, 9, 3); S.addObj('shower', 20, 12, 3); S.addObj('bath_sink', 18, 12, 2);
    // soveværelse
    S.addObj('bed_double', 18, 17, 2); S.addObj('dresser', 16, 18, 1); S.addObj('nightstand', 20, 18, 2);
    S.addObj('computer', 20, 14, 3); S.addObj('plant', 16, 13, 0);
    // have
    S.addObj('tree', 6, 8, 0); S.addObj('tree', 25, 9, 0); S.addObj('tree', 24, 25, 0); S.addObj('tree', 7, 25, 0);
    [10, 11, 13, 14].forEach(x => S.addObj('flowerbed', x, 8, 0));
    S.addObj('lamp_post', 13, 6, 0); S.addObj('bench', 22, 22, 2);
    for (let x = 5; x < 9; x++) S.addObj('hedge', x, 5, 0);
    for (let x = 16; x < 27; x++) if (x !== 12) S.addObj('hedge', x, 5, 0);
  };
  S.starterValue = function () {
    const prev = G; G = { walls: {}, floors: {}, objects: [], nextUid: 1 };
    let v = 9000; try { S.buildStarterHome(); v = Math.round(S.homeValue() * 0.6); } catch (e) { }
    G = prev; return v;
  };
  S.homeValue = function () {
    let v = 0;
    for (const k in G.walls) { const w = G.walls[k]; v += w.t === 'door' ? H.DOOR_COST : w.t === 'window' ? H.WINDOW_COST : w.t === 'arch' ? H.ARCH_COST : H.WALL_COST; }
    for (const k in G.floors) v += (H.FLOORS.find(f => f.id === G.floors[k]) || { price: 10 }).price;
    for (const o of G.objects) v += H.CAT_BY_ID[o.type].price + (o.spent || 0);
    return v;
  };

  /* ===================== Nyt spil ===================== */
  S.newGame = function (fam) {
    jobs = [];
    G = H.G = {
      v: 1, familyName: fam.name || 'Familien', money: H.START_MONEY, time: 8 * 60, speed: 1,
      walls: {}, floors: {}, objects: [], nextUid: 1, nextId: 1,
      agents: {}, household: [], pets: [], neighbors: [], rel: {}, selected: null,
      settings: { freeWill: true, aging: true, autosave: true }, pizza: 0, lastBill: -1, events: {}
    };
    if (fam.home === 'starter') { S.buildStarterHome(); if ((fam.pets || []).length) { S.addObj('pet_bowl', 15, 16, 2).food = 4; S.addObj('pet_bed', 15, 12, 3); } G.money -= Math.round(S.homeValue() * 0.6); }
    G.money = Math.max(1000, Math.round(G.money));
    const ids = [];
    fam.members.forEach((m, i) => {
      const a = S.makePerson(Object.assign({}, m, { household: true, last: fam.name }));
      G.household.push(a.id); ids.push(a.id);
    });
    // relationer i husstanden (forhold er angivet i forhold til første person)
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const r = S.rel(ids[i], ids[j]); r.fam = true; r.f = 55; r.met = true;
      const ri = fam.members[i].relTo, rj = fam.members[j].relTo;
      if (i === 0 && (rj === 'partner' || rj === 'gift')) { r.fam = false; r.r = rj === 'gift' ? 80 : 60; r.f = 70; r.st = rj === 'gift' ? 'gift' : 'kæreste'; }
      else if (rj === 'bofaelle' || (i > 0 && ri === 'bofaelle')) { r.fam = false; r.f = 35; }
    }
    (fam.pets || []).forEach(p => { const pet = S.makePet(p); G.pets.push(pet.id); ids.forEach(id => { const r = S.rel(id, pet.id); r.met = true; r.f = 35; }); });
    // naboer
    for (let i = 0; i < 8; i++) {
      const g = Math.random() < 0.5 ? 'f' : 'm';
      const age = H.pick(['young', 'young', 'adult', 'adult', 'elder', 'teen', 'child']);
      const nb = S.makePerson({ first: H.pick(g === 'f' ? H.FIRST_F : H.FIRST_M), last: H.pick(H.LAST), age, gender: g, look: S.randomLook(g, age), traits: S.randomTraits(H.TRAIT_SLOTS[age]) });
      nb.visitor = { state: 'away' }; nb._hidden = true; nb.x = -2; nb.z = 4.5;
      G.neighbors.push(nb.id);
    }
    // placér husstanden
    const spots = [[12.5, 10.5], [13.5, 10.6], [12.4, 11.7], [14.2, 12.1], [11.4, 12.3], [14.6, 10.5], [13.4, 12.8], [11.6, 13.4]];
    let k = 0;
    for (const id of G.household.concat(G.pets)) {
      const a = G.agents[id]; const sp = fam.home === 'starter' ? spots[k % spots.length] : [12.5 + (k % 4), 7.5 + Math.floor(k / 4)];
      a.x = sp[0]; a.z = sp[1]; a.ry = Math.PI; k++;
      if (a.kind === 'human' && a.age !== 'baby') S.refillWants(a);
    }
    // babyer i starthuset har ingen tremmeseng; de sidder på gulvet
    G.selected = G.household.find(id => G.agents[id].age !== 'baby') || G.household[0];
    G.events.welcome = false;
    return G;
  };
  S.randomTraits = function (n) {
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 50) {
      const t = H.pick(H.TRAITS).id;
      if (out.includes(t)) continue;
      if (H.TRAIT_CONFLICT.some(([x, y]) => (x === t && out.includes(y)) || (y === t && out.includes(x)))) continue;
      out.push(t);
    }
    return out;
  };

  S.attach = function (g) {
    G = H.G = g; jobs = [];
    for (const id in G.agents) {
      const a = G.agents[id]; a.queue = []; a._pose = null; a.anim = 'idle';
      if (a.visitor && a.visitor.state !== 'away') { a.visitor = { state: 'away' }; }
      a._hidden = !!(a.atWork || (a.visitor && a.visitor.state === 'away'));
      if (a.inCrib) { const o = S.obj(a.inCrib); if (!o) a.inCrib = null; }
    }
  };

  /* ===================== Opslag ===================== */
  S.obj = uid => G.objects.find(o => o.uid === uid);
  S.ag = id => G.agents[id];
  S.present = () => Object.values(G.agents).filter(a => !a._hidden);
  S.humansPresent = () => S.present().filter(a => a.kind === 'human');
  S.has = type => G.objects.some(o => o.type === type);
  S.tileOf = a => [Math.floor(a.x), Math.floor(a.z)];
  S.rel = function (aid, bid) {
    if (aid.id) aid = aid.id; if (bid.id) bid = bid.id;
    const k = aid < bid ? aid + '|' + bid : bid + '|' + aid;
    if (!G.rel[k]) G.rel[k] = { f: 0, r: 0, st: '', fam: false, met: false };
    return G.rel[k];
  };
  S.relLabel = function (r) {
    if (r.st === 'gift') return 'Gift';
    if (r.st === 'forlovet') return 'Forlovet';
    if (r.st === 'kæreste') return 'Kæreste';
    if (r.fam) return r.f >= 50 ? 'Familie, tæt' : 'Familie';
    if (r.f >= 80) return 'Bedste ven'; if (r.f >= 50) return 'God ven'; if (r.f >= 25) return 'Ven';
    if (r.f <= -60) return 'Fjende'; if (r.f <= -20) return 'Uven';
    return r.met ? 'Bekendt' : 'Ukendt';
  };
  S.countFriends = (a, min) => Object.keys(G.rel).filter(k => k.split('|').includes(a.id) && G.rel[k].f >= min && !G.rel[k].fam).length;
  S.hasStatus = (a, sts) => Object.keys(G.rel).some(k => k.split('|').includes(a.id) && sts.includes(G.rel[k].st));
  S.partnerOf = function (a) {
    for (const k in G.rel) { const ids = k.split('|'); if (ids.includes(a.id) && ['kæreste', 'forlovet', 'gift'].includes(G.rel[k].st)) return G.agents[ids[0] === a.id ? ids[1] : ids[0]]; }
    return null;
  };
  S.knownPeople = function (a) {
    const out = [];
    for (const k in G.rel) { const ids = k.split('|'); if (!ids.includes(a.id)) continue; const o = G.agents[ids[0] === a.id ? ids[1] : ids[0]]; if (o && o.kind === 'human' && (G.rel[k].met || G.rel[k].fam)) out.push({ a: o, r: G.rel[k] }); }
    return out.sort((x, y) => (y.r.f + y.r.r) - (x.r.f + x.r.r));
  };
  S.hasTrait = (a, t) => a.traits && a.traits.includes(t);
  S.hasReward = (a, r) => a.rewards && a.rewards.includes(r);

  /* ===================== Behov, humør, færdigheder ===================== */
  function needMult(a, n) {
    let m = 1;
    if (a.kind === 'pet') return ({ hunger: 0.9, energy: 0.8, fun: 1.2, social: 1.1 })[n] || 1;
    const t = x => S.hasTrait(a, x);
    if (n === 'social') { if (t('udadvendt')) m *= 1.4; if (t('genert')) m *= 0.6; }
    if (n === 'hunger') { if (t('madglad')) m *= 1.2; if (S.hasReward(a, 'jernmave')) m *= 0.7; }
    if (n === 'energy') { if (t('aktiv')) m *= 0.92; if (t('doven')) m *= 1.12; if (S.hasReward(a, 'natteravn')) m *= 0.7; if (a.age === 'elder') m *= 1.1; }
    if (n === 'hygiene') { if (t('renlig')) m *= 0.8; if (t('sjusket')) m *= 1.3; }
    if (n === 'fun') { if (t('legesyg')) m *= 1.2; if (a.age === 'child') m *= 1.15; }
    if (n === 'bladder' && S.hasReward(a, 'staalblaere')) m *= 0.6;
    if (a.age === 'baby') m *= ({ hunger: 1.5, energy: 1.2, hygiene: 1.6, fun: 1.1, social: 1.2, bladder: 0 })[n];
    return m;
  }
  S.decay = function (a, dt) {
    const h = dt / 60; const act = a.queue[0];
    const sleeping = a.anim === 'sleep' || a.anim === 'sitsleep' || a.anim === 'passout';
    const keys = a.kind === 'pet' ? H.PET_NEEDS : (a.age === 'baby' ? H.BABY_NEEDS : Object.keys(a.needs));
    for (const n of keys) {
      let r = (a.kind === 'pet' ? { hunger: 5, energy: 4, fun: 6, social: 5 }[n] : H.NEED_DECAY[n]) * needMult(a, n);
      if (sleeping) { if (n === 'energy') r = 0; if (n === 'bladder' || n === 'hunger') r *= 0.45; if (n === 'fun' || n === 'social') r *= 0.2; }
      if (a.atWork) { r = ({ hunger: 3.5, energy: 5, hygiene: 2, bladder: 0, fun: 4.5, social: -3 })[n] || r; }
      a.needs[n] = H.clamp(a.needs[n] - r * h, 0, 100);
    }
    if (a.atWork) a.needs.bladder = Math.max(a.needs.bladder, 70);
  };
  const NEED_MOOD = [
    { n: 'hunger', lt: 20, id: 'sulten', label: 'Sulten', v: -18, icon: '🍽️' }, { n: 'energy', lt: 18, id: 'traet', label: 'Udmattet', v: -18, icon: '😪' },
    { n: 'hygiene', lt: 18, id: 'lugter', label: 'Lugter', v: -14, icon: '🦨' }, { n: 'bladder', lt: 18, id: 'tisse', label: 'Skal tisse', v: -16, icon: '🚽' },
    { n: 'fun', lt: 18, id: 'keder', label: 'Keder sig', v: -14, icon: '😑' }, { n: 'social', lt: 18, id: 'ensom', label: 'Ensom', v: -14, icon: '😔' }
  ];
  S.moodlets = function (a) {
    const out = (a.moodlets || []).filter(m => m.until > G.time).map(m => ({ label: m.label, v: m.v, icon: m.icon, until: m.until }));
    if (a.kind === 'human') {
      for (const nm of NEED_MOOD) { if (a.needs[nm.n] !== undefined && a.needs[nm.n] < nm.lt && !(a.age === 'baby' && nm.n === 'bladder')) out.push({ label: nm.label, v: nm.v * (nm.n === 'hygiene' && S.hasTrait(a, 'renlig') ? 1.6 : nm.n === 'hygiene' && S.hasTrait(a, 'sjusket') ? 0.2 : 1), icon: nm.icon }); }
      if (S.hasTrait(a, 'munter')) out.push({ label: 'Munter natur', v: 10, icon: '😄' });
      if (S.hasReward(a, 'godthumoer')) out.push({ label: 'Altid godt humør', v: 15, icon: '🌈' });
      const dec = G._decor || 0;
      if (!a.atWork && W.isIndoor(Math.floor(a.x), Math.floor(a.z))) {
        if (dec >= 1.4) out.push({ label: 'Smukt hjem', v: 12, icon: '🏡' }); else if (dec >= 0.7) out.push({ label: 'Hyggeligt hjem', v: 6, icon: '🪴' });
      }
      if (G.objects.some(o => o.broken)) out.push({ label: 'Noget er gået i stykker', v: -5, icon: '🔧' });
    }
    return out;
  };
  S.addMoodlet = function (a, id, label, v, hours, icon) {
    a.moodlets = (a.moodlets || []).filter(m => m.id !== id && m.until > G.time);
    a.moodlets.push({ id, label, v, until: G.time + hours * 60, icon: icon || (v >= 0 ? '😊' : '😞') });
  };
  S.computeMood = function (a) {
    const keys = a.kind === 'pet' ? H.PET_NEEDS : (a.age === 'baby' ? H.BABY_NEEDS : Object.keys(a.needs));
    let s = 0, wsum = 0;
    for (const n of keys) { const w = n === 'hunger' || n === 'energy' || n === 'bladder' ? 1.3 : 1; s += a.needs[n] * w; wsum += w; }
    let m = (s / wsum - 50) * 1.05;
    for (const ml of S.moodlets(a)) m += ml.v;
    a.mood = H.clamp(m, -100, 100);
    return a.mood;
  };
  S.addXp = function (a, skill, amt) {
    if (!a.skills || a.skills[skill] === undefined) return;
    let m = 1;
    const tm = { creativity: 'kreativ', logic: 'noerd', fitness: 'aktiv', cooking: 'madglad' };
    if (tm[skill] && S.hasTrait(a, tm[skill])) m *= 1.5;
    if (skill === 'fitness' && S.hasTrait(a, 'doven')) m *= 0.6;
    if (S.hasReward(a, 'hurtiglaerer')) m *= 1.5;
    if (a.age === 'child') m *= 1.25;
    if (a.mood > 40) m *= 1.15;
    a.xp[skill] = (a.xp[skill] || 0) + amt * m;
    const lvl = a.skills[skill];
    if (lvl < 10 && a.xp[skill] >= H.skillXpFor(lvl + 1)) {
      a.skills[skill] = lvl + 1;
      const sk = H.SKILLS.find(s => s.id === skill);
      note(`${a.first} har nået ${sk.name} niveau ${lvl + 1}`, { icon: sk.icon, agent: a.id, type: 'good' });
      S.bubble(a, sk.icon, 3);
      W.spawnSparkles(a.x, 2, a.z, '#9fe0ff', 16);
      S.emit('skill', { a, skill, level: lvl + 1 });
    }
  };
  S.bubble = function (a, icon, secs = 3, kind = 'think') { a._bubble = { icon, until: performance.now() + secs * 1000, kind }; };

  /* ===================== Handlinger ===================== */
  S.queue = function (a, act, user) {
    if (!a || a._hidden) return false;
    act.user = !!user;
    if (user) {
      // spillerens kommandoer erstatter autonome handlinger
      if (a.queue.length && a.queue[0].auto) S.cancelIdx(a, 0);
      a.queue = a.queue.filter((q, i) => i === 0 || !q.auto);
      if (a.queue.length >= 6) { note('Køen er fuld.', { type: 'bad' }); return false; }
    }
    a.queue.push(act);
    return true;
  };
  S.cancelIdx = function (a, i) {
    const act = a.queue[i]; if (!act) return;
    if (i === 0 && act.st) { act.cancel = true; }
    else a.queue.splice(i, 1);
  };
  S.clearAll = function (a) {
    const act = a.queue[0];
    if (act && act.st) endAct(a, act, true);
    a.queue = []; standUp(a); a.anim = 'idle';
  };
  function standUp(a) {
    if (a._pose && a._pose.back) { a.x = a._pose.back.x; a.z = a._pose.back.z; }
    a._pose = null;
  }

  function speedOf(a) {
    if (a.kind === 'pet') return a.species === 'cat' ? 2.0 : 2.3;
    const b = { child: 1.35, teen: 1.6, young: 1.65, adult: 1.6, elder: 1.15, baby: 0 }[a.age] || 1.6;
    return a.anim === 'run' ? b * 1.8 : b;
  }
  S.routeTo = function (a, goals, opt) {
    const [sx, sz] = S.tileOf(a);
    const p = W.findPath(sx, sz, goals, opt);
    if (!p) return null;
    a._path = p.slice(1).map(([x, z]) => ({ x: x + 0.5, z: z + 0.5 }));
    return p[p.length - 1];
  };
  function walk(a, dt, finalPt) {
    if (finalPt && a._path) { if (a._path.length) a._path[a._path.length - 1] = finalPt; else a._path.push(finalPt); finalPt = null; }
    if (!a._path || !a._path.length) { return true; }
    let dist = speedOf(a) * dt;
    a.anim = a._runNext ? 'run' : 'walk';
    while (dist > 0 && a._path.length) {
      const t = a._path[0]; const dx = t.x - a.x, dz = t.z - a.z; const d = Math.hypot(dx, dz);
      if (d < 1e-4) { a._path.shift(); continue; }
      a.ry = Math.atan2(dx, dz);
      if (d <= dist) { a.x = t.x; a.z = t.z; a._path.shift(); dist -= d; }
      else { a.x += dx / d * dist; a.z += dz / d * dist; dist = 0; }
    }
    if (!a._path.length) { a.anim = 'idle'; return true; }
    return false;
  }
  function snap(a, dt, to, ry) {
    const dx = to.x - a.x, dz = to.z - a.z, d = Math.hypot(dx, dz);
    const step = dt * 2.2;
    if (d <= step) { a.x = to.x; a.z = to.z; if (ry !== undefined) a.ry = ry; return true; }
    a.x += dx / d * step; a.z += dz / d * step; a.anim = 'walk';
    if (d > 0.2) a.ry = Math.atan2(dx, dz); else if (ry !== undefined) a.ry = ry;
    return false;
  }
  const faceTo = (a, x, z) => { a.ry = Math.atan2(x - a.x, z - a.z); };

  // finder en brugsplads ved et objekt
  S.findSpot = function (a, o, filter) {
    const c = H.CAT_BY_ID[o.type]; const cands = [];
    o._res = o._res || {};
    (c.spots || []).forEach((sp, si) => {
      if (filter && !filter(sp, si)) return;
      const r = o._res[si]; if (r && r !== a.id && G.agents[r] && G.agents[r].queue[0] && G.agents[r].queue[0]._resUid === o.uid) return;
      [sp.t].concat(sp.alt || []).forEach(t => {
        const [tx, tz] = W.localTile(o, t[0], t[1]);
        if (!W.inWorld(tx, tz) || (!W.free(tx, tz) && !(Math.floor(a.x) === tx && Math.floor(a.z) === tz && W.occ[tz * H.WORLD + tx] === 0))) return;
        if (!W.free(tx, tz)) return;
        // væg mellem plads og objekt?
        const adj = W.objTiles(o).find(([ox, oz]) => Math.abs(ox - tx) + Math.abs(oz - tz) === 1);
        if (adj && !W.canStep(tx, tz, adj[0], adj[1])) return;
        cands.push({ si, sp, tile: [tx, tz] });
      });
    });
    if (!cands.length) return S.adjacentSpot(a, o);
    const [sx, sz] = S.tileOf(a);
    const path = W.findPath(sx, sz, cands.map(c => c.tile));
    if (!path) return null;
    const end = path[path.length - 1];
    const ch = cands.find(c => c.tile[0] === end[0] && c.tile[1] === end[1]);
    return spotInfo(o, ch);
  };
  function spotInfo(o, ch) {
    const sp = ch.sp; const pos = W.l2w(o, sp.p[0], sp.p[1]); const ctr = W.objCenter(o);
    let ry, pose;
    const rot = W.rotY(o);
    switch (sp.kind) {
      case 'stand': ry = Math.atan2(ctr.x - pos.x, ctr.z - pos.z); pose = null; break;
      case 'sit': ry = rot + (sp.face === 'in' ? Math.PI : 0); pose = { kind: 'sit', h: sp.h || 0.45 }; break;
      case 'lie': ry = rot; pose = { kind: 'lie', h: sp.h || 0.55 }; break;
      case 'bath': ry = rot; pose = { kind: 'bath', h: sp.h || 0.15 }; break;
      case 'inside': ry = rot; pose = { kind: 'inside' }; break;
      case 'onobj': ry = rot + Math.PI; pose = { kind: 'onobj', h: sp.h || 0.12 }; break;
      default: ry = rot; pose = null;
    }
    return { si: ch.si, tile: ch.tile, pos, ry, pose, back: { x: ch.tile[0] + 0.5, z: ch.tile[1] + 0.5 } };
  }
  // en ledig flise ved siden af objektet (til reparation m.m.)
  S.adjacentSpot = function (a, o) {
    const goals = [];
    for (const [ox, oz] of W.objTiles(o)) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const tx = ox + dx, tz = oz + dz; if (W.free(tx, tz) && W.canStep(tx, tz, ox, oz)) goals.push([tx, tz]);
    }
    if (!goals.length) return null;
    const [sx, sz] = S.tileOf(a); const path = W.findPath(sx, sz, goals); if (!path) return null;
    const e = path[path.length - 1]; const ctr = W.objCenter(o);
    const pos = { x: e[0] + 0.5, z: e[1] + 0.5 };
    return { si: -1, tile: e, pos, ry: Math.atan2(ctr.x - pos.x, ctr.z - pos.z), pose: null, back: pos };
  };

  /* --- Byggesten: handling bestående af etaper --- */
  // stage: {uid, spot?, tile?, face?, anim, dur, full, eff, skill, xp, onDone, label, need}
  S.mkIx = function (o, ix, extra) {
    const c = H.CAT_BY_ID[o.type];
    const base = { type: 'stages', label: ix.label, icon: ix.icon, uid: o.uid, ixId: ix.id };
    if (ix.special === 'cook') return Object.assign(base, { stages: null, build: 'cook' }, extra);
    if (ix.special === 'watch') return Object.assign(base, { stages: null, build: 'watch' }, extra);
    if (ix.special === 'pizza') return Object.assign(base, { stages: null, build: 'pizza' }, extra);
    return Object.assign(base, { stages: [{ uid: o.uid, anim: ix.anim, dur: ix.dur, full: ix.full, eff: ix.eff, skill: ix.skill, xp: ix.xp, ix }] }, extra);
  };
  S.mkObjSpecial = function (o, kind) {
    const c = H.CAT_BY_ID[o.type];
    if (kind === 'repair') return { type: 'stages', label: 'Reparer ' + c.name.toLowerCase(), icon: '🔧', uid: o.uid, stages: [{ uid: o.uid, adjacent: true, anim: 'use', dur: Math.max(15, 45 - (G.agents[G.selected] ? G.agents[G.selected].skills.handy * 3 : 0)), skill: 'handy', xp: 1.6, onDone: (a) => { o.broken = false; note(`${a.first} har repareret ${c.name.toLowerCase()}.`, { icon: '🔧', type: 'good' }); S.emit('repair', { a }); } }] };
    if (kind === 'upgrade') {
      const cost = S.upgradeCost(o);
      return { type: 'stages', label: `Opgrader til ${H.TIER_NAMES[o.tier + 1]}`, icon: '⬆️', uid: o.uid, cost, stages: [{ uid: o.uid, adjacent: true, anim: 'use', dur: 40, skill: 'handy', xp: 1.4, onDone: (a) => { S.applyUpgrade(o); note(`${a.first} har opgraderet ${c.name.toLowerCase()} til ${H.TIER_NAMES[o.tier]}.`, { icon: '⬆️', type: 'good' }); S.emit('upgrade', { a }); } }] };
    }
    if (kind === 'clean') return null;
  };
  S.upgradeCost = o => Math.round(H.CAT_BY_ID[o.type].price * (o.tier === 0 ? 0.6 : 0.95));
  S.applyUpgrade = function (o) {
    o.spent = (o.spent || 0) + S.upgradeCost(o);
    o.tier = Math.min(2, o.tier + 1); o.broken = false; W.addObjectMesh(o);
    W.spawnSparkles(W.objCenter(o).x, 1, W.objCenter(o).z, '#ffd56a', 20);
  };

  function buildStages(a, act) {
    const o = S.obj(act.uid);
    if (act.build === 'cook') {
      const st = [];
      const nearest = (types) => { let best = null, bd = 1e9; for (const x of G.objects) if (types.includes(x.type) && !x.broken) { const c = W.objCenter(x); const d = Math.hypot(c.x - a.x, c.z - a.z); if (d < bd) { bd = d; best = x; } } return best; };
      const fridge = o && o.type === 'fridge' ? o : nearest(['fridge']);
      const stove = o && (o.type === 'stove' || o.type === 'grill') ? o : nearest(['stove', 'grill']);
      if (!stove) { note('Der skal et komfur eller en grill til at lave mad. Tager en snack i stedet.', { icon: '🍳', type: 'bad' }); }
      if (fridge) st.push({ uid: fridge.uid, anim: 'use', dur: 3, label: 'Henter råvarer' });
      if (stove) st.push({ uid: stove.uid, anim: 'cook', dur: 26, skill: 'cooking', xp: 1.4, eff: { fun: 0.08 }, cookStage: true, onDone: (a2, stg) => {
        const q = 0.45 + a2.skills.cooking * 0.06 + (stove.tier || 0) * 0.1 + Math.random() * 0.1;
        const burnt = Math.random() < Math.max(0, 0.12 - a2.skills.cooking * 0.03);
        act._quality = burnt ? 0.25 : Math.min(1.3, q);
        if (burnt) { S.bubble(a2, '🔥', 3); note(`${a2.first} brændte maden på.`, { icon: '🔥', type: 'bad' }); }
        S.breakCheck(stove);
      } });
      st.push({ seat: 'eat', anim: 'eat', dur: 16, eat: true, onDone: (a2) => {
        const q = act._quality || (stove ? 0.7 : 0.35);
        if (q >= 1.0) S.addMoodlet(a2, 'meal', 'Lækkert måltid', 14, 4, '😋'); else if (q >= 0.6) S.addMoodlet(a2, 'meal', 'Mæt og tilfreds', 6, 3, '🙂'); else S.addMoodlet(a2, 'meal', 'Ulækker mad', -8, 3, '🤢');
        a2.stats.cook = (a2.stats.cook || 0) + 1;
        S.emit('ix', { a: a2, ix: 'cook' });
      } });
      act._eatGain = 1;
      return st;
    }
    if (act.build === 'pizza') {
      if (G.pizza > 0) return [{ seat: 'eat', anim: 'eat', dur: 14, eat: true, pizza: true, onDone: (a2) => { S.addMoodlet(a2, 'meal', 'Pizza!', 8, 3, '🍕'); S.emit('ix', { a: a2, ix: 'pizza' }); } }];
      if (G.money < 140) { note('Der er ikke penge nok til pizza.', { type: 'bad' }); return null; }
      if (G._pizzaOrder) { note('Pizzaen er allerede bestilt.', { icon: '🍕' }); return null; }
      G.money -= 140; G._pizzaOrder = G.time + 45;
      note('Pizzaen er bestilt og kommer om ca. 45 minutter.', { icon: '🍕' });
      return [{ uid: act.uid, anim: 'phone', dur: 3 }];
    }
    if (act.build === 'watch') {
      const seat = S.findTvSeat(a, o);
      const stg = { anim: 'tv', dur: 60, eff: { fun: 0.75 * H.TIER_MULT[o.tier || 0] }, tvUid: o.uid, funKind: 'tv' };
      if (seat) { stg.uid = seat.o.uid; stg.forceSpot = seat.si; }
      else { stg.tile = seat === null ? S.tvStandTile(o) : null; stg.anim = 'idle'; stg.face = W.objCenter(o); stg.eff = { fun: 0.5 }; if (!stg.tile) return null; }
      return [stg];
    }
    return act.stages;
  }
  S.findTvSeat = function (a, tv) {
    const c = W.objCenter(tv); const th = W.rotY(tv); const fx = Math.sin(th), fz = Math.cos(th);
    let best = null, bs = -1e9;
    for (const o of G.objects) {
      const cat = H.CAT_BY_ID[o.type]; if (!cat.seat || o.broken) continue;
      cat.spots.forEach((sp, si) => {
        const p = W.l2w(o, sp.p[0], sp.p[1]); const dx = p.x - c.x, dz = p.z - c.z; const d = Math.hypot(dx, dz);
        if (d < 1.2 || d > 7) return;
        if ((dx * fx + dz * fz) / d < 0.5) return;
        const sth = W.rotY(o); if ((-dx * Math.sin(sth) - dz * Math.cos(sth)) / d < 0.4) return;
        o._res = o._res || {}; const r = o._res[si]; if (r && r !== a.id && G.agents[r] && G.agents[r].queue[0] && G.agents[r].queue[0]._resUid === o.uid) return;
        const sc = -Math.abs(d - 3) - Math.hypot(p.x - a.x, p.z - a.z) * 0.1 + (cat.id === 'chair' ? -2 : 0);
        if (sc > bs) { bs = sc; best = { o, si }; }
      });
    }
    return best;
  };
  S.tvStandTile = function (tv) {
    for (const d of [2, 3, 1]) { const p = W.l2w(tv, 0, d); const t = [Math.floor(p.x), Math.floor(p.z)]; if (W.free(t[0], t[1])) return t; }
    return null;
  };
  S.findEatSeat = function (a) {
    let best = null, bd = 1e9;
    for (const o of G.objects) {
      const cat = H.CAT_BY_ID[o.type]; if (!cat.seat || o.broken) continue;
      const ctr = W.objCenter(o); const d = Math.hypot(ctr.x - a.x, ctr.z - a.z);
      let bonus = 0;
      if (o.type === 'chair') { const fr = W.l2w(o, 0, 1); const t = [Math.floor(fr.x), Math.floor(fr.z)]; const id = W.occ[t[1] * H.WORLD + t[0]]; const to = id > 0 && S.obj(id); if (to && (H.CAT_BY_ID[to.type].table || to.type === 'coffee_table')) bonus = -8; }
      else bonus = 3;
      for (let si = 0; si < cat.spots.length; si++) {
        o._res = o._res || {}; const r = o._res[si]; if (r && r !== a.id && G.agents[r] && G.agents[r].queue[0] && G.agents[r].queue[0]._resUid === o.uid) continue;
        if (d + bonus < bd) { bd = d + bonus; best = { o, si }; }
      }
    }
    return best;
  };

  function startStage(a, act) {
    const stg = act.stages[act.si];
    if (!stg) return 'done';
    act.ph = 'walk'; act.t = 0; act._spot = null;
    if (stg.seat === 'eat') {
      const s = S.findEatSeat(a);
      if (s) { stg.uid = s.o.uid; stg.forceSpot = s.si; }
      else { stg.tile = S.tileOf(a); stg.anim = 'eatstand'; }
    }
    if (stg.uid) {
      const o = S.obj(stg.uid); if (!o) return 'fail';
      let spot = null;
      if (stg.adjacent) spot = S.adjacentSpot(a, o);
      else if (stg.forceSpot !== undefined) spot = S.findSpot(a, o, (sp, si) => si === stg.forceSpot);
      else spot = S.findSpot(a, o);
      if (!spot) return 'fail';
      if (spot.si >= 0) { o._res = o._res || {}; o._res[spot.si] = a.id; act._resUid = o.uid; act._resSi = spot.si; }
      act._spot = spot;
      if (!S.routeTo(a, [spot.tile])) return 'fail';
    } else if (stg.tile) {
      const pos = { x: stg.tile[0] + 0.5, z: stg.tile[1] + 0.5 };
      act._spot = { tile: stg.tile, pos, ry: stg.face ? Math.atan2(stg.face.x - pos.x, stg.face.z - pos.z) : a.ry, pose: null, back: pos };
      if (!S.routeTo(a, [stg.tile])) return 'fail';
    }
    return 'ok';
  }
  function releaseRes(a, act) {
    if (act._resUid) { const o = S.obj(act._resUid); if (o && o._res && o._res[act._resSi] === a.id) delete o._res[act._resSi]; act._resUid = null; }
  }

  const H_ = {};
  H_.stages = {
    start(a, act) {
      if (act.cost) { if (G.money < act.cost) { note('Der er ikke penge nok.', { type: 'bad' }); return false; } G.money -= act.cost; act._paid = true; }
      if (!act.stages) act.stages = buildStages(a, act);
      if (!act.stages || !act.stages.length) return false;
      act.si = 0; const r = startStage(a, act);
      return r === 'ok';
    },
    tick(a, act, dt) {
      const stg = act.stages[act.si]; const sp = act._spot;
      if (act.cancel && act.ph !== 'leave') { act.ph = 'leave'; }
      if (act.ph === 'walk') {
        if (walk(a, dt)) act.ph = 'snap';
      } else if (act.ph === 'snap') {
        if (snap(a, dt, sp.pos, sp.ry)) {
          a._pose = sp.pose ? Object.assign({ back: sp.back }, sp.pose) : null;
          a.anim = stg.anim || 'idle'; act.ph = 'do'; act.t = 0;
          const o = stg.uid && S.obj(stg.uid);
          if (o && o.broken && !stg.adjacent) { S.bubble(a, '🔧', 3); note(`${H.CAT_BY_ID[o.type].name} er i stykker og skal repareres.`, { icon: '🔧', type: 'bad' }); act.ph = 'leave'; return; }
          if (stg.tvUid) { const tv = S.obj(stg.tvUid); if (tv) tv._watchers = (tv._watchers || 0) + 1; act._tvOn = true; }
          if (o && o.type === 'shower') o._on = (o._on || 0) + 1;
          if (o && (o.type === 'computer')) o._on = (o._on || 0) + 1;
          if (o && (o.type === 'stove' || o.type === 'grill') && stg.cookStage) o._on = (o._on || 0) + 1;
          if (o && o.type === 'stereo') o._on = (o._on || 0) + 1;
          if (stg.ix && stg.ix.special === 'program' && o) o._on = (o._on || 0) + 1;
          act._onUid = o && o._on ? o.uid : null;
        }
      } else if (act.ph === 'do') {
        act.t += dt;
        a.anim = stg.anim || 'idle';
        const o = stg.uid && S.obj(stg.uid);
        const tier = o ? (o.tier || 0) : 0;
        const mult = H.TIER_MULT[tier];
        if (stg.eff) for (const n in stg.eff) {
          let r = stg.eff[n]; if (r > 0) r *= mult;
          if (n === 'fun' && r > 0) r *= funBonus(a, (stg.ix && stg.ix.funKind) || stg.funKind);
          if (a.needs[n] !== undefined) a.needs[n] = H.clamp(a.needs[n] + r * dt, 0, 100);
        }
        if (stg.eat) { const q = act._quality || (stg.pizza ? 0.85 : 0.7); a.needs.hunger = H.clamp(a.needs.hunger + 5.5 * q * dt, 0, 100); }
        if (stg.skill) S.addXp(a, stg.skill, (stg.xp || 1) * dt * (1 + tier * 0.15));
        if (stg.anim === 'run') a.stats.workout = (a.stats.workout || 0) + dt;
        if (Math.random() < dt * 0.04 && stg.ix) S.bubble(a, stg.ix.icon || '✨', 2);
        const fullDone = stg.full && a.needs[stg.full] >= 99.5;
        const durDone = stg.dur && act.t >= stg.dur;
        const noLimit = !stg.full && !stg.dur;
        if (fullDone || durDone || noLimit || (stg.ix && stg.ix.special === 'sleep' && a._wakeAt && G.time >= a._wakeAt)) {
          if (stg.onDone) stg.onDone(a, stg);
          if (stg.ix) finishIx(a, stg.ix, o, act);
          act.ph = 'leave';
        }
      } else if (act.ph === 'leave') {
        releaseOn(a, act);
        const back = sp && sp.back;
        if (back && a._pose && !snap(a, dt, back)) return;
        a._pose = null; a.anim = 'idle';
        releaseRes(a, act);
        if (act.cancel) return 'done';
        act.si++;
        if (act.si >= act.stages.length) return 'done';
        const r = startStage(a, act); if (r !== 'ok') return r === 'done' ? 'done' : 'fail';
      }
    },
    end(a, act, cancelled) {
      releaseOn(a, act); releaseRes(a, act);
      if (cancelled && act.ph === 'do') { const stg = act.stages && act.stages[act.si]; if (stg && stg.ix && stg.ix.special === 'sleep') finishIx(a, stg.ix, S.obj(stg.uid), act); }
    }
  };
  function releaseOn(a, act) {
    if (act._tvOn) { const tv = S.obj(act.stages[act.si] && act.stages[act.si].tvUid); if (tv) tv._watchers = Math.max(0, (tv._watchers || 1) - 1); act._tvOn = false; }
    if (act._onUid) { const o = S.obj(act._onUid); if (o) o._on = Math.max(0, (o._on || 1) - 1); act._onUid = null; }
  }
  function funBonus(a, kind) {
    if (!kind || a.kind !== 'human') return 1;
    let m = 1;
    if (kind === 'tv' && S.hasTrait(a, 'doven')) m *= 1.5;
    if (kind === 'computer' && S.hasTrait(a, 'noerd')) m *= 1.5;
    if (kind === 'art' && S.hasTrait(a, 'kreativ')) m *= 1.5;
    if (kind === 'fitness') { if (S.hasTrait(a, 'aktiv')) m *= 2; if (S.hasTrait(a, 'doven')) m *= 0.3; }
    return m;
  }
  function finishIx(a, ix, o, act) {
    const c = o ? H.CAT_BY_ID[o.type] : null;
    switch (ix.special) {
      case 'sleep':
        if (a.needs.energy > 90) S.addMoodlet(a, 'rested', 'Veludhvilet', 10, 5, '😌');
        a._wakeAt = null; break;
      case 'paint': {
        const v = Math.round((20 + a.skills.creativity * 38) * (0.8 + Math.random() * 0.5) * (1 + (o.tier || 0) * 0.15));
        G.money += v; o.art = (o.art || 0) + 1; W.refreshObjectState(o);
        a.stats.paint = (a.stats.paint || 0) + 1;
        note(`${a.first} solgte et maleri for ${H.money(v)}.`, { icon: '🖼️', type: 'good', agent: a.id });
        S.addMoodlet(a, 'art', 'Stolt kunstner', 8, 3, '🎨');
        S.emit('earn', { a, amount: v }); break;
      }
      case 'program': {
        const v = Math.round((40 + a.skills.logic * 32) * (0.8 + Math.random() * 0.4));
        G.money += v; note(`${a.first} tjente ${H.money(v)} på et programmeringsjob.`, { icon: '⌨️', type: 'good', agent: a.id });
        S.emit('earn', { a, amount: v }); break;
      }
      case 'findjob': H.UI && H.UI.openJobPicker(a); break;
      case 'adopt': S.adopt(a); break;
      case 'invite': H.UI && H.UI.openInvite(a); break;
      case 'outfit': H.UI && H.UI.openCAS({ edit: a, only: 'clothes' }); break;
      case 'look': H.UI && H.UI.openCAS({ edit: a, only: 'look' }); break;
      case 'homework': if (a.career && a.career.id === 'school') { a.career.perf = Math.min(100, a.career.perf + 12); note(`${a.first} har lavet lektier. Karakteren stiger.`, { icon: '📚', type: 'good' }); } break;
      case 'fillbowl': o.food = 4 + (o.tier || 0) * 2; W.refreshObjectState(o); note('Madskålen er fyldt.', { icon: '🦴' }); break;
      case 'workout': S.addMoodlet(a, 'workout', 'Energisk efter træning', 6, 2, '💪'); break;
    }
    if (ix.id === 'shower' || ix.id === 'bath') S.addMoodlet(a, 'clean', 'Frisk og ren', 6, 3, '🫧');
    if (ix.id === 'dance') S.addMoodlet(a, 'dance', 'Danseglad', 6, 2, '💃');
    if (c && c.breaks) S.breakCheck(o);
    S.emit('ix', { a, ix: ix.id, o });
  }
  S.breakCheck = function (o) {
    if (!o || o.broken) return;
    const ch = [0.045, 0.02, 0][o.tier || 0];
    if (Math.random() < ch) { o.broken = true; note(`${H.CAT_BY_ID[o.type].name} er gået i stykker.`, { icon: '💥', type: 'bad', obj: o.uid }); }
  };

  H_.goto = {
    start(a, act) { return !!S.routeTo(a, [act.tile]); },
    tick(a, act, dt) { if (act.cancel) return 'done'; if (walk(a, dt, act.pt)) return 'done'; }
  };
  H_.wander = {
    start(a, act) {
      const [x, z] = S.tileOf(a); const goals = [];
      for (let i = 0; i < 12; i++) { const tx = x + Math.round(H.rnd(-5, 5)), tz = z + Math.round(H.rnd(-5, 5)); if (W.free(tx, tz) && (W.inLot(tx, tz) || a.visitor)) goals.push([tx, tz]); }
      if (!goals.length) return false; const g = H.pick(goals);
      return !!S.routeTo(a, [g]);
    },
    tick(a, act, dt) { if (act.cancel) return 'done'; if (walk(a, dt)) { act.t = (act.t || 0) + dt; a.anim = a.kind === 'pet' && act.t > 0.5 ? 'sit' : 'idle'; if (act.t > (act.wait || 3)) return 'done'; } }
  };
  H_.wait = { start() { return true; }, tick(a, act, dt) { act.t = (act.t || 0) + dt; a.anim = act.anim || 'idle'; if (act.icon2 && Math.random() < dt * 0.3) S.bubble(a, act.icon2, 2); if (act.t >= act.dur || act.cancel) { if (act.onDone && !act.cancel) act.onDone(a); return 'done'; } } };

  /* --- Social interaktion --- */
  function adjacentGoals(b) {
    const [bx, bz] = S.tileOf(b); const out = [];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const tx = bx + dx, tz = bz + dz; if (W.free(tx, tz) && W.canStep(tx, tz, bx, bz)) out.push([tx, tz]);
    }
    return out;
  }
  S.canTalk = function (b) {
    if (!b || b._hidden) return 'væk';
    const cur = b.queue[0];
    if (b.anim === 'sleep' || b.anim === 'sitsleep' || b.anim === 'passout') return 'sover';
    if (cur && cur.type === 'work') return 'på vej på arbejde';
    if (b.anim === 'shower' || b.anim === 'bath') return 'er i bad';
    return null;
  };
  H_.social = {
    start(a, act) {
      const b = G.agents[act.target]; const why = S.canTalk(b);
      if (why) { note(`${b ? b.first : 'Personen'} ${why}.`, { type: 'bad' }); return false; }
      if (b._hold && b._hold.with !== a.id) { return false; }
      b._hold = { with: a.id, until: G.time + 40, anim: 'idle', waiting: true };
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      act.ph = 'walk';
      if (d < 1.7) { a._path = []; return true; }
      standUp(a);
      const goals = adjacentGoals(b);
      if (!goals.length || !S.routeTo(a, goals)) { b._hold = null; return false; }
      return true;
    },
    tick(a, act, dt) {
      const b = G.agents[act.target]; if (!b || b._hidden) return 'fail';
      if (act.cancel) { if (b._hold && b._hold.with === a.id) b._hold = null; return 'done'; }
      const si = act.si ? H.SOCIAL_BY_ID[act.si] : null;
      if (act.ph === 'walk') {
        if (walk(a, dt)) {
          if (Math.hypot(b.x - a.x, b.z - a.z) > 1.9) { const g = adjacentGoals(b); if (!g.length || !S.routeTo(a, g)) return 'fail'; return; }
          act.ph = 'talk'; act.t = 0;
          const dur = act.dur || (si ? si.dur : 5);
          b._hold = { with: a.id, until: G.time + dur + 0.5, anim: 'listen' };
          if (!a._pose) faceTo(a, b.x, b.z);
          S.rel(a, b).met = true;
          if (si) S.bubble(a, si.icon, 2.5, 'speak');
        }
      } else if (act.ph === 'talk') {
        act.t += dt;
        const dur = act.dur || (si ? si.dur : 5);
        if (!a._pose) faceTo(a, b.x, b.z);
        if (!b._pose && b.kind === 'human') faceTo(b, a.x, a.z);
        const anim = si && si.anim ? si.anim : 'talk';
        a.anim = anim;
        if (!b._hold || b._hold.with !== a.id) b._hold = { with: a.id, until: G.time + dur + 0.5, anim: 'listen' };
        b._hold.anim = (si && (si.anim === 'dance' || si.anim === 'hug')) ? si.anim : (Math.floor(act.t * 0.8) % 2 ? 'talk' : 'listen');
        if (act.custom) { if (act.custom.tick) act.custom.tick(a, b, act, dt); }
        if (act.t >= dur) {
          if (act.custom) act.custom.done(a, b, act); else S.resolveSocial(a, b, si);
          b._hold = null; a.anim = 'idle';
          return 'done';
        }
      }
    },
    end(a, act) { const b = G.agents[act.target]; if (b && b._hold && b._hold.with === a.id) b._hold = null; }
  };
  S.romanceOk = function (a, b) {
    if (a.kind !== 'human' || b.kind !== 'human') return false;
    const r = S.rel(a, b); if (r.fam) return false;
    const ad = H.isAdult(a), bd = H.isAdult(b);
    if (a.age === 'teen' && b.age === 'teen') return true;
    return ad && bd;
  };
  S.socialsFor = function (a, b) {
    if (a.kind !== 'human' || a.age === 'baby') return [];
    const r = S.rel(a, b); const out = [];
    for (const si of H.SOCIALS) {
      if (si.romance && !S.romanceOk(a, b)) continue;
      if (a.age === 'child' && (si.cat === 'Romantisk' || si.id === 'movein')) continue;
      if (si.minF && r.f < si.minF && !r.fam) continue;
      if (si.minR && r.r < si.minR) continue;
      if (si.needStatus && !si.needStatus.includes(r.st)) continue;
      if (si.needHousehold && !(a.isHousehold && b.isHousehold)) continue;
      if (si.visitorOnly) {
        if (!b.visitor || !a.isHousehold) continue;
        const st = b.visitor.state;
        if (si.visitorOnly === 'outside' && !['walking', 'ringing', 'arriving'].includes(st)) continue;
        if (si.visitorOnly === 'inside' && st !== 'inside') continue;
        if (si.id === 'movein' && (G.household.length >= 8 || b.age === 'child' || b.age === 'teen')) continue;
      }
      out.push(si);
    }
    return out;
  };
  S.resolveSocial = function (a, b, si) {
    const r = S.rel(a, b);
    let ch = si.base + r.f / 260 + (a.skills.charisma || 0) * 0.02 + a.mood / 500 + (b.mood || 0) / 500;
    if (S.hasTrait(a, 'udadvendt')) ch += 0.08; if (S.hasTrait(a, 'genert')) ch -= 0.1;
    if (S.hasReward(a, 'charmoer')) ch += 0.15;
    if (si.id === 'joke' || si.id === 'prank') { if (S.hasTrait(a, 'legesyg')) ch += 0.2; if (S.hasTrait(b, 'legesyg')) ch += 0.1; }
    if (si.romance) { ch += r.r / 200; if (S.hasTrait(a, 'romantisk')) ch += 0.15; if (['gift', 'forlovet', 'kæreste'].includes(r.st) && !si.status) ch += 0.4; }
    if (si.mean && S.hasTrait(a, 'hidsig')) ch += 0.1;
    if (b.mood < -40) ch -= 0.15;
    const ok = Math.random() < H.clamp(ch, 0.05, 0.98);
    const fm = S.hasTrait(b, 'udadvendt') ? 1.2 : 1;
    let respIcon = '😊';
    if (ok) {
      if (si.f) r.f = H.clamp(r.f + si.f * fm, -100, 100);
      if (si.r) r.r = H.clamp(r.r + si.r * (S.hasTrait(a, 'romantisk') ? 1.5 : 1), -100, 100);
      if (!si.mean) { a.needs.social = Math.min(100, a.needs.social + 14); b.needs.social = Math.min(100, (b.needs.social || 0) + 14); }
      if (si.fun) { a.needs.fun = Math.min(100, a.needs.fun + si.fun); if (b.needs.fun !== undefined) b.needs.fun = Math.min(100, b.needs.fun + si.fun * 0.8); respIcon = '😂'; }
      if (si.romance) respIcon = '❤️';
      if (si.mean) { respIcon = '😠'; S.addMoodlet(b, 'insulted', 'Fornærmet', -14, 4, '😠'); if (S.hasTrait(a, 'hidsig')) a.needs.fun = Math.min(100, a.needs.fun + 8); }
      if (si.id === 'kiss') { S.addMoodlet(a, 'love', 'Forelsket', 14, 6, '😍'); S.addMoodlet(b, 'love', 'Forelsket', 14, 6, '😍'); W.spawnSparkles((a.x + b.x) / 2, 1.8, (a.z + b.z) / 2, '#ff8fb1', 14); }
      if (si.id === 'joke') S.addMoodlet(b, 'laugh', 'Godt grin', 6, 2, '😂');
      if (si.status) {
        r.st = si.status;
        const msg = { 'kæreste': 'er nu kærester', 'forlovet': 'er blevet forlovet', 'gift': 'er blevet gift' }[si.status];
        note(`${a.first} og ${b.first} ${msg}!`, { icon: si.icon, type: 'good', big: true });
        S.addMoodlet(a, 'status', si.status === 'gift' ? 'Nygift' : 'Lykkelig', 20, 24, '💖'); S.addMoodlet(b, 'status', si.status === 'gift' ? 'Nygift' : 'Lykkelig', 20, 24, '💖');
        W.spawnSparkles((a.x + b.x) / 2, 1.8, (a.z + b.z) / 2, '#ffd56a', 40);
        if (si.status === 'gift' && b.last !== a.last) b.last = a.last;
      }
      if (si.id === 'invitein') { S.welcome(b); }
      if (si.id === 'goodbye') { S.leave(b); }
      if (si.id === 'movein') { S.moveIn(b); }
      if (si.xp) S.addXp(a, si.xp, 6);
      S.addXp(a, 'charisma', 1.5);
    } else {
      respIcon = si.mean ? '🙄' : '😒';
      if (si.romance) { r.r = Math.max(-100, r.r - 6); r.f = Math.max(-100, r.f - 3); S.addMoodlet(a, 'rejected', 'Afvist', -12, 4, '💔'); respIcon = '💔'; }
      else if (si.mean) { r.f = Math.max(-100, r.f - 2); }
      else { r.f = Math.max(-100, r.f - 2); a.needs.social = Math.min(100, a.needs.social + 4); }
      if (si.id === 'invitein') note(`${b.first} har ikke lyst til at komme ind.`, { type: 'bad' });
      if (si.id === 'movein') note(`${b.first} vil ikke flytte ind lige nu.`, { type: 'bad' });
    }
    S.bubble(b, respIcon, 2.5, 'speak');
    const wasFriend = r._fr || false; r._fr = r.f >= 30;
    if (!wasFriend && r.f >= 30 && !r.fam) { S.emit('friend', { a, b }); note(`${a.first} og ${b.first} er blevet venner.`, { icon: '🤝', type: 'good' }); }
    S.emit('social', { a, b, si: si.id, ok });
    return ok;
  };

  /* --- Baby-pasning og kæledyr --- */
  H_.care = {
    start(a, act) {
      const b = G.agents[act.target]; if (!b || b._hidden) return false;
      if (act.cid === 'cribbaby' && !S.has('crib')) { note('Køb en tremmeseng, så babyen kan sove.', { icon: '🛏️', type: 'bad' }); return false; }
      if (act.cid === 'cribbaby' && b.inCrib) { act.cid = 'takeout'; }
      let goals;
      if (b.inCrib) { const crib = S.obj(b.inCrib); const s = crib && S.adjacentSpot(a, crib); if (!s) return false; goals = [s.tile]; act._face = W.objCenter(crib); }
      else goals = adjacentGoals(b);
      if (!goals.length || !S.routeTo(a, goals)) return false;
      act.ph = 'walk'; return true;
    },
    tick(a, act, dt) {
      const b = G.agents[act.target]; if (!b) return 'fail';
      if (act.cancel && act.ph !== 'carry') return 'done';
      const def = H.BABY_CARE.find(c => c.id === act.cid) || { dur: 3, eff: {} };
      if (act.ph === 'walk') { if (walk(a, dt)) { act.ph = 'do'; act.t = 0; faceTo(a, act._face ? act._face.x : b.x, act._face ? act._face.z : b.z); } }
      else if (act.ph === 'do') {
        act.t += dt; a.anim = b.inCrib ? 'use' : 'care';
        if (act.cid === 'feedbaby') a.anim = b.inCrib ? 'feedbaby' : 'care';
        for (const n in def.eff) b.needs[n] = H.clamp(b.needs[n] + def.eff[n] / def.dur * dt, 0, 100);
        if (act.cid === 'playbaby') { a.needs.fun = Math.min(100, a.needs.fun + 0.6 * dt); a.needs.social = Math.min(100, a.needs.social + 0.8 * dt); }
        if (Math.random() < dt * 0.3) S.bubble(b, def.icon || '👶', 2);
        if (act.t >= def.dur) {
          S.rel(a, b).f = Math.min(100, S.rel(a, b).f + 3);
          if (act.cid === 'cribbaby') {
            const crib = G.objects.find(o => o.type === 'crib' && !G.household.some(id => G.agents[id].inCrib === o.uid));
            if (!crib) { note('Alle tremmesenge er optaget.', { type: 'bad' }); return 'done'; }
            b._carriedBy = a.id; act._crib = crib.uid;
            const s = S.adjacentSpot(a, crib); if (!s || !S.routeTo(a, [s.tile])) { b._carriedBy = null; return 'fail'; }
            act.ph = 'carry'; return;
          }
          if (act.cid === 'takeout') { const crib = S.obj(b.inCrib); b.inCrib = null; b._pose = null; const t = adjacentGoals(a)[0]; if (t) { b.x = t[0] + 0.5; b.z = t[1] + 0.5; } }
          S.emit('baby', { a, b });
          return 'done';
        }
      } else if (act.ph === 'carry') {
        if (walk(a, dt)) {
          const crib = S.obj(act._crib); b._carriedBy = null;
          if (crib) { const c = W.objCenter(crib); b.x = c.x; b.z = c.z; b.ry = W.rotY(crib); b.inCrib = crib.uid; b._pose = { kind: 'crib', h: 0.42 }; faceTo(a, c.x, c.z); }
          S.emit('baby', { a, b });
          return 'done';
        }
      }
    },
    end(a, act) { const b = G.agents[act.target]; if (b && b._carriedBy === a.id) { b._carriedBy = null; b.x = a.x; b.z = a.z; } }
  };
  H_.petix = {
    start(a, act) {
      const p = G.agents[act.target]; if (!p || p._hidden) return false;
      if (p._hold && p._hold.with !== a.id) return false;
      p._hold = { with: a.id, until: G.time + 40, anim: 'sit', waiting: true };
      const goals = adjacentGoals(p); if (!goals.length || !S.routeTo(a, goals)) { p._hold = null; return false; }
      act.ph = 'walk'; return true;
    },
    tick(a, act, dt) {
      const p = G.agents[act.target]; if (!p) return 'fail';
      if (act.cancel) { p._hold = null; return 'done'; }
      const def = H.PET_IX.find(x => x.id === act.pid);
      if (act.ph === 'walk') { if (walk(a, dt)) { act.ph = 'do'; act.t = 0; p._hold = { with: a.id, until: G.time + def.dur + 1, anim: act.pid === 'playpet' ? 'play' : 'sit' }; faceTo(a, p.x, p.z); faceTo(p, a.x, a.z); } }
      else {
        act.t += dt; a.anim = act.pid === 'playpet' ? 'cheer' : 'pet';
        if (act.pid === 'playpet' && Math.floor(act.t * 2) % 3 === 0) a.anim = 'pet';
        if (!p._hold || p._hold.with !== a.id) p._hold = { with: a.id, until: G.time + def.dur + 1, anim: 'sit' };
        if (act.pid === 'feedpet') p._hold.anim = 'eat';
        for (const n in def.eff) p.needs[n] = H.clamp(p.needs[n] + def.eff[n] / def.dur * dt, 0, 100);
        const dv = S.hasTrait(a, 'dyreven') ? 2 : 1;
        a.needs.fun = Math.min(100, a.needs.fun + 0.7 * dv * dt); a.needs.social = Math.min(100, a.needs.social + 0.5 * dv * dt);
        if (Math.random() < dt * 0.4) S.bubble(p, act.pid === 'feedpet' ? '🦴' : '❤️', 1.6);
        if (act.t >= def.dur) {
          p._hold = null; const r = S.rel(a, p); r.f = Math.min(100, r.f + 5); r.met = true;
          if (act.pid === 'trainpet') S.addXp(a, 'charisma', 4);
          if (dv > 1) S.addMoodlet(a, 'petlove', 'Kæledyrsglæde', 8, 3, '🐾');
          S.emit('pet', { a, pet: p });
          return 'done';
        }
      }
    },
    end(a, act) { const p = G.agents[act.target]; if (p && p._hold && p._hold.with === a.id) p._hold = null; }
  };

  /* --- Selvhandlinger --- */
  H_.self = {
    start(a, act) { act.t = 0; standUp(a); return true; },
    tick(a, act, dt) {
      act.t += dt;
      if (act.kind === 'birthday') { a.anim = 'cheer'; if (act.t > 3) { S.ageUp(a); return 'done'; } }
      else if (act.kind === 'phone') { a.anim = 'phone'; if (act.t > 3) { if (act.then) act.then(a); return 'done'; } }
      else { a.anim = act.anim || 'stretch'; if (act.t > (act.dur || 2)) return 'done'; }
      if (act.cancel) return 'done';
    }
  };

  /* --- Arbejde --- */
  H_.work = {
    start(a, act) { standUp(a); const r = S.routeTo(a, [[H.LOT.entryX, 4], [H.LOT.entryX + 1, 4]]); act.t = 0; if (!r) { a._path = []; } a._runNext = false; return true; },
    tick(a, act, dt) {
      act.t += dt;
      const car = W.cars.find(c => c.forId === a.id && c.toWork);
      const arrived = walk(a, dt);
      if ((arrived && car && car.state === 'wait') || act.t > 100) {
        a._hidden = true; a.atWork = true; a._boarded = true; a.anim = 'idle';
        if (car) car._boarded = true;
        if (act.t > 100) { const c = S.careerOf(a); a.career.perf = Math.max(0, a.career.perf - 12); note(`${a.first} kom for sent ${a.career.id === 'school' ? 'i skole' : 'på arbejde'}.`, { type: 'bad', agent: a.id }); }
        return 'done';
      }
      if (arrived) { a.anim = 'idle'; a.ry = Math.PI; }
    }
  };
  H_.leave = {
    start(a, act) {
      standUp(a);
      const ex = a.x < 16 ? 0 : 31;
      act.ex = ex;
      return !!S.routeTo(a, [[ex, 4], [ex, 3]]) || true;
    },
    tick(a, act, dt) {
      if (walk(a, dt) || act.cancel) { S.goAway(a); return 'done'; }
    }
  };
  H_.stroll = {
    start(a, act) { return !!S.routeTo(a, [[act.to, 4]]); },
    tick(a, act, dt) { if (walk(a, dt)) { if (a.visitor && a.visitor.state === 'walking') S.goAway(a); return 'done'; } }
  };
  H_.visit = {
    start(a, act) { const t = S.doorbellTile(); act.tile = t; if (S.routeTo(a, [t])) return true; S.goAway(a); return false; },
    tick(a, act, dt) {
      if (walk(a, dt)) {
        if (a.visitor && a.visitor.state === 'arriving') {
          a.visitor.state = 'ringing'; a.visitor.since = G.time; a.ry = Math.PI;
          const door = S.frontDoor(); if (door) faceTo(a, door.x, door.z);
          S.bubble(a, '🔔', 4);
          if (a.visitor.invited) { S.later(1, () => a.visitor && a.visitor.state === 'ringing' && S.welcome(a)); }
          else note(`${S.name(a)} ringer på døren.`, { icon: '🔔', agent: a.id, buttons: [{ label: 'Byd indenfor', fn: () => S.welcome(a) }, { label: 'Afvis', fn: () => { S.rel(a, G.selected).f -= 4; S.leave(a); } }], sticky: 40 });
        }
        return 'done';
      }
    }
  };

  function endAct(a, act, cancelled) {
    const h = H_[act.type]; if (h && h.end) h.end(a, act, cancelled);
    standUp(a); a._path = []; a._runNext = false;
  }
  function runAction(a, dt) {
    const act = a.queue[0];
    const h = H_[act.type];
    if (!h) { a.queue.shift(); return; }
    if (!act.st) {
      act.st = 'run';
      let ok = false;
      try { ok = h.start(a, act); } catch (e) { console.error(e); ok = false; }
      if (!ok) {
        if (act._paid && act.cost) G.money += act.cost;
        if (act.user) S.bubble(a, '❓', 2.5);
        if (act.uid) { a._fail = a._fail || {}; a._fail[act.uid] = G.time + 45; }
        endAct(a, act, true); a.queue.shift(); a.anim = 'idle'; return;
      }
    }
    let r;
    try { r = h.tick(a, act, dt); } catch (e) { console.error(e); r = 'fail'; }
    if (r === 'done' || r === 'fail') {
      if (r === 'fail' && act.user) S.bubble(a, '❓', 2.5);
      endAct(a, act, r === 'fail'); if (a.queue[0] === act) a.queue.shift();
      if (a.kind === 'human' && !a._pose) a.anim = 'idle';
    }
  }

  /* ===================== Fri vilje ===================== */
  const urg = v => Math.pow((100 - v) / 100, 2) * 3 + (100 - v) / 200;
  S.autonomy = function (a) {
    if (a.kind === 'pet') return petAuto(a);
    if (a.age === 'baby') return;
    if (a.visitor && a.visitor.state !== 'inside') return;
    if (a.isHousehold && !G.settings.freeWill) return;
    const N = a.needs; const cands = [];
    const night = isNight();
    const visitor = !!a.visitor;
    const blockedVis = ['program', 'paint', 'sleep', 'findjob', 'adopt', 'homework', 'outfit', 'look', 'cook', 'pizza', 'speech', 'practice', 'fillbowl', 'invite', 'nap'];
    const hasFridge = S.has('fridge');
    for (const o of G.objects) {
      if (o.broken) continue;
      if (a._fail && a._fail[o.uid] > G.time) continue;
      const c = H.CAT_BY_ID[o.type]; const ctr = W.objCenter(o);
      const dist = Math.hypot(ctr.x - a.x, ctr.z - a.z);
      for (const ix of c.ix) {
        if (ix.noAuto) continue;
        if (!ix.ages.includes(a.age)) continue;
        if (visitor && blockedVis.includes(ix.id)) continue;
        if (ix.special === 'cook' && o.type === 'stove' && hasFridge) continue;
        let sc = 0;
        if (ix.special === 'cook') { if (N.hunger < 58) sc = urg(N.hunger) * 150 + 20; if (G.pizza > 0) sc *= 0.5; }
        else if (ix.special === 'sleep') { if (N.energy < 28 || (night && N.energy < 78)) sc = urg(N.energy) * 230 + (night ? 70 : 0); }
        else if (ix.special === 'fillbowl') { if ((o.food || 0) <= 0 && G.pets.some(id => G.agents[id].needs.hunger < 70)) sc = 60; }
        else if (ix.eff) {
          for (const n in ix.eff) {
            const r = ix.eff[n] * H.TIER_MULT[o.tier || 0]; if (r <= 0 || N[n] === undefined) continue;
            const est = ix.dur || ((100 - N[n]) / r);
            let gain = Math.min(100 - N[n], r * est);
            if (n === 'fun') gain *= funBonus(a, ix.funKind);
            sc += gain * urg(N[n]) * (n === 'bladder' || n === 'hunger' ? 1.4 : 1);
          }
          if (ix.id === 'nap') sc *= night ? 0 : 0.35;
          if (ix.id === 'snack' && N.hunger > 45) sc *= 0.3;
        }
        if (ix.skill && N.fun > 30 && N.energy > 30 && N.hunger > 30 && !visitor) {
          let b = 6;
          const asp = a.asp && H.ASPIRATIONS.find(x => x.id === a.asp);
          if (asp && JSON.stringify(asp.steps.map(s => s.label)).toLowerCase().includes((H.SKILLS.find(s => s.id === ix.skill) || {}).name.toLowerCase())) b += 14;
          const car = a.career && H.CAREERS.find(c2 => c2.id === a.career.id);
          if (car && car.skill === ix.skill) b += 10;
          sc += b;
        }
        if (ix.special === 'program' && G.money < 3000) sc += 15;
        if (sc <= 0.5) continue;
        sc = sc / (1 + dist * 0.05);
        cands.push({ sc, mk: () => S.mkIx(o, ix) });
      }
    }
    if (G.pizza > 0 && N.hunger < 60) cands.push({ sc: urg(N.hunger) * 160 + 25, mk: () => ({ type: 'stages', build: 'pizza', label: 'Spis pizza', icon: '🍕' }) });
    // sociale
    for (const b of S.present()) {
      if (b === a || b._carriedBy) continue;
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      if (b.kind === 'pet') {
        if (visitor) continue;
        const dv = S.hasTrait(a, 'dyreven') ? 2 : 1;
        const sc = (urg(N.fun) * 30 + urg(N.social) * 25 + (b.needs.social < 40 ? 20 : 0)) * dv / (1 + dist * 0.05);
        const noFood = !G.objects.some(o => o.type === 'pet_bowl' && o.food > 0);
        const pid = b.needs.hunger < 40 && noFood ? 'feedpet' : (N.fun < 50 ? 'playpet' : 'petpet');
        cands.push({ sc: pid === 'feedpet' ? sc + (100 - b.needs.hunger) * 2.2 : sc, mk: () => mkPet(b, pid) });
        continue;
      }
      if (b.age === 'baby') {
        if (!H.isAdult(a) && a.age !== 'teen') continue;
        if (visitor) continue;
        const worst = ['hunger', 'hygiene', 'fun', 'energy'].map(n => [n, b.needs[n]]).sort((x, y) => x[1] - y[1])[0];
        if (worst[1] < 45) {
          const cid = { hunger: 'feedbaby', hygiene: 'changebaby', fun: 'playbaby', energy: 'cribbaby' }[worst[0]];
          if (cid === 'cribbaby' && (b.inCrib || !S.has('crib'))) continue;
          cands.push({ sc: (100 - worst[1]) * 2.6 + 30, mk: () => mkCare(b, cid) });
        }
        continue;
      }
      if (S.canTalk(b) || b._hold) continue;
      if (b.visitor && b.visitor.state !== 'inside') continue;
      if (N.social > 85 && !visitor) continue;
      const r = S.rel(a, b);
      let sc = urg(N.social) * 70 + (visitor ? 25 : 0);
      if (r.f > 30) sc *= 1.3; if (r.f < -30) sc *= 0.3;
      sc /= (1 + dist * 0.06);
      const opts = S.socialsFor(a, b).filter(s => !s.status && !s.visitorOnly && (!s.mean || (S.hasTrait(a, 'hidsig') && r.f < 0 && Math.random() < 0.5)));
      if (!opts.length) continue;
      const pickS = () => {
        const p = S.partnerOf(a);
        if (p === b && Math.random() < 0.5) { const rr = opts.filter(s => s.romance); if (rr.length) return H.pick(rr); }
        const nice = opts.filter(s => !s.romance && !s.mean);
        return H.pick(nice.length ? nice : opts);
      };
      cands.push({ sc, mk: () => { const s = pickS(); return { type: 'social', target: b.id, si: s.id, label: s.label, icon: s.icon }; } });
    }
    // gå en tur / slap af
    cands.push({ sc: 1.5, mk: () => ({ type: 'wander', label: 'Slapper af', icon: '🚶', wait: 4 }) });
    if (!cands.length) return;
    cands.sort((x, y) => y.sc - x.sc);
    const top = cands.slice(0, 3); const tot = top.reduce((s, c) => s + c.sc, 0);
    let r = Math.random() * tot; let ch = top[0];
    for (const c of top) { r -= c.sc; if (r <= 0) { ch = c; break; } }
    const act = ch.mk(); if (!act) return;
    act.auto = true; a.queue.push(act);
  };
  function mkPet(p, pid) { const d = H.PET_IX.find(x => x.id === pid); return { type: 'petix', target: p.id, pid, label: `${d.label} ${p.first}`, icon: d.icon }; }
  function mkCare(b, cid) { const d = H.BABY_CARE.find(x => x.id === cid); return { type: 'care', target: b.id, cid, label: `${d.label}: ${b.first}`, icon: d.icon }; }
  S.mkPet = mkPet; S.mkCare = mkCare;

  function petAuto(a) {
    const N = a.needs;
    if (N.hunger < 45) {
      const bowl = G.objects.find(o => o.type === 'pet_bowl' && o.food > 0);
      if (bowl) {
        a.queue.push({ type: 'stages', label: 'Spiser', icon: '🦴', auto: true, stages: [{ uid: bowl.uid, adjacent: true, anim: 'eat', dur: 6, onDone: () => { bowl.food = Math.max(0, bowl.food - 1); W.refreshObjectState(bowl); a.needs.hunger = Math.min(100, a.needs.hunger + 65); } }] });
        return;
      }
      const human = S.humansPresent().filter(h => h.isHousehold && h.age !== 'baby' && !h._hidden)[0];
      if (human && Math.random() < 0.6) { a.queue.push({ type: 'petfollow', target: human.id, anim: 'beg', dur: 8, icon2: '🦴', auto: true }); return; }
    }
    if (N.energy < 28 || (isNight() && N.energy < 85)) {
      const bed = G.objects.find(o => o.type === 'pet_bed' && !(o._res && Object.keys(o._res).length));
      if (bed) {
        a.queue.push({ type: 'stages', label: 'Sover', icon: '💤', auto: true, stages: [{ uid: bed.uid, petBed: true, anim: 'sleep', full: 'energy', eff: { energy: 0.25 } }] });
        return;
      }
      a.queue.push({ type: 'wait', anim: 'sleep', dur: 90, auto: true, onDone: () => { }, label: 'Sover' });
      a._napFloor = true; return;
    }
    if (N.social < 55 && Math.random() < 0.6) {
      const hs = S.humansPresent().filter(h => h.isHousehold && h.age !== 'baby');
      if (hs.length) { a.queue.push({ type: 'petfollow', target: H.pick(hs).id, anim: 'sit', dur: 10, auto: true }); return; }
    }
    if (N.fun < 50 && Math.random() < 0.5) { a.queue.push({ type: 'wait', anim: Math.random() < 0.5 ? 'play' : 'spin', dur: 5, auto: true, onDone: (p) => { p.needs.fun = Math.min(100, p.needs.fun + 20); } }); return; }
    a.queue.push({ type: 'wander', auto: true, wait: 4 + Math.random() * 6 });
  }
  H_.petfollow = {
    start(a, act) { const h = G.agents[act.target]; if (!h || h._hidden) return false; const g = adjacentGoals(h); if (!g.length) return false; return !!S.routeTo(a, g); },
    tick(a, act, dt) {
      const h = G.agents[act.target]; if (!h || h._hidden) return 'done';
      if (walk(a, dt)) {
        act.t = (act.t || 0) + dt; faceTo(a, h.x, h.z); a.anim = act.anim;
        if (Math.hypot(h.x - a.x, h.z - a.z) > 2.2 && act.t < act.dur) { const g = adjacentGoals(h); if (g.length) S.routeTo(a, g); }
        if (act.icon2 && Math.random() < dt * 0.4) S.bubble(a, act.icon2, 1.6);
        a.needs.social = Math.min(100, a.needs.social + 1.2 * dt);
        if (act.t > act.dur) return 'done';
      }
    }
  };
  // hundekurven har ingen pladser: brug centrum
  const _findSpot = S.findSpot;
  S.findSpot = function (a, o, f) {
    if (o.type === 'pet_bed' || (a.kind === 'pet' && o.type === 'pet_bowl')) {
      const c = W.objCenter(o); const s = S.adjacentSpot(a, o); if (!s) return null;
      if (o.type === 'pet_bed') { s.pos = c; s.ry = W.rotY(o); s.pose = { kind: 'petbed', h: 0.08 }; }
      return s;
    }
    return _findSpot(a, o, f);
  };

  /* ===================== Baby ===================== */
  function babyStep(a, dt) {
    if (a._carriedBy) { const c = G.agents[a._carriedBy]; if (c) { a.x = c.x + Math.sin(c.ry) * 0.28; a.z = c.z + Math.cos(c.ry) * 0.28; a.ry = c.ry; a._py = 0.72; } return; }
    a._py = 0;
    if (a.inCrib) {
      const crib = S.obj(a.inCrib);
      if (!crib) { a.inCrib = null; a._pose = null; return; }
      const c = W.objCenter(crib); a.x = c.x; a.z = c.z;
      if (a.needs.energy < 92 && (a.anim === 'sleep' || a.needs.energy < 60 || isNight())) { a.anim = 'sleep'; a._pose = { kind: 'crib', h: 0.4 }; a.needs.energy = Math.min(100, a.needs.energy + 0.22 * dt); }
      else { a.anim = 'babysit'; a._pose = { kind: 'crib', h: 0.42 }; }
    } else {
      if (a.needs.energy < 8 || (a.anim === 'sleep' && a.needs.energy < 70)) { a.anim = 'sleep'; a._pose = { kind: 'lie', h: 0.0 }; a.needs.energy = Math.min(100, a.needs.energy + 0.15 * dt); }
      else { a.anim = 'babysit'; a._pose = null; }
    }
    const low = ['hunger', 'hygiene', 'fun', 'social'].find(n => a.needs[n] < 25);
    if (low && Math.random() < dt * 0.25) S.bubble(a, { hunger: '🍼', hygiene: '🧷', fun: '🧸', social: '😢' }[low], 2.4);
    // babyen græder og vækker en voksen
    const crit = ['hunger', 'hygiene'].find(n => a.needs[n] < 22);
    if (crit && (!a._cryAt || G.time > a._cryAt)) {
      a._cryAt = G.time + 30;
      const helpers = G.household.map(id => G.agents[id]).filter(h => h && h.kind === 'human' && ['teen', 'young', 'adult', 'elder'].includes(h.age) && !h._hidden && !h.visitor);
      if (!helpers.some(h => h.queue.some(q => q.type === 'care' && q.target === a.id)) && helpers.length) {
        helpers.sort((x, y) => Math.hypot(x.x - a.x, x.z - a.z) - Math.hypot(y.x - a.x, y.z - a.z));
        const h = helpers.find(x => !x.queue.length || x.queue[0].auto) || helpers[0];
        const sleeping = h.anim === 'sleep';
        if (h.queue[0] && h.queue[0].st) { const cur = h.queue.shift(); endAct(h, cur, true); h.anim = 'idle'; }
        h.queue = h.queue.filter(q => !q.auto);
        h.queue.unshift(mkCare(a, crit === 'hunger' ? 'feedbaby' : 'changebaby'));
        if (sleeping) note(`${a.first} græder og vækker ${h.first}.`, { icon: '😭', agent: a.id });
      }
    }
  }

  /* ===================== Planlægning i spiltid ===================== */
  let jobs = [];
  S.later = function (min, fn) { jobs.push({ at: G.time + min, fn }); };
  function runJobs() {
    if (!jobs.length) return;
    const due = jobs.filter(j => G.time >= j.at); if (!due.length) return;
    jobs = jobs.filter(j => G.time < j.at);
    for (const j of due) { try { j.fn(); } catch (e) { console.error(e); } }
  }
  S.clearJobs = () => { jobs = []; };

  /* ===================== Vagthund mod fastlåste personer ===================== */
  function watchdog() {
    for (const id in G.agents) {
      const a = G.agents[id];
      // på arbejde for længe (fx hvis bilen hjem forsvandt ved genindlæsning)
      if (a.atWork) {
        const ci = S.careerOf(a); const md = tod();
        const over = !ci || md >= (ci.end + 1) * 60 || md < (ci.start - 2) * 60;
        if (over && !W.cars.some(c => c.forId === a.id)) { a._hidden = false; a.atWork = false; a._boarded = false; a.x = H.LOT.entryX + 0.5; a.z = 4.5; if (!a._v) A.create(a); }
      }
      if (a._hidden) continue;
      const q = a.queue[0];
      if (q && q.st) {
        if (q._since === undefined) q._since = G.time;
        const limit = q.type === 'work' ? 180 : (q.stages && q.stages.some(s => s.ix && s.ix.special === 'sleep')) ? 900 : 360;
        if (G.time - q._since > limit) { endAct(a, q, true); a.queue.shift(); a.anim = 'idle'; }
      }
      if (a._hold && G.time > a._hold.until + 5) a._hold = null;
      // gæster der ikke kan komme frem
      if (a.visitor && ['arriving', 'walking', 'leaving'].includes(a.visitor.state) && !a.queue.length) { if (a.visitor.state === 'arriving') { a.visitor.state = 'ringing'; a.visitor.since = G.time; } else S.goAway(a); }
    }
  }
  S.resetStuck = function () {
    let n = 0;
    for (const id in G.agents) {
      const a = G.agents[id]; if (a._hidden) continue;
      if (a.queue[0] && a.queue[0].st) endAct(a, a.queue[0], true);
      a.queue = []; a._path = []; a._hold = null; a._carriedBy = null; a.anim = 'idle';
      if (!a.inCrib) a._pose = null;
      n++;
    }
    for (const o of G.objects) { o._res = {}; o._on = 0; o._watchers = 0; }
    S.unstick();
    for (const id in G.agents) { const a = G.agents[id]; if (a.atWork && !W.cars.some(c => c.forId === a.id)) { const ci = S.careerOf(a); const md = tod(); if (!ci || md >= ci.end * 60 || md < ci.start * 60 - 60) { a._hidden = false; a.atWork = false; a.x = H.LOT.entryX + 0.5; a.z = 4.5; } } }
    return n;
  };

  /* ===================== Opdatering ===================== */
  S.update = function (dtMin) {
    if (!G) return;
    let rem = dtMin;
    while (rem > 1e-6) { const st = Math.min(rem, 0.5); tick(st); rem -= st; }
  };
  function tick(dt) {
    const prev = G.time; G.time += dt;
    for (let m = Math.floor(prev) + 1; m <= Math.floor(G.time); m++) onMinute(m);
    for (const id in G.agents) {
      const a = G.agents[id];
      if (a._hidden && !a.atWork) continue;
      S.decay(a, dt);
      if (a._hidden) continue;
      stepAgent(a, dt);
    }
  }
  function stepAgent(a, dt) {
    S.computeMood(a);
    if (a.kind === 'human' && a.age === 'baby') return babyStep(a, dt);
    // kritiske behov
    if (a.kind === 'human' && !a.visitor) {
      if (a.needs.bladder <= 0.01) { a.needs.bladder = 100; a.needs.hygiene = Math.min(a.needs.hygiene, 18); S.addMoodlet(a, 'accident', 'Pinligt uheld', -22, 4, '😳'); S.bubble(a, '😳', 3); note(`${a.first} nåede ikke på toilettet i tide.`, { icon: '😳', type: 'bad', agent: a.id }); S.emit('accident', { a }); }
      if (a.needs.energy <= 0.01 && a.anim !== 'sleep' && a.anim !== 'passout') { S.clearAll(a); a.queue.push({ type: 'wait', anim: 'passout', dur: 150, label: 'Besvimet af træthed', icon: '😵', onDone: (x) => { x.needs.energy = 45; } }); note(`${a.first} er faldet om af træthed.`, { icon: '😵', type: 'bad', agent: a.id }); }
      if (a.anim === 'passout') a.needs.energy = Math.min(100, a.needs.energy + 0.3 * dt);
    }
    if (a.kind === 'pet' && a.anim === 'sleep') a.needs.energy = Math.min(100, a.needs.energy + 0.3 * dt);
    if (a._hold) {
      const p = G.agents[a._hold.with];
      if (G.time > a._hold.until || !p || p._hidden) { a._hold = null; }
      else {
        if (a._hold.waiting && a.queue[0] && a.queue[0].st) {
          // stop i hvad man laver og vent (stående)
          const cur = a.queue[0];
          if (cur.type === 'stroll' || cur.type === 'wander' || cur.type === 'goto' || cur.type === 'visit' || cur.type === 'leave' || cur.type === 'petfollow') { a.anim = a.kind === 'pet' ? 'sit' : 'idle'; if (a.kind === 'human' && !a._pose) faceTo(a, p.x, p.z); return; }
          if (cur.ph === 'walk' || cur.ph === 'snap') { a.anim = 'idle'; if (!a._pose) faceTo(a, p.x, p.z); return; }
        } else if (!a._hold.waiting) {
          if (a.kind === 'human') a.anim = a._hold.anim; else a.anim = a._hold.anim || 'sit';
          return;
        } else { a.anim = a.kind === 'pet' ? 'sit' : 'idle'; if (!a._pose) faceTo(a, p.x, p.z); return; }
      }
    }
    if (!a.queue.length) {
      a._idle = (a._idle || 0) + dt;
      if (!a._pose) a.anim = 'idle';
      if (a._idle > (a.kind === 'pet' ? 1 : 1.2)) { a._idle = 0; S.autonomy(a); }
      return;
    }
    a._idle = 0;
    runAction(a, dt);
  }

  function onMinute(m) {
    const md = m % MIN_DAY, wd = Math.floor(m / MIN_DAY) % 7;
    runJobs();
    if (md === 0) onDay();
    if (md % 60 === 0) onHour(md / 60);
    workCheck(md, wd);
    if (G._pizzaOrder && m >= G._pizzaOrder) { G._pizzaOrder = null; G.pizza = 4; note('Pizzaen er leveret! Den står klar i køkkenet.', { icon: '🍕', type: 'good' }); }
    // visitor-tidsgrænser
    for (const id of G.neighbors) {
      const n = G.agents[id]; if (!n || !n.visitor) continue;
      const v = n.visitor;
      if (v.state === 'ringing' && m - v.since > 45) { S.rel(n, G.household[0]).f -= 3; S.leave(n); note(`${n.first} gav op og gik igen.`, { icon: '🚪' }); }
      if (v.state === 'inside' && (m > v.until || md >= 23 * 60 + 30)) { S.leave(n); }
    }
    // knuste ting ryger
    if (m % 2 === 0) for (const o of G.objects) if (o.broken) { const c = W.objCenter(o); W.spawnSmoke(c.x, 1.0, c.z); }
  }
  function onHour(h) {
    watchdog();
    // dekoration
    let dec = 0, indoor = 0;
    for (const o of G.objects) { const c = W.objCenter(o); if (W.isIndoor(Math.floor(c.x), Math.floor(c.z)) || H.CAT_BY_ID[o.type].outdoor) dec += (H.CAT_BY_ID[o.type].decor || 0) * (1 + (o.tier || 0) * 0.5); }
    for (let i = 0; i < W.indoor.length; i++) indoor += W.indoor[i];
    G._decor = indoor ? dec / Math.max(8, indoor / 4) : 0;
    // regninger mandag kl 9
    if (h === 9 && weekday() === 0 && dayIdx() > 0 && G.lastBill !== dayIdx()) {
      G.lastBill = dayIdx();
      const bill = Math.round(120 + S.homeValue() * 0.012);
      G.money -= bill;
      note(`Ugens regninger er betalt: ${H.money(bill)}.`, { icon: '🧾', type: G.money < 0 ? 'bad' : 'info' });
    }
    // besøg
    if (!G.events.welcome && h >= 11 && dayIdx() === 0) {
      G.events.welcome = true;
      const nbs = G.neighbors.map(id => G.agents[id]).filter(n => n.age !== 'child').slice(0, 2);
      nbs.forEach((n, i) => S.later(i * 3, () => S.visit(n, { welcome: true })));
      if (nbs.length) note('Naboerne kommer forbi for at sige velkommen.', { icon: '🏘️' });
    } else if (h >= 9 && h <= 20 && Math.random() < 0.16) {
      const nb = H.pick(G.neighbors.map(id => G.agents[id]).filter(n => n.visitor && n.visitor.state === 'away' && S.rel(n, G.household[0]).f > -20));
      if (nb && S.doorbellTile()) S.visit(nb, {});
    }
    // fodgængere
    if (h >= 7 && h <= 21) {
      for (let k = 0; k < 2; k++) {
        if (Math.random() < 0.55) {
          const nb = H.pick(G.neighbors.map(id => G.agents[id]).filter(n => n.visitor && n.visitor.state === 'away'));
          if (nb) S.later(Math.random() * 55, () => nb.visitor && nb.visitor.state === 'away' && S.stroll(nb));
        }
      }
    }
    // gennemkørende biler
    if (Math.random() < 0.7) W.spawnCar({ dir: Math.random() < 0.5 ? 1 : -1, color: H.pick(['#c43a3a', '#3d7fc4', '#e8e3d8', '#2b2c30', '#6aa84f', '#e8c34a']), stopX: 999 }).state = 'pass';
    // livsmål
    for (const id of G.household) checkAsp(G.agents[id]);
    // nye ønsker
    for (const id of G.household) { const a = G.agents[id]; if (a.kind === 'human' && a.age !== 'baby') S.refillWants(a); }
    if (H.UI && H.UI.onHour) H.UI.onHour(h);
  }
  function onDay() {
    const d = dayIdx();
    for (const id in G.agents) {
      const a = G.agents[id]; if (a.kind !== 'human') continue;
      if (G.settings.aging && !S.hasReward(a, 'evigung')) a.ageDays = (a.ageDays || 0) + 1;
    }
    for (const k in G.rel) { const r = G.rel[k]; const [x, y] = k.split('|'); const hh = G.agents[x] && G.agents[x].isHousehold && G.agents[y] && G.agents[y].isHousehold; if (!hh && r.f > 0) r.f = Math.max(0, r.f - 1.5); }
    note(`${H.DAYS[d % 7]}, dag ${d + 1}`, { icon: '🌅', quiet: true });
    setTimeoutAging();
  }
  function setTimeoutAging() { G._ageCheckAt = Math.floor(G.time / MIN_DAY) * MIN_DAY + 8 * 60; }
  // aldring kl. 8
  const _onHour = onHour;
  function ageCheck() {
    for (const id of G.household.slice()) {
      const a = G.agents[id]; if (!a || a.kind !== 'human') continue;
      const ag = H.AGES[H.ageIdx(a.age)];
      if (a.ageDays >= ag.days && G.settings.aging && !S.hasReward(a, 'evigung')) S.ageUp(a);
    }
  }
  S.ageUp = function (a) {
    const i = H.ageIdx(a.age); if (i >= H.AGES.length - 1) { note(`${a.first} er allerede ældre.`, {}); return; }
    const from = H.AGES[i].name;
    a.age = H.AGES[i + 1].id; a.ageDays = 0;
    if (a.age === 'child') { a.inCrib = null; a._pose = null; a._carriedBy = null; a.career = { id: 'school', level: 0, perf: 50 }; if (!a.look.hair || a.look.hair === 'kort') a.look.hair = a.look.gender === 'f' ? 'hestehale' : 'kort'; a.needs.bladder = 80; const t = adjacentGoals(a)[0]; if (t && !W.free(Math.floor(a.x), Math.floor(a.z))) { a.x = t[0] + 0.5; a.z = t[1] + 0.5; } }
    if (a.age === 'young') { if (a.career && a.career.id === 'school') a.career = null; if (!a.asp) a.asp = H.pick(H.ASPIRATIONS).id; }
    const slots = H.TRAIT_SLOTS[a.age];
    while (a.traits.length < slots) { const t = S.randomTraits(1)[0]; if (!a.traits.includes(t) && !H.TRAIT_CONFLICT.some(([x, y]) => (x === t && a.traits.includes(y)) || (y === t && a.traits.includes(x)))) a.traits.push(t); }
    A.create(a); W.spawnSparkles(a.x, 1.2, a.z, '#ffd56a', 40);
    S.addMoodlet(a, 'bday', 'Fødselsdag!', 18, 24, '🎂');
    a.portrait = null;
    note(`Tillykke! ${a.first} er vokset fra ${from.toLowerCase()} til ${H.AGES[i + 1].name.toLowerCase()}.`, { icon: '🎂', type: 'good', big: true, agent: a.id });
    if (a.age !== 'baby') S.refillWants(a);
    S.emit('ageUp', { a });
    H.UI && H.UI.refreshHousehold && H.UI.refreshHousehold();
  };

  /* --- Job og skole --- */
  S.careerOf = function (a) {
    if (!a.career) return null;
    const c = a.career.id === 'school' ? H.SCHOOL : H.CAREERS.find(x => x.id === a.career.id);
    const lv = c.levels[Math.min(a.career.level, c.levels.length - 1)];
    return { c, title: lv[0], pay: lv[1], start: lv[2], end: lv[3] };
  };
  function workCheck(md, wd) {
    if (md === 8 * 60) ageCheck();
    if (wd > 4) return;
    for (const id of G.household) {
      const a = G.agents[id]; if (!a || a.kind !== 'human' || !a.career) continue;
      const ci = S.careerOf(a); const school = a.career.id === 'school';
      if (md === ci.start * 60 - 60 && !a.atWork) note(`${a.first} skal ${school ? 'i skole' : 'på arbejde'} om en time.`, { icon: school ? '🚌' : '🚗', agent: a.id, quiet: true });
      if (md === ci.start * 60 - 20 && !a.atWork && !a._hidden) {
        if (a.queue[0] && a.queue[0].type === 'work') continue;
        W.spawnCar({ dir: 1, color: school ? '#e8b020' : H.pick(['#3d7fc4', '#25407a', '#2b2c30', '#7a2e2e']), bus: school, stopX: H.LOT.entryX + 0.6, forId: a.id, toWork: true, ready: function () { return this._boarded || (this._waitT = (this._waitT || 0) + 1) > 6000; } });
        S.clearAll(a);
        a.queue.push({ type: 'work', label: school ? 'Tager i skole' : 'Tager på arbejde', icon: school ? '🏫' : '💼' });
      }
      if (a.atWork && md === ci.end * 60) S.returnHome(a);
    }
  }
  S.returnHome = function (a) {
    const ci = S.careerOf(a);
    if (!ci) { a._hidden = false; a.atWork = false; a.x = H.LOT.entryX + 0.5; a.z = 4.5; return; }
    const school = a.career && a.career.id === 'school';
    W.spawnCar({ dir: -1, color: school ? '#e8b020' : '#3d7fc4', bus: school, stopX: H.LOT.entryX + 0.6, forId: a.id, ready: function () { this._w = (this._w || 0) + 1; return this._w > 40; }, onArrive: () => {
      a._hidden = false; a.atWork = false; a._boarded = false; a.x = H.LOT.entryX + 0.5; a.z = 4.5; a.ry = 0;
      if (!a._v) A.create(a);
      const mood = a.mood || 0;
      if (school) {
        a.career.perf = H.clamp(a.career.perf + mood / 12 + 3, 0, 100);
      } else {
        let gain = 6 + mood / 9 + (a.skills[(H.CAREERS.find(c => c.id === a.career.id) || {}).skill] || 0) * 0.8;
        if (S.hasTrait(a, 'ambitioes')) gain *= 1.4; if (S.hasReward(a, 'raket')) gain *= 1.5;
        a.career.perf = H.clamp(a.career.perf + gain, -20, 100);
        const pay = Math.round(ci.pay * (0.85 + Math.max(0, a.career.perf) / 300));
        G.money += pay;
        note(`${a.first} er hjemme fra arbejde og tjente ${H.money(pay)}.`, { icon: '💰', type: 'good', agent: a.id });
        S.emit('earn', { a, amount: pay });
        S.promoteCheck(a);
      }
      const door = S.frontDoorInside();
      a.queue.push({ type: 'goto', tile: door || [H.LOT.entryX, 7], label: 'Går hjem', icon: '🏠', auto: true });
    } });
  };
  S.promoteCheck = function (a) {
    const c = H.CAREERS.find(x => x.id === a.career.id); if (!c) return;
    if (a.career.perf < 100 || a.career.level >= c.levels.length - 1) return;
    const req = c.req[a.career.level + 1];
    if ((a.skills[c.skill] || 0) < req) { if (!a._reqNoted) { a._reqNoted = true; note(`${a.first} kan forfremmes, men skal først nå ${H.SKILLS.find(s => s.id === c.skill).name} niveau ${req}.`, { icon: '📈', agent: a.id }); } return; }
    a.career.level++; a.career.perf = 25; a._reqNoted = false;
    const ci = S.careerOf(a);
    note(`${a.first} er blevet forfremmet til ${ci.title}! Ny løn: ${H.money(ci.pay)} om dagen.`, { icon: '🎉', type: 'good', big: true, agent: a.id });
    S.addMoodlet(a, 'promo', 'Forfremmet!', 25, 24, '🎉');
    W.spawnSparkles(a.x, 1.8, a.z, '#ffd56a', 40);
    S.emit('promote', { a });
  };
  S.setCareer = function (a, cid) {
    if (!cid) { a.career = null; note(`${a.first} har sagt sit job op.`, { icon: '📭', agent: a.id }); return; }
    a.career = { id: cid, level: 0, perf: 20 };
    const ci = S.careerOf(a);
    note(`${a.first} har fået job som ${ci.title}: ${ci.start}:00–${ci.end}:00, ${H.money(ci.pay)} om dagen.`, { icon: '💼', type: 'good', agent: a.id });
    S.emit('job', { a });
  };

  /* --- Besøg og naboer --- */
  S.frontDoor = function () {
    let best = null;
    for (const k in G.walls) {
      const w = G.walls[k]; if (w.t !== 'door' && w.t !== 'arch') continue;
      const [o, xs, zs] = k.split(','); const x = +xs, z = +zs;
      let inT, outT;
      if (o === 'h') { const A1 = [x, z - 1], B1 = [x, z]; if (W.isIndoor(...A1) === W.isIndoor(...B1)) continue; inT = W.isIndoor(...A1) ? A1 : B1; outT = inT === A1 ? B1 : A1; }
      else { const A1 = [x - 1, z], B1 = [x, z]; if (W.isIndoor(...A1) === W.isIndoor(...B1)) continue; inT = W.isIndoor(...A1) ? A1 : B1; outT = inT === A1 ? B1 : A1; }
      const sc = outT[1] + Math.abs(outT[0] - H.LOT.entryX) * 0.3;
      if (!best || sc < best.sc) best = { sc, inT, outT, x: o === 'h' ? x + 0.5 : x, z: o === 'h' ? z : z + 0.5 };
    }
    return best;
  };
  S.doorbellTile = function () { const d = S.frontDoor(); return d ? d.outT : [H.LOT.entryX, 6]; };
  S.frontDoorInside = function () { const d = S.frontDoor(); return d ? d.inT : null; };
  S.visit = function (nb, opts) {
    if (!nb || !nb.visitor || nb.visitor.state !== 'away') return;
    const fromLeft = Math.random() < 0.5;
    nb.x = fromLeft ? 0.5 : 31.5; nb.z = 4.5; nb.ry = fromLeft ? Math.PI / 2 : -Math.PI / 2;
    nb._hidden = false; nb.queue = []; nb._hold = null;
    nb.needs = { hunger: 70, energy: 75, hygiene: 85, bladder: 80, fun: 60, social: 40 };
    if (!nb._v) A.create(nb);
    nb.visitor = { state: 'arriving', invited: !!(opts && (opts.invited || opts.welcome)) };
    nb.queue.push({ type: 'visit', label: 'På besøg', icon: '🔔' });
  };
  S.welcome = function (nb) {
    if (!nb.visitor || nb.visitor.state === 'inside') return;
    nb.visitor.state = 'inside'; nb.visitor.until = G.time + H.rnd(140, 260);
    nb.queue = []; const t = S.frontDoorInside();
    if (t) nb.queue.push({ type: 'goto', tile: t, label: 'Går indenfor', icon: '🚪' });
    S.bubble(nb, '😊', 2);
    for (const id of G.household) S.rel(nb, id).met = true;
    S.emit('visitor', { b: nb });
  };
  S.leave = function (nb) {
    if (!nb.visitor || nb.visitor.state === 'away') return;
    nb.visitor.state = 'leaving';
    if (nb.queue[0] && nb.queue[0].st) endAct(nb, nb.queue[0], true);
    nb.queue = [{ type: 'leave', label: 'Går hjem', icon: '👋' }];
    S.bubble(nb, '👋', 2);
  };
  S.goAway = function (nb) { nb._hidden = true; if (nb.visitor) nb.visitor.state = 'away'; nb.queue = []; nb._hold = null; nb._pose = null; };
  S.stroll = function (nb) {
    if (!nb.visitor || nb.visitor.state !== 'away') return;
    const fromLeft = Math.random() < 0.5;
    nb.x = fromLeft ? 0.5 : 31.5; nb.z = 4.5; nb._hidden = false; nb.queue = []; nb.needs = nb.needs || {};
    if (!nb._v) A.create(nb);
    nb.visitor = { state: 'walking' };
    nb.queue.push({ type: 'stroll', to: fromLeft ? 31 : 0, label: 'Går en tur', icon: '🚶' });
  };
  S.moveIn = function (b) {
    if (b.isHousehold) return;
    G.neighbors = G.neighbors.filter(id => id !== b.id);
    G.household.push(b.id); b.isHousehold = true; b.visitor = null; b.queue = [];
    if (!b.asp && H.isAdult(b)) b.asp = H.pick(H.ASPIRATIONS).id;
    S.refillWants(b);
    for (const id of G.household) if (id !== b.id) S.rel(b, id).met = true;
    note(`${b.first} er flyttet ind i husstanden!`, { icon: '🏠', type: 'good', big: true });
    W.spawnSparkles(b.x, 1.6, b.z, '#9fe0a0', 30);
    H.UI && H.UI.refreshHousehold();
  };
  S.adopt = function (a) {
    if (G.household.length >= 8) { note('Husstanden er fuld (højst 8 personer).', { type: 'bad' }); return; }
    if (G.money < 1500) { note('Det koster 1.500 kr at adoptere.', { type: 'bad' }); return; }
    G.money -= 1500;
    const g = Math.random() < 0.5 ? 'f' : 'm';
    const b = S.makePerson({ first: H.pick(g === 'f' ? H.FIRST_F : H.FIRST_M), last: a.last, age: 'baby', gender: g, household: true, look: S.randomLook(g, 'baby', a.look) });
    b.look.top = 'tshirt'; b.look.topColor = H.pick(['#f4f1ec', '#e8c34a', '#7fc8c4', '#d77ba8', '#3d7fc4']);
    G.household.push(b.id);
    for (const id of G.household) if (id !== b.id) { const r = S.rel(b, id); r.fam = true; r.f = 40; r.met = true; }
    const crib = G.objects.find(o => o.type === 'crib' && !G.household.some(id => G.agents[id].inCrib === o.uid));
    if (crib) { const c = W.objCenter(crib); b.x = c.x; b.z = c.z; b.inCrib = crib.uid; }
    else { const t = adjacentGoals(a)[0] || S.tileOf(a); b.x = t[0] + 0.5; b.z = t[1] + 0.5; }
    A.create(b);
    note(`Velkommen til lille ${b.first}! Babyen har brug for mad, ble og kærlighed.`, { icon: '👶', type: 'good', big: true });
    W.spawnSparkles(b.x, 1, b.z, '#ffb3d1', 40);
    H.UI && H.UI.refreshHousehold();
  };

  /* ===================== Ønsker og livsmål ===================== */
  const nm = id => (G.agents[id] || {}).first || '?';
  const WANTS = [
    { id: 'cook', pts: 150, cond: a => ['teen', 'young', 'adult', 'elder'].includes(a.age) && S.has('stove'), label: () => 'Lav et måltid', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'cook' },
    { id: 'shower', pts: 100, cond: a => a.needs.hygiene < 75, label: () => 'Tag et bad', ev: 'ix', test: (e, a) => e.a === a && ['shower', 'bath'].includes(e.ix) },
    { id: 'tv', pts: 100, cond: () => S.has('tv'), label: () => 'Se fjernsyn', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'watch' },
    { id: 'paint', pts: 200, cond: () => S.has('easel'), label: () => 'Mal et maleri', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'paint' },
    { id: 'run', pts: 200, cond: a => S.has('treadmill') && a.age !== 'child', label: () => 'Træn på løbebåndet', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'run' },
    { id: 'read', pts: 120, cond: () => S.has('bookshelf'), label: () => 'Læs en bog', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'read' },
    { id: 'dance', pts: 150, cond: () => S.has('stereo'), label: () => 'Dans til musik', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'dance' },
    { id: 'chess', pts: 150, cond: () => S.has('chess'), label: () => 'Spil skak', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'chess' },
    { id: 'game', pts: 120, cond: () => S.has('computer'), label: () => 'Spil computerspil', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'game' },
    { id: 'toy', pts: 120, cond: a => a.age === 'child' && S.has('toybox'), label: () => 'Leg med legetøj', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'play' },
    { id: 'homework', pts: 150, cond: a => ['child', 'teen'].includes(a.age) && S.has('computer'), label: () => 'Lav lektier', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'homework' },
    { id: 'talk', pts: 120, param: a => { const k = S.knownPeople(a).filter(x => x.a.age !== 'baby'); return k.length ? H.pick(k).a.id : null; }, label: (a, w) => `Snak med ${nm(w.p)}`, ev: 'social', test: (e, a, w) => e.a === a && e.b.id === w.p && e.ok },
    { id: 'joke', pts: 120, label: () => 'Fortæl en vits', ev: 'social', test: (e, a) => e.a === a && e.si === 'joke' && e.ok },
    { id: 'hug', pts: 150, cond: a => S.knownPeople(a).some(x => x.r.f >= 35 || x.r.fam), label: () => 'Kram nogen', ev: 'social', test: (e, a) => e.a === a && e.si === 'hug' && e.ok },
    { id: 'kiss', pts: 250, param: a => { const p = S.partnerOf(a); return p ? p.id : null; }, label: (a, w) => `Kys ${nm(w.p)}`, ev: 'social', test: (e, a, w) => e.a === a && e.si === 'kiss' && e.b.id === w.p && e.ok },
    { id: 'newfriend', pts: 300, cond: a => a.age !== 'baby', label: () => 'Få en ny ven', ev: 'friend', test: (e, a) => e.a === a || e.b === a },
    { id: 'skill', pts: 250, param: a => { const asp = a.asp && H.ASPIRATIONS.find(x => x.id === a.asp); let pool = H.SKILLS.map(s => s.id).filter(s => a.skills[s] < 10); if (a.age === 'child') pool = pool.filter(s => ['creativity', 'logic'].includes(s)); return pool.length ? H.pick(pool) : null; }, label: (a, w) => `Nå ${H.SKILLS.find(s => s.id === w.p).name} niveau ${w.lvl}`, init: (a, w) => { w.lvl = a.skills[w.p] + 1; }, ev: 'skill', test: (e, a, w) => e.a === a && e.skill === w.p && e.level >= w.lvl },
    { id: 'buy', pts: 120, cond: a => H.isAdult(a), label: () => 'Køb noget nyt til hjemmet', ev: 'buy', test: () => true },
    { id: 'upgrade', pts: 200, cond: a => H.isAdult(a) && G.objects.some(o => o.tier < 2), label: () => 'Opgrader et møbel', ev: 'upgrade', test: () => true },
    { id: 'promote', pts: 500, cond: a => a.career && a.career.id !== 'school', label: () => 'Bliv forfremmet', ev: 'promote', test: (e, a) => e.a === a },
    { id: 'getjob', pts: 300, cond: a => H.isAdult(a) && !a.career, label: () => 'Find et job', ev: 'job', test: (e, a) => e.a === a },
    { id: 'pet', pts: 150, param: () => G.pets.length ? H.pick(G.pets) : null, label: (a, w) => `Leg med ${nm(w.p)}`, ev: 'pet', test: (e, a, w) => e.a === a && e.pet.id === w.p },
    { id: 'earn', pts: 250, cond: a => H.isAdult(a), label: () => 'Tjen 1.000 kr', ev: 'earn', test: (e, a, w) => { w.acc = (w.acc || 0) + e.amount; return w.acc >= 1000; } },
    { id: 'visit', pts: 200, label: () => 'Få besøg', ev: 'visitor', test: () => true },
    { id: 'baby', pts: 200, cond: a => (H.isAdult(a) || a.age === 'teen') && G.household.some(id => G.agents[id].age === 'baby'), label: () => 'Pas babyen', ev: 'baby', test: (e, a) => e.a === a },
    { id: 'sleep', pts: 120, label: () => 'Få en god nats søvn', ev: 'ix', test: (e, a) => e.a === a && e.ix === 'sleep' && a.needs.energy > 90 }
  ];
  S.refillWants = function (a) {
    if (a.kind !== 'human' || a.age === 'baby') return;
    a.wants = (a.wants || []).filter(w => WANTS.find(t => t.id === w.id));
    let guard = 0;
    while (a.wants.length < 3 && guard++ < 40) {
      const t = H.pick(WANTS);
      if (a.wants.some(w => w.id === t.id)) continue;
      if (t.cond && !t.cond(a)) continue;
      const w = { id: t.id, pts: t.pts };
      if (t.param) { w.p = t.param(a); if (!w.p) continue; }
      if (t.init) t.init(a, w);
      w.label = t.label(a, w);
      a.wants.push(w);
    }
  };
  S.rerollWant = function (a, i) { a.wants.splice(i, 1); S.refillWants(a); };
  S.emit = function (ev, e) {
    if (!G) return;
    for (const id of G.household) {
      const a = G.agents[id]; if (!a || a.kind !== 'human' || !a.wants) continue;
      for (let i = a.wants.length - 1; i >= 0; i--) {
        const w = a.wants[i]; const t = WANTS.find(x => x.id === w.id);
        if (!t || t.ev !== ev) continue;
        let ok = false; try { ok = t.test(e, a, w); } catch (er) { ok = false; }
        if (ok) {
          a.points += w.pts; a.wants.splice(i, 1);
          S.addMoodlet(a, 'want', 'Ønske opfyldt', 10, 3, '⭐');
          if (!a._hidden) W.spawnSparkles(a.x, 2, a.z, '#7fe08a', 18);
          note(`${a.first} fik opfyldt et ønske: ${w.label} (+${w.pts} lykkepoint)`, { icon: '⭐', type: 'good', agent: a.id });
          S.later(20, () => S.refillWants(a));
        }
      }
    }
    if (ev === 'skill' || ev === 'promote' || ev === 'social' || ev === 'earn') for (const id of G.household) checkAsp(G.agents[id]);
  };
  function checkAsp(a) {
    if (!a || a.kind !== 'human' || !a.asp) return;
    const asp = H.ASPIRATIONS.find(x => x.id === a.asp); if (!asp) return;
    while (a.aspStep < 3 && asp.steps[a.aspStep].t(a)) {
      const pts = H.ASP_POINTS[a.aspStep];
      a.points += pts; a.aspStep++;
      note(`${a.first} nåede et livsmål: ${asp.steps[a.aspStep - 1].label} (+${pts} lykkepoint)`, { icon: asp.icon, type: 'good', big: true, agent: a.id });
      S.addMoodlet(a, 'asp', 'Livsmål nået', 20, 24, '🏆');
      if (!a._hidden) W.spawnSparkles(a.x, 2, a.z, '#ffd56a', 40);
      if (a.aspStep === 3) note(`${a.first} har fuldført livsmålet «${asp.name}»!`, { icon: '🏆', type: 'good', big: true });
    }
  }
  S.checkAsp = checkAsp;
  S.buyReward = function (a, rid) {
    const r = H.REWARDS.find(x => x.id === rid);
    if (!r || S.hasReward(a, rid) || a.points < r.cost) return false;
    a.points -= r.cost; a.rewards.push(rid);
    note(`${a.first} har fået belønningen «${r.name}».`, { icon: '🎁', type: 'good' });
    return true;
  };

  /* ===================== Menuer (pie) ===================== */
  S.objectMenu = function (a, o) {
    const c = H.CAT_BY_ID[o.type]; const out = [];
    if (!a || a.kind !== 'human') return out;
    if (o.broken) {
      out.push({ label: 'Reparer', icon: '🔧', act: () => S.queue(a, S.mkObjSpecial(o, 'repair'), true) });
      out.push({ label: 'Ring efter reparatør (250 kr)', icon: '📞', act: () => { if (G.money < 250) return note('Der er ikke penge nok.', { type: 'bad' }); G.money -= 250; note('Reparatøren kommer inden for en time.', { icon: '🧰' }); S.later(60, () => { o.broken = false; note(`${c.name} er blevet repareret.`, { icon: '🔧', type: 'good' }); }); } });
      return out;
    }
    for (const ix of c.ix) {
      if (!ix.ages.includes(a.age)) continue;
      let label = ix.label;
      if (ix.id === 'pizza' && G.pizza > 0) { out.push({ label: `Spis pizza (${G.pizza} tilbage)`, icon: '🍕', act: () => S.queue(a, { type: 'stages', build: 'pizza', label: 'Spis pizza', icon: '🍕' }, true) }); continue; }
      out.push({ label, icon: ix.icon, act: () => S.queue(a, S.mkIx(o, ix), true) });
    }
    if (o.tier < 2 && H.isAdult(a)) out.push({ label: `Opgrader til ${H.TIER_NAMES[o.tier + 1]} (${H.money(S.upgradeCost(o))})`, icon: '⬆️', act: () => S.queue(a, S.mkObjSpecial(o, 'upgrade'), true) });
    return out;
  };
  S.agentMenu = function (a, b) {
    if (!a || a.kind !== 'human' || a.age === 'baby') return [];
    if (a === b) return S.selfMenu(a);
    if (b.kind === 'pet') return H.PET_IX.map(d => ({ label: d.label, icon: d.icon, act: () => S.queue(a, mkPet(b, d.id), true) }));
    if (b.age === 'baby') {
      if (a.age === 'child') return [{ label: 'Leg med', icon: '🧸', act: () => S.queue(a, mkCare(b, 'playbaby'), true) }];
      return H.BABY_CARE.map(d => ({ label: d.id === 'cribbaby' && b.inCrib ? 'Tag op af sengen' : d.label, icon: d.icon, act: () => S.queue(a, mkCare(b, d.id), true) }));
    }
    const list = S.socialsFor(a, b); const cats = {};
    list.forEach(si => { (cats[si.cat] = cats[si.cat] || []).push(si); });
    return Object.keys(cats).map(cn => ({ label: cn, icon: { Venlig: '😊', Sjov: '😂', Romantisk: '💕', Uvenlig: '😠', Spørg: '❔' }[cn], sub: cats[cn].map(si => ({ label: si.label, icon: si.icon, act: () => S.queue(a, { type: 'social', target: b.id, si: si.id, label: `${si.label}: ${b.first}`, icon: si.icon }, true) })) }));
  };
  S.selfMenu = function (a) {
    const out = [];
    if (a.age !== 'elder') out.push({ label: 'Fejr fødselsdag', icon: '🎂', act: () => S.queue(a, { type: 'self', kind: 'birthday', label: 'Fejrer fødselsdag', icon: '🎂' }, true) });
    out.push({ label: 'Ring til en nabo', icon: '📱', act: () => S.queue(a, { type: 'self', kind: 'phone', label: 'Ringer', icon: '📱', then: (x) => H.UI.openInvite(x) }, true) });
    if (H.isAdult(a)) out.push({ label: a.career ? 'Skift job' : 'Find et job (avis)', icon: '📰', act: () => S.queue(a, { type: 'self', kind: 'phone', label: 'Læser jobannoncer', icon: '📰', then: (x) => H.UI.openJobPicker(x) }, true) });
    out.push({ label: 'Stræk ud', icon: '🙆', act: () => S.queue(a, { type: 'self', kind: 'stretch', anim: 'stretch', dur: 3, label: 'Strækker ud', icon: '🙆' }, true) });
    out.push({ label: 'Dans', icon: '💃', act: () => S.queue(a, { type: 'wait', anim: 'dance', dur: 20, label: 'Danser', icon: '💃', onDone: x => { x.needs.fun = Math.min(100, x.needs.fun + 15); } }, true) });
    return out;
  };
  S.groundMenu = function (a, x, z) {
    const tx = Math.floor(x), tz = Math.floor(z);
    if (!a || a.kind !== 'human' || a.age === 'baby') return [];
    if (!W.inWorld(tx, tz) || !W.free(tx, tz)) return [];
    return [{ label: 'Gå hertil', icon: '🚶', act: () => S.queue(a, { type: 'goto', tile: [tx, tz], pt: { x, z }, label: 'Går', icon: '🚶' }, true) },
            { label: 'Løb hertil', icon: '🏃', act: () => { const act = { type: 'goto', tile: [tx, tz], pt: { x, z }, label: 'Løber', icon: '🏃' }; S.queue(a, act, true); act._run = true; } }];
  };
  // løbe-flag
  const _gotoTick = H_.goto.tick;
  H_.goto.tick = function (a, act, dt) { a._runNext = !!act._run; const r = _gotoTick(a, act, dt); if (r) a._runNext = false; return r; };

  /* ===================== Køb / salg ===================== */
  S.canPlace = function (type, x, z, rot, ignoreUid) {
    const c = H.CAT_BY_ID[type]; const o = { type, x, z, rot };
    const tiles = W.objTiles(o);
    for (const [tx, tz] of tiles) {
      if (!W.inLot(tx, tz)) return false;
      if (!c.rug) { const id = W.occ[tz * H.WORLD + tx]; if (id !== 0 && id !== ignoreUid) return false; }
      else if (G.objects.some(q => q.uid !== ignoreUid && H.CAT_BY_ID[q.type].rug && W.objTiles(q).some(([qx, qz]) => qx === tx && qz === tz))) return false;
    }
    // må ikke krydse vægge internt
    for (const [tx, tz] of tiles) {
      if (tiles.some(([ux, uz]) => ux === tx + 1 && uz === tz) && W.wallAt('v', tx + 1, tz)) return false;
      if (tiles.some(([ux, uz]) => ux === tx && uz === tz + 1) && W.wallAt('h', tx, tz + 1)) return false;
    }
    if (!c.rug) for (const [tx, tz] of tiles) for (const a of S.present()) { if (Math.floor(a.x) === tx && Math.floor(a.z) === tz && !a._pose) return 'agent'; }
    return true;
  };
  S.buy = function (type, x, z, rot) {
    const c = H.CAT_BY_ID[type];
    if (G.money < c.price) { note('Der er ikke penge nok.', { type: 'bad' }); return null; }
    const ok = S.canPlace(type, x, z, rot); if (ok !== true) return null;
    G.money -= c.price;
    const o = S.addObj(type, x, z, rot, 0);
    W.addObjectMesh(o); W.rebuildOcc();
    S.emit('buy', { type });
    return o;
  };
  S.sellValue = o => Math.round((H.CAT_BY_ID[o.type].price + (o.spent || 0)) * 0.7);
  S.sell = function (o) {
    // frigør personer der bruger objektet
    for (const a of Object.values(G.agents)) { const q = a.queue[0]; if (q && (q.uid === o.uid || q._resUid === o.uid)) S.clearAll(a); if (a.inCrib === o.uid) { a.inCrib = null; a._pose = null; } }
    G.money += S.sellValue(o);
    G.objects = G.objects.filter(q => q !== o); W.removeObjectMesh(o); W.rebuildOcc();
  };
  S.moveObj = function (o, x, z, rot) {
    if (S.canPlace(o.type, x, z, rot, o.uid) !== true) return false;
    for (const a of Object.values(G.agents)) { const q = a.queue[0]; if (q && (q.uid === o.uid || q._resUid === o.uid)) S.clearAll(a); }
    o.x = x; o.z = z; o.rot = rot; W.addObjectMesh(o); W.rebuildOcc();
    for (const a of Object.values(G.agents)) if (a.inCrib === o.uid) { const c = W.objCenter(o); a.x = c.x; a.z = c.z; }
    return true;
  };
  // flyt personer ud af vægge/objekter efter byggeri
  S.unstick = function () {
    for (const a of S.present()) {
      if (a._pose || a.inCrib || a._carriedBy) continue;
      const [x, z] = S.tileOf(a); if (W.free(x, z)) continue;
      for (let r = 1; r < 6; r++) { let done = false; for (let dx = -r; dx <= r && !done; dx++) for (let dz = -r; dz <= r && !done; dz++) { if (W.free(x + dx, z + dz)) { a.x = x + dx + 0.5; a.z = z + dz + 0.5; done = true; } } if (done) break; }
    }
  };

  /* ===================== Gem ===================== */
  S.serialize = function () {
    return JSON.stringify(G, (k, v) => {
      if (typeof k === 'string' && k.charAt(0) === '_') return undefined;
      if (k === 'queue') return [];
      if (k === 'portrait') return undefined;
      return v;
    });
  };
  S.visualTick = function (dtReal) {
    if (!G) return;
    const rate = Math.min(3, Math.max(0.0001, H.SPEEDS[G.speed] || 0)) || 0.0001;
    for (const id in G.agents) {
      const a = G.agents[id];
      if (a._hidden) { if (a._v) a._v.P.root.visible = false; continue; }
      if (!a._v) A.create(a);
      A.update(a, dtReal, G.speed === 0 ? 0.25 : rate);
    }
    // tv-skærme, computere, bruser m.m.
    const tt = performance.now() / 1000;
    for (const o of G.objects) {
      const g = W.objMeshes[o.uid]; if (!g) continue; const ud = g.userData;
      if (ud.screen) { const on = (o._watchers || 0) + (o._on || 0) > 0; ud.screen.emissiveIntensity = on ? 0.85 + Math.sin(tt * 6) * 0.08 + Math.sin(tt * 17) * 0.04 : 0; if (on && ud.screen.emissiveMap) ud.screen.emissiveMap.offset.x = Math.floor(tt / 4) * 0.13 % 1; }
      if (ud.water) ud.water.opacity = (o._on || 0) > 0 ? 0.28 + Math.sin(tt * 20) * 0.05 : 0;
      if (ud.led) ud.led.emissiveIntensity = (o._on || 0) > 0 ? 0.6 + Math.sin(tt * 9) * 0.5 : 0.15;
      if (ud.spin) ud.spin.rotation.y += dtReal * 0.5;
      if (ud.fish) ud.fish.forEach((f, i) => { const k = tt * (0.6 + i * 0.2) + i * 2; f.position.x = Math.sin(k) * 0.32; f.position.z = -0.2 + Math.cos(k * 1.3) * 0.1; f.rotation.y = Math.cos(k) > 0 ? 0 : Math.PI; });
      if (ud.burner && (o._on || 0) > 0 && Math.random() < 0.08) { const c = W.objCenter(o); W.spawnSmoke(c.x, 1.05, c.z); }
      if (o.type === 'stereo' && (o._on || 0) > 0 && Math.random() < dtReal * 3) { const c = W.objCenter(o); W.spawnNote(c.x, 1.0, c.z, H.pick(['#8fd3ff', '#ffb3d1', '#ffe27a'])); }
    }
  };
})();
