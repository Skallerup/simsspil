/* Hjemliv — 3D-modeller (møbler, personer, dyr, omgivelser) */
'use strict';
(function () {
  const M = H.M = {};
  const T = THREE;
  const matCache = {}, geoCache = {};

  M.mat = function (color, rough = 0.72, metal = 0, opts) {
    const key = color + '|' + rough + '|' + metal + '|' + (opts ? JSON.stringify(opts) : '');
    if (matCache[key]) return matCache[key];
    const m = new T.MeshStandardMaterial(Object.assign({ color: lin(color), roughness: rough, metalness: metal }, linOpts(opts)));
    matCache[key] = m; return m;
  };
  function lin(c) { return new T.Color(c).convertSRGBToLinear(); }
  function linOpts(o) { if (!o) return {}; const r = Object.assign({}, o); if (r.emissive && r.emissive.isColor) r.emissive = r.emissive.clone().convertSRGBToLinear(); return r; }
  M.lin = lin;
  M.uniqueMat = (color, rough = 0.7, metal = 0, opts) => new T.MeshStandardMaterial(Object.assign({ color: lin(color), roughness: rough, metalness: metal }, linOpts(opts)));
  M.glass = () => M.mat('#bcd7e6', 0.08, 0.1, { transparent: true, opacity: 0.32, depthWrite: false });
  M.emis = (color, intensity = 1) => M.mat(color, 0.5, 0, { emissive: new T.Color(color), emissiveIntensity: intensity });

  function g(key, fn) { if (!geoCache[key]) geoCache[key] = fn(); return geoCache[key]; }
  M.boxG = (w, h, d) => g('b' + w + ',' + h + ',' + d, () => new T.BoxGeometry(w, h, d));
  M.cylG = (rt, rb, h, s = 16) => g('c' + rt + ',' + rb + ',' + h + ',' + s, () => new T.CylinderGeometry(rt, rb, h, s));
  M.sphG = (r, ws = 16, hs = 12) => g('s' + r + ',' + ws + ',' + hs, () => new T.SphereGeometry(r, ws, hs));
  M.rboxG = function (w, h, d, r) {
    r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    return g('r' + w + ',' + h + ',' + d + ',' + r, () => {
      const sw = w - 2 * r, sh = h - 2 * r, cr = Math.min(r * 0.6, sw / 2, sh / 2);
      const s = new T.Shape(), x = -sw / 2, y = -sh / 2;
      s.moveTo(x + cr, y); s.lineTo(x + sw - cr, y); s.quadraticCurveTo(x + sw, y, x + sw, y + cr);
      s.lineTo(x + sw, y + sh - cr); s.quadraticCurveTo(x + sw, y + sh, x + sw - cr, y + sh);
      s.lineTo(x + cr, y + sh); s.quadraticCurveTo(x, y + sh, x, y + sh - cr);
      s.lineTo(x, y + cr); s.quadraticCurveTo(x, y, x + cr, y);
      const geo = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 4 });
      geo.center(); geo.computeVertexNormals(); return geo;
    });
  };

  function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  M.add = add;
  const box = (p, w, h, d, mat, x, y, z) => add(p, M.boxG(w, h, d), mat, x, y, z);
  const rbox = (p, w, h, d, r, mat, x, y, z) => add(p, M.rboxG(w, h, d, r), mat, x, y, z);
  const cyl = (p, rt, rb, h, mat, x, y, z, s) => add(p, M.cylG(rt, rb, h, s || 16), mat, x, y, z);
  const sph = (p, r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = add(p, M.sphG(r, 18, 14), mat, x, y, z); m.scale.set(sx, sy, sz); return m; };

  /* ---------- Teksturer ---------- */
  function canvasTex(size, draw, repeat) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'); draw(ctx, size);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    if (repeat) t.repeat.set(repeat, repeat);
    return t;
  }
  function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function shade(hex, amt) {
    const c = new T.Color(hex); const hsl = {}; c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, H.clamp(hsl.l + amt, 0, 1)); return '#' + c.getHexString();
  }
  M.shade = shade;
  function noise(ctx, s, base, amp, n, rnd, alpha = 0.08) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${alpha * rnd()})` : `rgba(0,0,0,${alpha * rnd()})`;
      const r = 1 + rnd() * amp; ctx.fillRect(rnd() * s, rnd() * s, r, r);
    }
  }
  const floorTexCache = {};
  M.floorTex = function (fid) {
    if (floorTexCache[fid]) return floorTexCache[fid];
    const f = H.FLOORS.find(x => x.id === fid) || H.FLOORS[0];
    const rnd = seeded(fid.length * 977 + 13);
    const t = canvasTex(256, (ctx, s) => {
      if (f.kind === 'wood') {
        const n = 4, pw = s / n;
        for (let i = 0; i < n; i++) {
          const off = (i % 2) * s * 0.5 + rnd() * 30;
          for (let k = -1; k < 2; k++) {
            ctx.fillStyle = shade(i % 2 ? f.c1 : f.c2, (rnd() - 0.5) * 0.05);
            ctx.fillRect(i * pw, off + k * s, pw, s);
          }
          for (let l = 0; l < 14; l++) {
            ctx.strokeStyle = `rgba(60,30,10,${0.05 + rnd() * 0.08})`; ctx.lineWidth = 1;
            ctx.beginPath(); const x = i * pw + rnd() * pw; ctx.moveTo(x, 0);
            ctx.bezierCurveTo(x + rnd() * 6 - 3, s * 0.3, x + rnd() * 6 - 3, s * 0.6, x + rnd() * 4 - 2, s); ctx.stroke();
          }
          ctx.fillStyle = 'rgba(40,20,5,0.35)'; ctx.fillRect(i * pw, 0, 1.5, s);
          ctx.fillRect(i * pw, (off % s), pw, 1.5);
        }
      } else if (f.kind === 'tile' || f.kind === 'checker') {
        const n = 2, tw = s / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          ctx.fillStyle = f.kind === 'checker' ? ((i + j) % 2 ? f.c2 : f.c1) : shade(f.c1, (rnd() - 0.5) * 0.04);
          ctx.fillRect(i * tw, j * tw, tw, tw);
        }
        ctx.strokeStyle = f.kind === 'checker' ? 'rgba(0,0,0,0.25)' : f.c2; ctx.lineWidth = 4;
        for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * tw, 0); ctx.lineTo(i * tw, s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * tw); ctx.lineTo(s, i * tw); ctx.stroke(); }
        for (let k = 0; k < 900; k++) { ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.06})`; ctx.fillRect(rnd() * s, rnd() * s, 2, 2); }
      } else if (f.kind === 'carpet') {
        noise(ctx, s, f.c1, 2, 9000, rnd, 0.12);
      } else if (f.kind === 'marble') {
        ctx.fillStyle = f.c1; ctx.fillRect(0, 0, s, s);
        for (let v = 0; v < 7; v++) {
          ctx.strokeStyle = `rgba(120,110,100,${0.12 + rnd() * 0.2})`; ctx.lineWidth = 0.6 + rnd() * 1.6;
          ctx.beginPath(); let x = rnd() * s, y = 0; ctx.moveTo(x, y);
          while (y < s) { x += (rnd() - 0.5) * 40; y += 10 + rnd() * 25; ctx.lineTo(x, y); } ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, s, s);
      } else if (f.kind === 'stone') {
        ctx.fillStyle = shade(f.c2, -0.08); ctx.fillRect(0, 0, s, s);
        const rects = [[0, 0, 0.55, 0.45], [0.55, 0, 0.45, 0.6], [0, 0.45, 0.35, 0.55], [0.35, 0.45, 0.2, 0.55], [0.55, 0.6, 0.45, 0.4]];
        rects.forEach(r => { ctx.fillStyle = shade(f.c1, (rnd() - 0.5) * 0.08); ctx.fillRect(r[0] * s + 3, r[1] * s + 3, r[2] * s - 6, r[3] * s - 6); });
        for (let k = 0; k < 2500; k++) { ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; ctx.fillRect(rnd() * s, rnd() * s, 2, 2); }
      } else {
        noise(ctx, s, f.c1, 3, 6000, rnd, 0.1);
      }
    });
    floorTexCache[fid] = t; return t;
  };
  const floorMatCache = {};
  M.floorMat = fid => floorMatCache[fid] || (floorMatCache[fid] = new T.MeshStandardMaterial({ map: M.floorTex(fid), roughness: (H.FLOORS.find(f => f.id === fid) || {}).kind === 'marble' ? 0.25 : 0.78, metalness: 0 }));

  const wallTexCache = {};
  M.wallMat = function (pid) {
    if (wallTexCache[pid]) return wallTexCache[pid];
    const p = H.WALLPAINTS.find(w => w.id === pid) || H.WALLPAINTS[0];
    let mat;
    if (p.brick) {
      const rnd = seeded(11);
      const t = canvasTex(256, (ctx, s) => {
        ctx.fillStyle = '#d8cfc4'; ctx.fillRect(0, 0, s, s);
        const rows = 8, bh = s / rows, bw = s / 4;
        for (let r = 0; r < rows; r++) for (let c = -1; c < 5; c++) {
          ctx.fillStyle = shade(p.c, (rnd() - 0.5) * 0.12);
          ctx.fillRect(c * bw + (r % 2) * bw / 2 + 2, r * bh + 2, bw - 4, bh - 4);
        }
      });
      t.repeat.set(1, 1.35);
      mat = new T.MeshStandardMaterial({ map: t, roughness: 0.9 });
    } else if (p.panel) {
      const rnd = seeded(5);
      const t = canvasTex(256, (ctx, s) => {
        for (let i = 0; i < 6; i++) { ctx.fillStyle = shade(p.c, (rnd() - 0.5) * 0.08); ctx.fillRect(i * s / 6, 0, s / 6, s); ctx.fillStyle = 'rgba(40,20,5,0.4)'; ctx.fillRect(i * s / 6, 0, 2, s); }
      });
      mat = new T.MeshStandardMaterial({ map: t, roughness: 0.75 });
    } else {
      mat = new T.MeshStandardMaterial({ color: lin(p.c), roughness: 0.92 });
    }
    wallTexCache[pid] = mat; return mat;
  };

  M.grassTex = () => canvasTex(512, (ctx, s) => {
    const rnd = seeded(3);
    ctx.fillStyle = '#7fae4e'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(${rnd() > 0.5 ? '160,200,90' : '70,120,40'},${0.08 + rnd() * 0.08})`; ctx.beginPath(); ctx.arc(rnd() * s, rnd() * s, 20 + rnd() * 60, 0, 7); ctx.fill(); }
    for (let i = 0; i < 26000; i++) { const v = rnd(); ctx.fillStyle = v > 0.5 ? `rgba(190,225,120,${rnd() * 0.25})` : `rgba(40,85,25,${rnd() * 0.25})`; ctx.fillRect(rnd() * s, rnd() * s, 1, 2 + rnd() * 3); }
  });
  M.asphaltTex = () => canvasTex(256, (ctx, s) => { noise(ctx, s, '#4a4c50', 2, 9000, seeded(9), 0.12); });
  M.sidewalkTex = () => canvasTex(256, (ctx, s) => {
    noise(ctx, s, '#c9c6bf', 2, 4000, seeded(4), 0.08);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, s, s);
  });
  let tvT, pcT;
  M.tvTex = () => tvT || (tvT = canvasTex(128, (ctx, s) => {
    const gr = ctx.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#4aa3df'); gr.addColorStop(0.6, '#bfe3f7'); gr.addColorStop(0.61, '#5fae4f'); gr.addColorStop(1, '#3d7f36');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(s * 0.75, s * 0.25, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#e85d5d'; ctx.fillRect(s * 0.2, s * 0.45, 22, 26); ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.arc(s * 0.2 + 11, s * 0.4, 9, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(6, s - 18, 50, 10);
  }));
  M.pcTex = () => pcT || (pcT = canvasTex(128, (ctx, s) => {
    ctx.fillStyle = '#1d2533'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#2f3b52'; ctx.fillRect(0, 0, s, 14);
    const cols = ['#7fe0a8', '#8fd3ff', '#ffd27a', '#ff8fa8', '#c3b6ff'];
    for (let i = 0; i < 12; i++) { ctx.fillStyle = cols[i % 5]; ctx.fillRect(10 + (i % 3) * 8, 22 + i * 8, 30 + ((i * 37) % 60), 4); }
  }));
  M.checkerTex = () => canvasTex(128, (ctx, s) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = (i + j) % 2 ? '#2b241f' : '#efe6d4'; ctx.fillRect(i * s / 8, j * s / 8, s / 8, s / 8); } });
  M.rugTex = (c1, c2) => canvasTex(256, (ctx, s) => {
    ctx.fillStyle = c1; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = c2; ctx.lineWidth = 10; ctx.strokeRect(14, 14, s - 28, s - 28);
    ctx.lineWidth = 3; ctx.strokeRect(32, 32, s - 64, s - 64);
    ctx.fillStyle = c2; ctx.save(); ctx.translate(s / 2, s / 2); ctx.rotate(Math.PI / 4); ctx.fillRect(-40, -40, 80, 80); ctx.restore();
    ctx.fillStyle = c1; ctx.save(); ctx.translate(s / 2, s / 2); ctx.rotate(Math.PI / 4); ctx.fillRect(-24, -24, 48, 48); ctx.restore();
    const rnd = seeded(2); for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.07})`; ctx.fillRect(rnd() * s, rnd() * s, 1, 1); }
  });

  /* ---------- Paletter efter niveau ---------- */
  const WOOD = ['#c99a63', '#8a5a37', '#3b2a22'];
  const FAB = ['#9aa5b0', '#3f6f8f', '#702f40'];
  const MET = ['#cfd3d6', '#3a3d42', '#c9a24c'];
  const ACC = ['#e9e4da', '#d9cdb5', '#c9a24c'];
  const wood = t => M.mat(WOOD[t], 0.62);
  const fab = t => M.mat(FAB[t], 0.92);
  const met = t => M.mat(MET[t], 0.35, t === 2 ? 0.85 : 0.6);
  const white = M.mat('#f4f3ef', 0.4);
  const ceramic = M.mat('#f7f7f4', 0.18, 0.02);
  const dark = M.mat('#24262a', 0.5);
  const chrome = M.mat('#dfe3e6', 0.18, 0.9);

  function legs4(p, w, d, h, mat, r = 0.03, inset = 0.06) {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cyl(p, r, r * 0.8, h, mat, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset), 8));
  }

  /* ---------- Møbler ---------- */
  const B = {};
  B.bed_single = (t) => bed(t, 1);
  B.bed_double = (t) => bed(t, 2);
  function bed(t, size) {
    const G = new T.Group(); const W = size === 2 ? 1.9 : 0.95, D = 1.95;
    rbox(G, W, 0.28, D, 0.03, wood(t), 0, 0.27, 0);
    legs4(G, W, D, 0.14, t === 2 ? met(2) : wood(t), 0.035, 0.08);
    rbox(G, W - 0.08, 0.2, D - 0.1, 0.06, white, 0, 0.5, 0.02);
    const blanket = M.mat(t === 0 ? '#7fa1c4' : t === 1 ? '#4f7e6a' : '#7a2e45', 0.95);
    rbox(G, W - 0.02, 0.07, 1.28, 0.03, blanket, 0, 0.6, 0.33);
    rbox(G, W - 0.0, 0.03, 0.22, 0.015, M.mat(shade(blanket.color.getStyle ? '#' + blanket.color.getHexString() : '#888', 0.1), 0.95), 0, 0.64, -0.24);
    const nP = size;
    for (let i = 0; i < nP; i++) rbox(G, size === 2 ? 0.72 : 0.62, 0.12, 0.34, 0.05, M.mat('#fbfaf6', 0.9), size === 2 ? (i ? 0.45 : -0.45) : 0, 0.66, -0.72);
    const hbH = t === 2 ? 1.25 : 0.95;
    if (t === 2) { rbox(G, W + 0.06, hbH, 0.12, 0.05, fab(2), 0, hbH / 2 + 0.05, -0.98); for (let i = -2; i <= 2; i++) for (let j = 0; j < 2; j++) sph(G, 0.018, M.mat(MET[2], 0.3, 0.8), i * W / 5.5, 0.75 + j * 0.25, -0.91); }
    else rbox(G, W + 0.04, hbH, 0.08, 0.03, wood(t), 0, hbH / 2 + 0.02, -0.97);
    if (t >= 1) rbox(G, W + 0.04, 0.45, 0.06, 0.02, wood(t), 0, 0.3, 0.97);
    return G;
  }
  B.crib = (t) => {
    const G = new T.Group(); const m = t === 2 ? M.mat('#f2ece0', 0.6) : wood(t);
    box(G, 0.86, 0.06, 0.86, m, 0, 0.3, 0);
    rbox(G, 0.78, 0.1, 0.78, 0.04, M.mat('#fbf6ee', 0.9), 0, 0.38, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(G, 0.025, 0.025, 0.95, m, a * 0.42, 0.47, b * 0.42, 8));
    for (let side = 0; side < 4; side++) {
      for (let i = -3; i <= 3; i++) {
        const x = side < 2 ? i * 0.11 : (side === 2 ? -0.42 : 0.42), z = side < 2 ? (side === 0 ? -0.42 : 0.42) : i * 0.11;
        cyl(G, 0.012, 0.012, 0.5, m, x, 0.58, z, 6);
      }
    }
    [[0, -0.42, 0.86, 0.04], [0, 0.42, 0.86, 0.04]].forEach(([x, z, w, d]) => box(G, w, 0.04, d, m, x, 0.84, z));
    box(G, 0.04, 0.04, 0.86, m, -0.42, 0.84, 0); box(G, 0.04, 0.04, 0.86, m, 0.42, 0.84, 0);
    cyl(G, 0.01, 0.01, 0.5, m, 0.42, 1.1, -0.42, 6);
    const mob = new T.Group(); mob.position.set(0.25, 1.3, -0.25); G.add(mob);
    ['#e7a1a1', '#9fc8e8', '#f2d27a'].forEach((c, i) => { sph(mob, 0.04, M.mat(c, 0.6), Math.cos(i * 2.1) * 0.12, -0.12, Math.sin(i * 2.1) * 0.12); });
    G.userData.spin = mob;
    return G;
  };
  B.dresser = (t) => {
    const G = new T.Group();
    rbox(G, 0.92, 1.9, 0.58, 0.02, wood(t), 0, 0.95, -0.2);
    box(G, 0.005, 1.7, 0.01, M.mat('#000000', 0.9, 0, { transparent: true, opacity: 0.35 }), 0, 0.98, 0.1);
    [-0.06, 0.06].forEach(x => cyl(G, 0.012, 0.012, 0.3, met(t), x, 1.05, 0.11, 8));
    box(G, 0.9, 0.04, 0.02, M.mat(shade(WOOD[t], -0.12), 0.6), 0, 0.3, 0.1);
    if (t === 2) { box(G, 0.96, 0.06, 0.62, M.mat(MET[2], 0.3, 0.8), 0, 1.92, -0.2); }
    return G;
  };
  B.nightstand = (t) => {
    const G = new T.Group();
    rbox(G, 0.5, 0.55, 0.45, 0.02, wood(t), 0, 0.28, -0.15);
    cyl(G, 0.012, 0.012, 0.03, met(t), 0, 0.4, 0.09, 6).rotation.x = Math.PI / 2;
    cyl(G, 0.06, 0.08, 0.04, met(t), 0, 0.58, -0.15);
    cyl(G, 0.012, 0.012, 0.25, met(t), 0, 0.72, -0.15, 6);
    const shadeM = M.uniqueMat(t === 2 ? '#efe2c4' : '#f5efe2', 0.9, 0, { emissive: new T.Color('#ffd9a0'), emissiveIntensity: 0 });
    cyl(G, 0.09, 0.15, 0.18, shadeM, 0, 0.88, -0.15, 20);
    G.userData.lightY = 0.85; G.userData.lightZ = -0.15; G.userData.glow = shadeM;
    return G;
  };
  B.fridge = (t) => {
    const G = new T.Group(); const body = M.mat(t === 0 ? '#f3f2ee' : t === 1 ? '#c3c8cc' : '#2a2c30', t === 1 ? 0.3 : 0.35, t === 1 ? 0.7 : 0.1);
    rbox(G, 0.82, 1.86, 0.7, 0.05, body, 0, 0.93, -0.12);
    box(G, 0.8, 0.012, 0.01, dark, 0, 1.25, 0.235);
    cyl(G, 0.015, 0.015, 0.5, t === 2 ? met(2) : chrome, 0.32, 1.55, 0.27, 8);
    cyl(G, 0.015, 0.015, 0.35, t === 2 ? met(2) : chrome, 0.32, 0.95, 0.27, 8);
    if (t >= 1) box(G, 0.2, 0.3, 0.02, M.mat('#1d2228', 0.3), -0.18, 1.5, 0.235);
    return G;
  };
  B.stove = (t) => {
    const G = new T.Group(); const body = M.mat(t === 0 ? '#f1f0ec' : t === 1 ? '#c5cace' : '#26282c', 0.35, t === 1 ? 0.7 : 0.1);
    rbox(G, 0.9, 0.88, 0.62, 0.02, body, 0, 0.44, -0.16);
    box(G, 0.88, 0.03, 0.6, M.mat('#15161a', 0.2, 0.2), 0, 0.895, -0.16);
    [[-0.2, -0.28], [0.2, -0.28], [-0.2, -0.04], [0.2, -0.04]].forEach(([x, z]) => { const b = cyl(G, 0.09, 0.09, 0.01, M.mat('#3a3b40', 0.4), x, 0.915, z, 20); });
    box(G, 0.7, 0.42, 0.02, M.mat('#101114', 0.15, 0.3), 0, 0.42, 0.155);
    cyl(G, 0.012, 0.012, 0.55, chrome, 0, 0.7, 0.18, 8).rotation.z = Math.PI / 2;
    for (let i = 0; i < 4; i++) cyl(G, 0.025, 0.025, 0.03, dark, -0.3 + i * 0.2, 0.8, 0.165, 10).rotation.x = Math.PI / 2;
    const pot = new T.Group(); pot.position.set(0.2, 0.92, -0.04); G.add(pot);
    cyl(pot, 0.1, 0.09, 0.12, met(Math.min(t, 1)), 0, 0.06, 0, 16);
    G.userData.burner = pot;
    return G;
  };
  function counterBase(G, t) {
    rbox(G, 1.0, 0.86, 0.6, 0.015, wood(t), 0, 0.43, -0.18);
    box(G, 0.005, 0.7, 0.01, M.mat('#000', 0.9, 0, { transparent: true, opacity: 0.3 }), 0, 0.45, 0.125);
    [-0.06, 0.06].forEach(x => box(G, 0.03, 0.12, 0.02, met(t), x, 0.7, 0.13));
    box(G, 1.0, 0.05, 0.66, M.mat(t === 0 ? '#e8e3d8' : t === 1 ? '#3c3f44' : '#f2f0ea', t === 2 ? 0.15 : 0.4), 0, 0.885, -0.16);
  }
  B.counter = (t) => { const G = new T.Group(); counterBase(G, t); sph(G, 0.08, M.mat('#c9a35a', 0.5), -0.25, 0.95, -0.25, 1, 0.5, 1); return G; };
  B.kitchen_sink = (t) => {
    const G = new T.Group(); counterBase(G, t);
    box(G, 0.6, 0.02, 0.38, M.mat('#a9aeb2', 0.25, 0.8), 0, 0.905, -0.16);
    box(G, 0.56, 0.01, 0.34, M.mat('#6f7478', 0.3, 0.8), 0, 0.91, -0.16);
    const f = new T.Group(); f.position.set(0, 0.91, -0.38); G.add(f);
    cyl(f, 0.02, 0.025, 0.3, chrome, 0, 0.15, 0, 10);
    const arc = add(f, new T.TorusGeometry(0.09, 0.015, 8, 16, Math.PI), chrome, 0, 0.3, 0.09, 0, Math.PI / 2, 0);
    return G;
  };
  B.dining_table = (t) => {
    const G = new T.Group();
    rbox(G, 1.85, 0.06, 0.92, 0.025, wood(t), 0, 0.76, 0);
    if (t === 2) { box(G, 1.2, 0.02, 0.3, M.mat('#f2ead8', 0.9), 0, 0.8, 0); }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(G, 0.035, 0.025, 0.74, t === 2 ? met(1) : wood(t), a * 0.82, 0.37, b * 0.36, 10));
    cyl(G, 0.05, 0.06, 0.18, M.mat('#e9e4da', 0.3), 0.1, 0.88, 0, 12);
    sph(G, 0.05, M.mat('#d55a5a', 0.7), 0.06, 1.0, 0); sph(G, 0.045, M.mat('#f0c94e', 0.7), 0.15, 0.99, 0.02);
    return G;
  };
  B.chair = (t) => {
    const G = new T.Group();
    rbox(G, 0.46, 0.05, 0.44, 0.02, wood(t), 0, 0.45, 0.02);
    if (t >= 1) rbox(G, 0.42, 0.04, 0.4, 0.02, fab(t), 0, 0.49, 0.02);
    legs4(G, 0.44, 0.42, 0.44, wood(t), 0.02, 0.04);
    rbox(G, 0.44, 0.42, 0.04, 0.015, wood(t), 0, 0.72, -0.19);
    return G;
  };
  B.toilet = (t) => {
    const G = new T.Group();
    cyl(G, 0.14, 0.11, 0.32, ceramic, 0, 0.16, 0.06, 20);
    const bowl = add(G, M.sphG(0.2, 20, 12), ceramic, 0, 0.36, 0.08); bowl.scale.set(0.95, 0.4, 1.15);
    add(G, new T.TorusGeometry(0.17, 0.025, 8, 24), M.mat(t === 2 ? '#2b2b2e' : '#f7f7f4', 0.3), 0, 0.42, 0.08, Math.PI / 2, 0, 0).scale.set(1, 1.15, 1);
    rbox(G, 0.42, 0.42, 0.18, 0.04, ceramic, 0, 0.62, -0.3);
    box(G, 0.08, 0.02, 0.04, chrome, 0.12, 0.84, -0.3);
    return G;
  };
  B.shower = (t) => {
    const G = new T.Group();
    box(G, 0.96, 0.08, 0.96, ceramic, 0, 0.04, 0);
    const tile = M.mat(t === 0 ? '#dfe7ea' : t === 1 ? '#7fa5a8' : '#2d3138', 0.3);
    box(G, 0.96, 2.1, 0.04, tile, 0, 1.05, -0.46);
    box(G, 0.04, 2.1, 0.92, tile, -0.46, 1.05, 0);
    add(G, M.boxG(0.02, 1.9, 0.92), M.glass(), 0.47, 1.03, 0);
    add(G, M.boxG(0.5, 1.9, 0.02), M.glass(), 0.2, 1.03, 0.47);
    cyl(G, 0.015, 0.015, 0.5, chrome, 0, 1.85, -0.42, 8);
    cyl(G, 0.1, 0.1, 0.02, t === 2 ? met(2) : chrome, 0, 2.05, -0.3, 18);
    cyl(G, 0.012, 0.012, 0.18, chrome, 0, 2.06, -0.38, 6).rotation.x = Math.PI / 2;
    const water = M.uniqueMat('#cfe8f5', 0.1, 0, { transparent: true, opacity: 0, depthWrite: false });
    const w = add(G, M.cylG(0.1, 0.32, 1.9, 16, true), water, 0, 1.06, -0.25); w.castShadow = false;
    G.userData.water = water;
    return G;
  };
  B.bathtub = (t) => {
    const G = new T.Group(); const shell = t === 2 ? M.mat('#f5f2ea', 0.2) : ceramic;
    rbox(G, 0.88, 0.55, 1.9, 0.08, shell, 0, 0.28, 0);
    box(G, 0.72, 0.02, 1.7, M.mat('#e9eef0', 0.15), 0, 0.555, 0);
    const water = M.mat('#9fd3e8', 0.05, 0.1, { transparent: true, opacity: 0.6 });
    box(G, 0.7, 0.01, 1.68, water, 0, 0.5, 0);
    const f = new T.Group(); f.position.set(0, 0.56, -0.86); G.add(f);
    cyl(f, 0.02, 0.02, 0.18, t === 2 ? met(2) : chrome, 0, 0.09, 0, 8);
    add(f, new T.TorusGeometry(0.06, 0.013, 8, 12, Math.PI), t === 2 ? met(2) : chrome, 0, 0.18, 0.06, 0, Math.PI / 2, 0);
    if (t === 2) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => sph(G, 0.05, met(2), a * 0.36, 0.03, b * 0.8));
    return G;
  };
  B.bath_sink = (t) => {
    const G = new T.Group();
    if (t === 2) { rbox(G, 0.8, 0.78, 0.48, 0.02, wood(2), 0, 0.39, -0.22); box(G, 0.82, 0.04, 0.5, M.mat('#f2f0ea', 0.15), 0, 0.8, -0.22); }
    else cyl(G, 0.07, 0.11, 0.75, ceramic, 0, 0.375, -0.22, 16);
    const b = add(G, M.sphG(0.25, 20, 10), ceramic, 0, 0.84, -0.18); b.scale.set(1, 0.32, 0.8);
    box(G, 0.4, 0.01, 0.26, M.mat('#dfe6ea', 0.1), 0, 0.92, -0.18);
    cyl(G, 0.015, 0.02, 0.18, chrome, 0, 1.0, -0.38, 8);
    box(G, 0.03, 0.02, 0.12, chrome, 0, 1.08, -0.33);
    return G;
  };
  B.mirror = (t) => {
    const G = new T.Group();
    const fr = add(G, new T.TorusGeometry(0.3, 0.035, 10, 32), t === 2 ? met(2) : wood(t), 0, 1.15, -0.12);
    fr.scale.set(1, 1.6, 1);
    const glass = add(G, new T.CircleGeometry(0.29, 32), M.mat('#c9dbe6', 0.04, 1.0), 0, 1.15, -0.115); glass.scale.set(1, 1.6, 1);
    const back = add(G, new T.CircleGeometry(0.29, 32), M.mat('#555', 0.6), 0, 1.15, -0.125, 0, Math.PI, 0); back.scale.set(1, 1.6, 1);
    [[-0.22, 0.12], [0.22, 0.12], [0, -0.32]].forEach(([x, z]) => { const l = cyl(G, 0.015, 0.02, 0.75, t === 2 ? met(2) : wood(t), x * 0.9, 0.36, z - 0.12, 8); });
    return G;
  };
  function sofaLike(t, W, seats) {
    const G = new T.Group(); const f = fab(t), f2 = M.mat(shade(FAB[t], 0.08), 0.95);
    rbox(G, W, 0.28, 0.84, 0.05, f, 0, 0.26, 0);
    for (let i = 0; i < seats; i++) rbox(G, (W - 0.34) / seats - 0.01, 0.14, 0.66, 0.06, f2, -((W - 0.34) / 2) + ((W - 0.34) / seats) * (i + 0.5), 0.46, 0.06);
    rbox(G, W, 0.52, 0.22, 0.07, f, 0, 0.62, -0.31);
    [-1, 1].forEach(s => rbox(G, 0.18, 0.56, 0.84, 0.07, f, s * (W / 2 - 0.09), 0.36, 0));
    legs4(G, W, 0.84, 0.12, t === 2 ? met(2) : wood(1), 0.025, 0.06);
    if (seats > 1) {
      rbox(G, 0.36, 0.3, 0.12, 0.06, M.mat(t === 0 ? '#e7c26b' : t === 1 ? '#d8b98a' : '#c9a24c', 0.95), -W / 2 + 0.38, 0.68, -0.16).rotation.z = 0.1;
      rbox(G, 0.36, 0.3, 0.12, 0.06, M.mat(t === 0 ? '#e7c26b' : t === 1 ? '#d8b98a' : '#c9a24c', 0.95), W / 2 - 0.38, 0.68, -0.16).rotation.z = -0.1;
    }
    return G;
  }
  B.sofa = (t) => sofaLike(t, 1.92, 2);
  B.armchair = (t) => sofaLike(t, 0.92, 1);
  B.bench = (t) => {
    const G = new T.Group(); const w = wood(t), m = met(1);
    for (let i = 0; i < 4; i++) box(G, 1.8, 0.03, 0.09, w, 0, 0.45, -0.15 + i * 0.11);
    for (let i = 0; i < 3; i++) box(G, 1.8, 0.09, 0.03, w, 0, 0.6 + i * 0.12, -0.25 - i * 0.02);
    [-0.8, 0.8].forEach(x => { box(G, 0.05, 0.45, 0.45, m, x, 0.22, 0); box(G, 0.05, 0.5, 0.05, m, x, 0.7, -0.26); });
    return G;
  };
  B.coffee_table = (t) => {
    const G = new T.Group();
    if (t === 2) { cyl(G, 0.42, 0.42, 0.04, M.mat('#f1efe9', 0.12), 0, 0.42, 0, 32); cyl(G, 0.08, 0.2, 0.4, met(2), 0, 0.2, 0, 16); }
    else { rbox(G, 0.82, 0.05, 0.62, 0.02, wood(t), 0, 0.42, 0); legs4(G, 0.8, 0.6, 0.4, wood(t), 0.025, 0.06); box(G, 0.7, 0.02, 0.5, wood(t), 0, 0.12, 0); }
    box(G, 0.22, 0.02, 0.3, M.mat('#d24e4e', 0.8), -0.12, 0.455, 0.05).rotation.y = 0.3;
    return G;
  };
  B.tv = (t) => {
    const G = new T.Group();
    rbox(G, 0.95, 0.46, 0.42, 0.02, wood(t), 0, 0.23, -0.2);
    box(G, 0.86, 0.01, 0.01, M.mat('#000', 0.9, 0, { transparent: true, opacity: 0.4 }), 0, 0.25, 0.012);
    const sw = t === 0 ? 0.78 : t === 1 ? 0.9 : 0.98, sh = sw * 0.58;
    rbox(G, sw + 0.04, sh + 0.04, 0.04, 0.01, M.mat('#16171a', 0.3), 0, 0.5 + sh / 2 + 0.05, -0.28);
    const scr = M.uniqueMat('#0b0d10', 0.2, 0.1, { emissive: new T.Color('#ffffff'), emissiveIntensity: 0, emissiveMap: M.tvTex() });
    const s = add(G, new T.PlaneGeometry(sw, sh), scr, 0, 0.5 + sh / 2 + 0.05, -0.255);
    box(G, 0.2, 0.04, 0.12, M.mat('#16171a', 0.3), 0, 0.48, -0.28);
    G.userData.screen = scr;
    return G;
  };
  B.stereo = (t) => {
    const G = new T.Group(); const c = M.mat(t === 2 ? '#1e1f22' : '#2f3034', 0.4);
    rbox(G, 0.36, 0.3, 0.32, 0.02, c, 0, 0.6, -0.18);
    rbox(G, 0.5, 0.45, 0.34, 0.02, wood(t), 0, 0.225, -0.18);
    [-0.33, 0.33].forEach(x => { rbox(G, 0.22, 0.95, 0.26, 0.02, c, x, 0.475, -0.2); cyl(G, 0.07, 0.07, 0.02, M.mat('#111', 0.6), x, 0.65, -0.065, 18).rotation.x = Math.PI / 2; cyl(G, 0.045, 0.045, 0.02, M.mat('#111', 0.6), x, 0.32, -0.065, 18).rotation.x = Math.PI / 2; });
    const led = M.uniqueMat('#55d0ff', 0.4, 0, { emissive: new T.Color('#2ab0ff'), emissiveIntensity: 0.6 });
    box(G, 0.2, 0.04, 0.01, led, 0, 0.62, -0.015);
    G.userData.led = led;
    return G;
  };
  B.bookshelf = (t) => {
    const G = new T.Group(); const w = wood(t);
    box(G, 0.92, 1.9, 0.04, w, 0, 0.95, -0.46);
    [-0.44, 0.44].forEach(x => box(G, 0.04, 1.9, 0.36, w, x, 0.95, -0.3));
    for (let i = 0; i < 5; i++) box(G, 0.88, 0.03, 0.36, w, 0, 0.05 + i * 0.45, -0.3);
    const rnd = seeded(7 + t), cols = ['#a63d40', '#e9b872', '#90a959', '#6494aa', '#3a3e4a', '#d8c9a8', '#7b4b94'];
    for (let s = 0; s < 4; s++) {
      let x = -0.4;
      while (x < 0.36) {
        const bw = 0.03 + rnd() * 0.04, bh = 0.26 + rnd() * 0.12;
        if (rnd() > 0.12) box(G, bw, bh, 0.24, M.mat(cols[Math.floor(rnd() * cols.length)], 0.85), x + bw / 2, 0.065 + s * 0.45 + bh / 2, -0.3);
        x += bw + 0.004;
      }
    }
    return G;
  };
  B.computer = (t) => {
    const G = new T.Group(); const w = t === 2 ? M.mat('#f0eee8', 0.3) : wood(t);
    rbox(G, 0.98, 0.04, 0.6, 0.015, w, 0, 0.75, -0.18);
    [-0.45, 0.45].forEach(x => box(G, 0.04, 0.73, 0.56, t === 2 ? met(1) : w, x, 0.365, -0.18));
    const scr = M.uniqueMat('#0b0d10', 0.2, 0.1, { emissive: new T.Color('#ffffff'), emissiveIntensity: 0, emissiveMap: M.pcTex() });
    rbox(G, 0.56, 0.34, 0.03, 0.01, M.mat('#1a1b1e', 0.3), 0, 1.03, -0.33);
    add(G, new T.PlaneGeometry(0.52, 0.3), scr, 0, 1.03, -0.313);
    cyl(G, 0.02, 0.02, 0.12, M.mat('#1a1b1e', 0.3), 0, 0.82, -0.35, 8);
    box(G, 0.18, 0.012, 0.12, M.mat('#1a1b1e', 0.3), 0, 0.776, -0.35);
    box(G, 0.4, 0.018, 0.13, M.mat('#2c2e33', 0.5), 0, 0.78, -0.08);
    sph(G, 0.03, M.mat('#2c2e33', 0.5), 0.3, 0.78, -0.08, 1, 0.5, 1.4);
    if (t >= 1) { box(G, 0.12, 0.42, 0.4, M.mat('#1d1f24', 0.4), 0.33, 0.21, -0.22); }
    // kontorstol
    const ch = new T.Group(); ch.position.set(0, 0, 0.62); G.add(ch);
    const cm = t === 2 ? M.mat('#2a2b2f', 0.6) : fab(Math.max(t, 0));
    rbox(ch, 0.46, 0.08, 0.44, 0.03, cm, 0, 0.46, 0);
    rbox(ch, 0.44, 0.5, 0.06, 0.03, cm, 0, 0.78, 0.22);
    cyl(ch, 0.03, 0.03, 0.36, chrome, 0, 0.24, 0, 8);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; box(ch, 0.03, 0.03, 0.25, chrome, Math.sin(a) * 0.12, 0.05, Math.cos(a) * 0.12).rotation.y = a; }
    G.userData.screen = scr;
    return G;
  };
  B.easel = (t) => {
    const G = new T.Group(); const w = wood(t);
    [[-0.28, 0.1, 0.12], [0.28, 0.1, -0.12]].forEach(([x, z, rz]) => { const l = box(G, 0.04, 1.65, 0.04, w, x * 0.8, 0.8, -0.05); l.rotation.z = rz; });
    const back = box(G, 0.04, 1.5, 0.04, w, 0, 0.75, -0.35); back.rotation.x = -0.3;
    box(G, 0.7, 0.04, 0.08, w, 0, 0.72, -0.02);
    box(G, 0.62, 0.72, 0.03, M.mat('#fbf9f4', 0.9), 0, 1.1, -0.04);
    const canvasArt = M.uniqueMat('#fbf9f4', 0.9);
    const art = add(G, new T.PlaneGeometry(0.56, 0.66), canvasArt, 0, 1.1, -0.022);
    art.visible = false; G.userData.art = art; G.userData.artMat = canvasArt;
    box(G, 0.3, 0.02, 0.2, M.mat('#8a6a4a', 0.7), 0.42, 0.75, 0.15);
    ['#d24e4e', '#3f7fc4', '#e8c34a'].forEach((c, i) => sph(G, 0.025, M.mat(c, 0.5), 0.36 + i * 0.06, 0.77, 0.15, 1, 0.4, 1));
    return G;
  };
  B.treadmill = (t) => {
    const G = new T.Group(); const c = M.mat(t === 2 ? '#1c1d20' : '#3a3d43', 0.45);
    rbox(G, 0.74, 0.14, 1.75, 0.03, c, 0, 0.07, 0.05);
    box(G, 0.56, 0.01, 1.55, M.mat('#16171a', 0.9), 0, 0.145, 0.08);
    [-0.33, 0.33].forEach(x => { const p = box(G, 0.04, 1.2, 0.04, t === 2 ? met(2) : chrome, x, 0.66, -0.78); p.rotation.x = 0.12; });
    rbox(G, 0.7, 0.2, 0.14, 0.03, c, 0, 1.25, -0.86).rotation.x = -0.6;
    const scr = M.uniqueMat('#2ab0ff', 0.3, 0, { emissive: new T.Color('#2a8fff'), emissiveIntensity: 0.4 });
    add(G, new T.PlaneGeometry(0.3, 0.1), scr, 0, 1.3, -0.79, -0.6);
    [-0.34, 0.34].forEach(x => box(G, 0.04, 0.04, 0.7, t === 2 ? met(2) : chrome, x, 1.0, -0.5));
    return G;
  };
  B.chess = (t) => {
    const G = new T.Group();
    rbox(G, 0.62, 0.05, 0.62, 0.02, wood(t), 0, 0.7, 0);
    cyl(G, 0.06, 0.18, 0.68, wood(t), 0, 0.34, 0, 12);
    const bm = new T.MeshStandardMaterial({ map: M.checkerTex(), roughness: 0.4 });
    add(G, new T.PlaneGeometry(0.48, 0.48), bm, 0, 0.727, 0, -Math.PI / 2);
    const rnd = seeded(4);
    for (let i = 0; i < 14; i++) { const wpc = i < 7; cyl(G, 0.018, 0.022, 0.05 + rnd() * 0.04, M.mat(wpc ? '#f2ead6' : '#2a211c', 0.4), -0.21 + (i % 7) * 0.07, 0.75, wpc ? 0.19 - rnd() * 0.08 : -0.19 + rnd() * 0.08, 10); }
    return G;
  };
  B.guitar = (t) => {
    const G = new T.Group(); const m = met(1);
    [[-0.12, 0.1], [0.12, 0.1], [0, -0.14]].forEach(([x, z]) => box(G, 0.02, 0.3, 0.02, m, x, 0.15, z));
    const gt = new T.Group(); gt.position.set(0, 0.3, 0); gt.rotation.x = -0.18; G.add(gt);
    const body = M.mat(t === 0 ? '#c88a3a' : t === 1 ? '#8b2f2f' : '#1a1a1d', 0.35);
    sph(gt, 0.17, body, 0, 0.18, 0, 1, 1.05, 0.32);
    sph(gt, 0.13, body, 0, 0.4, 0, 1, 1.0, 0.32);
    cyl(gt, 0.04, 0.04, 0.02, M.mat('#111', 0.6), 0, 0.26, 0.05, 16).rotation.x = Math.PI / 2;
    box(gt, 0.05, 0.5, 0.03, wood(2), 0, 0.75, 0.01);
    box(gt, 0.07, 0.12, 0.03, wood(2), 0, 1.05, 0.0);
    G.userData.prop = gt;
    return G;
  };
  B.toybox = (t) => {
    const G = new T.Group(); const c = M.mat(t === 0 ? '#e58b5a' : t === 1 ? '#5aa0e5' : '#e5c45a', 0.6);
    rbox(G, 0.8, 0.45, 0.5, 0.04, c, 0, 0.225, -0.15);
    rbox(G, 0.84, 0.06, 0.54, 0.03, M.mat(shade('#' + c.color.getHexString(), -0.1), 0.6), 0, 0.48, -0.15);
    sph(G, 0.1, M.mat('#d84545', 0.5), 0.25, 0.1, 0.25);
    box(G, 0.12, 0.12, 0.12, M.mat('#4f9e5a', 0.6), -0.2, 0.06, 0.28).rotation.y = 0.5;
    sph(G, 0.08, M.mat('#a77c52', 0.95), -0.25, 0.62, -0.15);
    sph(G, 0.06, M.mat('#a77c52', 0.95), -0.25, 0.75, -0.15);
    return G;
  };
  B.pet_bowl = (t) => {
    const G = new T.Group();
    cyl(G, 0.16, 0.13, 0.08, M.mat(t === 2 ? '#c9a24c' : '#d65a5a', 0.4, t === 2 ? 0.8 : 0), -0.15, 0.04, 0, 20);
    const food = add(G, M.cylG(0.13, 0.13, 0.02, 16), M.mat('#8b5a2b', 0.9), -0.15, 0.08, 0);
    cyl(G, 0.14, 0.11, 0.08, M.mat('#5a8fd6', 0.4), 0.18, 0.04, 0, 20);
    add(G, M.cylG(0.11, 0.11, 0.01, 16), M.mat('#a9d8f0', 0.05, 0, { transparent: true, opacity: 0.8 }), 0.18, 0.075, 0);
    G.userData.food = food;
    return G;
  };
  B.pet_bed = (t) => {
    const G = new T.Group(); const c = fab(t);
    add(G, new T.TorusGeometry(0.32, 0.1, 12, 28), c, 0, 0.1, 0, Math.PI / 2, 0, 0);
    cyl(G, 0.34, 0.34, 0.06, M.mat(shade(FAB[t], 0.15), 0.95), 0, 0.05, 0, 28);
    return G;
  };
  function pot(G, r, h, t, y = 0) {
    const c = M.mat(t === 0 ? '#c4704a' : t === 1 ? '#efece5' : '#2b2c30', 0.6);
    cyl(G, r, r * 0.75, h, c, 0, y + h / 2, 0, 18);
    cyl(G, r * 0.92, r * 0.92, 0.02, M.mat('#4a3424', 0.95), 0, y + h - 0.01, 0, 18);
  }
  B.plant = (t) => {
    const G = new T.Group(); pot(G, 0.16, 0.3, t);
    const leaf = M.mat('#4f8f45', 0.7), leaf2 = M.mat('#6aa84f', 0.7);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const l = sph(G, 0.08, i % 2 ? leaf : leaf2, Math.cos(a) * 0.1, 0.48 + (i % 3) * 0.06, Math.sin(a) * 0.1, 0.6, 1.4, 0.35); l.rotation.set(Math.sin(a) * 0.6, -a, Math.cos(a) * 0.6); }
    sph(G, 0.1, leaf, 0, 0.58, 0, 1, 1.2, 1);
    return G;
  };
  B.palm = (t) => {
    const G = new T.Group(); pot(G, 0.2, 0.42, t);
    const leaf = M.mat('#2f6e3a', 0.6), stem = M.mat('#5a7a3a', 0.8);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, tilt = 0.5 + (i % 3) * 0.25;
      const st = new T.Group(); st.position.set(0, 0.42, 0); st.rotation.set(0, a, 0); G.add(st);
      const arm = new T.Group(); arm.rotation.x = tilt; st.add(arm);
      cyl(arm, 0.01, 0.012, 0.7, stem, 0, 0.35, 0, 6);
      const l = sph(arm, 0.2, leaf, 0, 0.78, 0.04, 0.9, 1.2, 0.12); l.rotation.x = -0.4;
    }
    return G;
  };
  B.floor_lamp = (t) => {
    const G = new T.Group(); const m = met(t);
    cyl(G, 0.16, 0.18, 0.03, m, 0, 0.015, 0, 20);
    cyl(G, 0.015, 0.015, 1.5, m, 0, 0.77, 0, 8);
    const shadeM = M.uniqueMat(t === 1 ? '#e5d5b5' : '#f6f0e4', 0.9, 0, { emissive: new T.Color('#ffd9a0'), emissiveIntensity: 0, side: T.DoubleSide });
    add(G, M.cylG(0.16, 0.24, 0.3, 24, true), shadeM, 0, 1.55, 0);
    G.userData.lightY = 1.45; G.userData.glow = shadeM;
    return G;
  };
  B.sculpture = (t) => {
    const G = new T.Group();
    box(G, 0.4, 0.8, 0.4, M.mat('#efece6', 0.5), 0, 0.4, 0);
    const k = add(G, new T.TorusKnotGeometry(0.14, 0.04, 80, 10, 2, 3), M.mat(t === 0 ? '#b07a45' : t === 1 ? '#c9d0d6' : '#d4af37', 0.25, 0.9), 0, 1.02, 0);
    G.userData.spin = k;
    return G;
  };
  B.rug = (t) => {
    const G = new T.Group();
    const cols = [['#c7b299', '#7a5c44'], ['#3f6f8f', '#e9dfc9'], ['#702f40', '#d9b45a']][t];
    const m = new T.MeshStandardMaterial({ map: M.rugTex(cols[0], cols[1]), roughness: 0.95 });
    const r = add(G, M.rboxG(1.8, 0.02, 1.8, 0.008), m, 0, 0.012, 0); r.castShadow = false;
    return G;
  };
  B.aquarium = (t) => {
    const G = new T.Group();
    rbox(G, 0.9, 0.7, 0.42, 0.02, wood(t), 0, 0.35, -0.2);
    const water = M.mat('#5fb7d6', 0.05, 0, { transparent: true, opacity: 0.45, emissive: new T.Color('#2a8fb0'), emissiveIntensity: 0.3, depthWrite: false });
    add(G, M.boxG(0.86, 0.5, 0.38), water, 0, 0.96, -0.2).castShadow = false;
    box(G, 0.88, 0.04, 0.4, M.mat('#222', 0.4), 0, 1.23, -0.2);
    box(G, 0.84, 0.04, 0.36, M.mat('#d9c9a0', 0.9), 0, 0.73, -0.2);
    sph(G, 0.06, M.mat('#3f7a4a', 0.7), -0.25, 0.85, -0.25, 0.6, 2, 0.6);
    sph(G, 0.05, M.mat('#4f9a5a', 0.7), 0.3, 0.82, -0.28, 0.6, 1.6, 0.6);
    const fishes = [];
    ['#ff8a3d', '#ffd23d', '#4dc3ff'].forEach((c, i) => { const f = sph(G, 0.03, M.mat(c, 0.4), 0, 0.9 + i * 0.08, -0.2, 1.6, 1, 0.6); f.castShadow = false; fishes.push(f); });
    G.userData.fish = fishes; G.userData.lightY = 1.1; G.userData.lightZ = -0.2; G.userData.lightColor = '#7fd3ff'; G.userData.lightPow = 0.5;
    return G;
  };
  B.tree = (t, seed) => {
    const G = new T.Group(); const rnd = seeded(seed || 17 + t * 31);
    const trunk = M.mat('#6b4a33', 0.9);
    cyl(G, 0.08, 0.13, 1.6, trunk, 0, 0.8, 0, 8);
    const fol = [M.mat('#4f8a3c', 0.85, 0, { flatShading: true }), M.mat('#5f9c45', 0.85, 0, { flatShading: true }), M.mat('#3f7a35', 0.85, 0, { flatShading: true })];
    if (t === 2) fol[0] = M.mat('#c46a3a', 0.85, 0, { flatShading: true });
    for (let i = 0; i < 6; i++) {
      const r = 0.45 + rnd() * 0.3;
      const m = add(G, g('ico' + Math.round(r * 100), () => new T.IcosahedronGeometry(r, 1)), fol[i % 3], (rnd() - 0.5) * 0.7, 1.9 + rnd() * 0.9, (rnd() - 0.5) * 0.7);
      m.rotation.set(rnd() * 3, rnd() * 3, 0);
    }
    return G;
  };
  B.hedge = (t) => {
    const G = new T.Group(); const m = M.mat(t === 2 ? '#2a5a2e' : '#3f7536', 0.9, 0, { flatShading: true });
    add(G, g('hedge', () => { const geo = new T.BoxGeometry(0.96, 0.85, 0.96, 3, 3, 3); const p = geo.attributes.position; const r = seeded(8); for (let i = 0; i < p.count; i++) { p.setXYZ(i, p.getX(i) * (1 + (r() - 0.5) * 0.12), p.getY(i) * (1 + (r() - 0.5) * 0.1), p.getZ(i) * (1 + (r() - 0.5) * 0.12)); } geo.computeVertexNormals(); return geo; }), m, 0, 0.425, 0);
    return G;
  };
  B.flowerbed = (t) => {
    const G = new T.Group();
    box(G, 0.96, 0.12, 0.96, M.mat('#8a6a4a', 0.8), 0, 0.06, 0);
    box(G, 0.88, 0.04, 0.88, M.mat('#4a3424', 0.95), 0, 0.12, 0);
    const rnd = seeded(21 + t), cols = [['#e85d75', '#f2c14e', '#f7f3e8'], ['#9b5de5', '#f15bb5', '#fee440'], ['#ff595e', '#ffca3a', '#8ac926']][t];
    for (let i = 0; i < 16; i++) {
      const x = (rnd() - 0.5) * 0.75, z = (rnd() - 0.5) * 0.75, h = 0.12 + rnd() * 0.15;
      cyl(G, 0.008, 0.008, h, M.mat('#3f7a35', 0.8), x, 0.14 + h / 2, z, 5);
      sph(G, 0.035, M.mat(cols[i % 3], 0.6), x, 0.14 + h, z);
    }
    return G;
  };
  B.grill = (t) => {
    const G = new T.Group(); const c = M.mat(t === 0 ? '#2b2c30' : t === 1 ? '#a63d3d' : '#c9ccd0', 0.4, 0.4);
    const b = add(G, new T.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), c, 0, 0.82, 0);
    const lid = add(G, new T.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), c, 0, 0.84, -0.05); lid.rotation.x = -0.5;
    [[0, 0.22], [0.2, -0.12], [-0.2, -0.12]].forEach(([x, z]) => { const l = cyl(G, 0.015, 0.015, 0.7, M.mat('#333', 0.5), x, 0.35, z, 6); });
    add(G, new T.CircleGeometry(0.28, 20), M.mat('#555', 0.6, 0.5), 0, 0.83, 0, -Math.PI / 2);
    G.userData.burner = lid;
    return G;
  };
  B.lamp_post = (t) => {
    const G = new T.Group(); const m = M.mat('#2b2c30', 0.5, 0.5);
    cyl(G, 0.08, 0.1, 0.08, m, 0, 0.04, 0, 12);
    cyl(G, 0.03, 0.03, 1.4, m, 0, 0.74, 0, 8);
    const glow = M.uniqueMat('#fff1cf', 0.4, 0, { emissive: new T.Color('#ffd58a'), emissiveIntensity: 0, transparent: true, opacity: 0.9 });
    add(G, M.cylG(0.09, 0.12, 0.22, 6), glow, 0, 1.55, 0);
    add(G, M.cylG(0.02, 0.15, 0.08, 6), m, 0, 1.7, 0);
    G.userData.lightY = 1.5; G.userData.glow = glow;
    return G;
  };

  M.buildObject = function (typeId, tier = 0, seed) {
    const fn = B[typeId];
    const G = fn ? fn(tier, seed) : new T.Group();
    G.traverse(o => { if (o.isMesh) { o.userData.pick = true; } });
    return G;
  };

  /* ---------- Vægge ---------- */
  M.buildWallSegment = function (type, paint, horizontal) {
    // segment langs lokal x fra -0.5..0.5, tykkelse z
    const G = new T.Group(); const Hh = H.WALL_H, th = 0.12;
    const mat = M.wallMat(paint);
    const trim = M.mat('#f7f5f0', 0.5);
    const piece = (x0, x1, y0, y1) => {
      const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
      const m = add(G, M.boxG(w, h, th), mat, (x0 + x1) / 2, (y0 + y1) / 2, 0);
      m.userData.wallPiece = true;
    };
    if (type === 'wall') piece(-0.5, 0.5, 0, Hh);
    else if (type === 'door' || type === 'arch') {
      const dw = 0.84, dh = 2.08;
      piece(-0.5, -dw / 2, 0, Hh); piece(dw / 2, 0.5, 0, Hh); piece(-dw / 2, dw / 2, dh, Hh);
      [[-dw / 2 - 0.02], [dw / 2 + 0.02]].forEach(([x]) => add(G, M.boxG(0.05, dh, th + 0.04), trim, x, dh / 2, 0));
      add(G, M.boxG(dw + 0.1, 0.06, th + 0.04), trim, 0, dh + 0.03, 0);
      if (type === 'door') {
        const hinge = new T.Group(); hinge.position.set(-dw / 2, 0, 0); G.add(hinge);
        const panel = M.mat('#f2efe8', 0.55);
        add(hinge, M.rboxG(dw - 0.02, dh - 0.02, 0.045, 0.01), panel, dw / 2, dh / 2, 0);
        [[0.55], [1.45]].forEach(([y]) => add(hinge, M.boxG(dw - 0.22, 0.6, 0.02), M.mat('#e9e5dc', 0.6), dw / 2, y, 0.025));
        [[0.035], [-0.035]].forEach(([z]) => add(hinge, M.sphG(0.025, 10, 8), M.mat('#c9a24c', 0.3, 0.8), dw - 0.1, 1.0, z));
        G.userData.hinge = hinge;
      }
    } else if (type === 'window') {
      const ww = 0.76, y0 = 0.9, y1 = 2.05;
      piece(-0.5, -ww / 2, 0, Hh); piece(ww / 2, 0.5, 0, Hh); piece(-ww / 2, ww / 2, 0, y0); piece(-ww / 2, ww / 2, y1, Hh);
      const gl = M.uniqueMat('#c9dde8', 0.05, 0.2, { transparent: true, opacity: 0.35, emissive: new T.Color('#ffb85a'), emissiveIntensity: 0, depthWrite: false });
      const gm = add(G, M.boxG(ww, y1 - y0, 0.02), gl, 0, (y0 + y1) / 2, 0); gm.castShadow = false; gm.userData.glass = true;
      add(G, M.boxG(ww + 0.08, 0.05, th + 0.08), trim, 0, y0 - 0.02, 0);
      add(G, M.boxG(ww + 0.04, 0.04, th + 0.02), trim, 0, y1, 0);
      add(G, M.boxG(0.03, y1 - y0, th * 0.5), trim, 0, (y0 + y1) / 2, 0);
      add(G, M.boxG(ww, 0.03, th * 0.5), trim, 0, (y0 + y1) / 2, 0);
      G.userData.glass = gl;
    }
    // top-kant
    if (type !== 'none') { const cap = add(G, M.boxG(1.0, 0.02, th + 0.01), M.mat('#3a3b3f', 0.8), 0, Hh + 0.01, 0); cap.userData.cap = true; }
    return G;
  };
  M.buildPost = function () {
    const m = new T.Mesh(M.boxG(0.14, H.WALL_H + 0.02, 0.14), M.mat('#f3efe7', 0.9));
    m.castShadow = true; m.receiveShadow = true; m.position.y = (H.WALL_H + 0.02) / 2; return m;
  };

  /* ---------- Personer ---------- */
  function limbGeo(rt, rb, len) { return g('limb' + rt + rb + len, () => { const geo = new T.CylinderGeometry(rt, rb, len, 14, 1); geo.translate(0, -len / 2, 0); return geo; }); }
  function latheLimb(key, pts, open) {
    return g('ll' + key, () => { const geo = new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), 16); if (!open) { /* lukket i enderne via led-kugler */ } geo.computeVertexNormals(); return geo; });
  }
  function latheTorso(fem, key) {
    return g('torso' + key, () => {
      const pts = fem
        ? [[0.001, 0.06], [0.146, 0.07], [0.15, 0.13], [0.118, 0.24], [0.138, 0.34], [0.154, 0.41], [0.156, 0.47], [0.132, 0.53], [0.08, 0.565], [0.001, 0.575]]
        : [[0.001, 0.06], [0.142, 0.07], [0.147, 0.14], [0.137, 0.24], [0.15, 0.34], [0.165, 0.43], [0.166, 0.49], [0.142, 0.535], [0.085, 0.567], [0.001, 0.578]];
      return new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), 24);
    });
  }
  function hairCap(R, t0, t1, p0 = 0, pl = Math.PI * 2) { return g('hc' + R + t0 + t1 + p0 + pl, () => new T.SphereGeometry(R, 24, 14, p0, pl, t0, t1 - t0)); }

  M.buildPerson = function (p) {
    const L = p.look; const age = H.AGES[H.ageIdx(p.age)] || H.AGES[3];
    const fem = L.gender === 'f';
    const build = (H.BUILDS.find(b => b.id === L.build) || H.BUILDS[1]).s;
    const skin = M.mat(L.skin, 0.6);
    const isElder = p.age === 'elder';
    const hairColor = isElder && L.hair !== 'skaldet' ? '#dcd8d1' : L.hairColor;
    const hairM = M.mat(hairColor, 0.55);
    const baby = p.age === 'baby';
    const topC = M.mat(L.topColor, 0.85), botC = M.mat(L.bottomColor, 0.85), shoeC = M.mat(L.shoeColor || '#2a2a2e', 0.5);
    const top = baby ? 'onesie' : L.top, bottom = (top === 'dress' || baby) ? 'none' : L.bottom;
    const P = {};
    const root = new T.Group(); P.root = root;
    const body = new T.Group(); root.add(body); P.body = body;
    const hips = new T.Group(); hips.position.y = 0.88; body.add(hips); P.hips = hips;
    // torso
    const spine = new T.Group(); hips.add(spine); P.spine = spine;
    const torso = add(spine, latheTorso(fem, fem ? 'f' : 'm'), topC, 0, 0, 0);
    torso.scale.set(1.2 * build, 1, 0.74 * (0.9 + build * 0.1));
    const pelvisMat = top === 'dress' || baby ? topC : botC;
    const pel = add(hips, g('pelvis', () => new T.CylinderGeometry(0.15, 0.13, 0.18, 20)), pelvisMat, 0, 0.05, 0);
    pel.scale.set(1.22 * build * (fem ? 1.04 : 1), 1, 0.78);
    if (top === 'suit') {
      add(spine, M.boxG(0.12, 0.26, 0.01), M.mat('#f6f5f1', 0.7), 0, 0.42, 0.112 * (0.9 + build * 0.1));
      add(spine, M.boxG(0.035, 0.22, 0.012), M.mat('#7a2232', 0.5), 0, 0.4, 0.118 * (0.9 + build * 0.1));
    }
    if (top === 'hoodie') {
      add(spine, new T.TorusGeometry(0.1, 0.04, 8, 16), M.mat(shade(L.topColor, -0.06), 0.85), 0, 0.53, -0.07, 1.2, 0, 0);
      add(spine, M.rboxG(0.22, 0.1, 0.03, 0.01), M.mat(shade(L.topColor, -0.05), 0.85), 0, 0.15, 0.11 * (0.9 + build * 0.1));
    }
    if (top === 'tank') { add(spine, M.sphG(0.08, 12, 8), skin, 0, 0.53, 0.03).scale.set(1.2, 0.5, 0.8); }
    else if (!baby) { const col = add(spine, new T.TorusGeometry(0.066, 0.016, 8, 20), M.mat(shade(top === 'suit' ? '#f6f5f1' : L.topColor, -0.07), 0.8), 0, 0.56, 0, Math.PI / 2, 0, 0); col.scale.set(1.1, 0.85, 1); }
    if (top === 'suit') { [0.3, 0.22].forEach(y => add(spine, M.sphG(0.009, 6, 4), M.mat('#1d1d1f', 0.4), 0.035, y, 0.118 * (0.9 + build * 0.1))); }
    if (fem && !baby && p.age !== 'child') { [-1, 1].forEach(s => add(spine, M.sphG(0.056, 14, 10), topC, s * 0.056, 0.395, 0.07 * (0.9 + build * 0.1)).scale.set(1, 0.8, 0.55)); }
    // nakke & hoved
    const neck = add(spine, M.cylG(0.052, 0.06, 0.12, 14), skin, 0, 0.6, 0);
    const head = new T.Group(); head.position.y = 0.745; spine.add(head); P.head = head;
    const R = 0.135;
    const hm = add(head, M.sphG(R, 28, 20), skin, 0, 0, 0); hm.scale.set(0.93, 1.05, 1);
    const jaw = add(head, M.sphG(R * 0.8, 20, 14), skin, 0, -0.045, 0.012); jaw.scale.set(0.95, 0.8, 0.95);
    [-1, 1].forEach(s => add(head, M.sphG(0.03, 10, 8), skin, s * R * 0.92, -0.005, 0).scale.set(0.5, 1, 0.8));
    add(head, M.sphG(0.021, 10, 8), M.mat(shade(L.skin, -0.03), 0.6), 0, -0.018, R * 0.97).scale.set(0.85, 1.15, 1.25);
    // øjne
    P.eyes = [];
    [-1, 1].forEach(s => {
      const eg = new T.Group(); eg.position.set(s * 0.05, 0.016, R * 0.84); head.add(eg);
      add(eg, M.sphG(0.031, 16, 12), M.mat('#fbfbf8', 0.3), 0, 0, 0).scale.set(1, 1.08, 0.52);
      add(eg, M.sphG(0.0195, 14, 10), M.mat(L.eyes || '#4a2f1c', 0.25), 0, -0.001, 0.012).scale.set(1, 1.04, 0.5);
      add(eg, M.sphG(0.0095, 10, 8), M.mat('#0b0b0b', 0.2), 0, -0.001, 0.0195).scale.set(1, 1, 0.5);
      add(eg, M.sphG(0.0045, 6, 4), M.mat('#ffffff', 0.1, 0, { emissive: new T.Color('#ffffff'), emissiveIntensity: 0.7 }), 0.006, 0.007, 0.022);
      add(eg, M.boxG(0.058, 0.006, 0.01), M.mat('#2a1d18', 0.6), 0, 0.03, 0.012).rotation.z = s * 0.08;
      P.eyes.push(eg);
      const brow = add(head, M.boxG(0.045, 0.009, 0.012), M.mat(shade(hairColor, -0.1), 0.6), s * 0.05, 0.062, R * 0.93);
      brow.rotation.z = s * -0.12;
    });
    const mouthM = M.mat('#a24a50', 0.5);
    const mouth = add(head, g('mouth', () => new T.TorusGeometry(0.026, 0.0062, 6, 14, Math.PI)), mouthM, 0, -0.06, R * 0.93);
    mouth.rotation.z = Math.PI; P.mouth = mouth;
    // hår
    const hs = L.hair;
    const HR = R * 1.07;
    if (hs !== 'skaldet') {
      const cap = add(head, hairCap(HR, 0, Math.PI * 0.42), hairM, 0, 0.012, -0.006); cap.scale.set(0.95, 1.05, 1.02);
      const back = add(head, hairCap(HR, Math.PI * 0.35, Math.PI * (hs === 'kort' || hs === 'pjusket' || hs === 'sidebena' ? 0.68 : 0.62), Math.PI, Math.PI), hairM, 0, 0.005, -0.004); back.scale.set(0.95, 1.05, 1.02);
      const sides = add(head, hairCap(HR * 0.99, Math.PI * 0.3, Math.PI * 0.55, Math.PI / 2 + 0.75, 2 * Math.PI - 1.5), hairM, 0, 0.005, 0); sides.scale.set(0.96, 1.05, 1.0);
    }
    if (hs === 'sidebena') { const sw = add(head, M.sphG(0.075, 14, 10), hairM, -0.05, 0.1, 0.07); sw.scale.set(1.4, 0.55, 0.9); sw.rotation.z = 0.3; }
    if (hs === 'pjusket') { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const s = add(head, M.sphG(0.045, 10, 8), hairM, Math.cos(a) * 0.07, 0.12 + (i % 2) * 0.015, Math.sin(a) * 0.07 + 0.01); s.scale.set(1, 0.8, 1); } }
    if (hs === 'bob') { add(head, hairCap(HR * 1.04, Math.PI * 0.3, Math.PI * 0.8, Math.PI / 2 + 0.72, 2 * Math.PI - 1.44), hairM, 0, 0.0, -0.005).scale.set(0.98, 1.05, 1.02); add(head, M.sphG(0.06, 12, 8), hairM, 0.03, 0.105, 0.085).scale.set(1.8, 0.5, 0.9); }
    if (hs === 'lang') {
      add(head, hairCap(HR * 1.04, Math.PI * 0.3, Math.PI * 0.8, Math.PI / 2 + 0.72, 2 * Math.PI - 1.44), hairM, 0, 0, -0.005).scale.set(0.98, 1.05, 1.02);
      const lg = add(head, hairCap(HR * 1.02, Math.PI * 0.4, Math.PI * 0.98, Math.PI, Math.PI), hairM, 0, -0.17, -0.03); lg.scale.set(1.0, 1.9, 0.75);
      add(head, M.sphG(0.06, 12, 8), hairM, -0.04, 0.105, 0.085).scale.set(1.8, 0.5, 0.9);
    }
    if (hs === 'hestehale') {
      add(head, M.sphG(0.04, 10, 8), hairM, 0, 0.06, -R * 1.02);
      const pt = add(head, M.sphG(0.05, 12, 10), hairM, 0, -0.06, -R * 1.18); pt.scale.set(0.75, 2.0, 0.75); pt.rotation.x = 0.25;
      P.ponytail = pt;
    }
    if (hs === 'knold') { add(head, M.sphG(0.065, 14, 10), hairM, 0, R * 0.92, -R * 0.42); }
    if (hs === 'kroeller') {
      const big = add(head, M.sphG(R * 1.28, 20, 14), hairM, 0, 0.05, -0.03); big.scale.set(1, 0.95, 0.98);
      // ansigtet holdes frit
      big.geometry = hairCap(R * 1.28, 0, Math.PI * 0.75, Math.PI / 2 + 0.85, 2 * Math.PI - 1.7);
      add(head, hairCap(R * 1.2, 0, Math.PI * 0.32), hairM, 0, 0.06, 0.0);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(head, M.sphG(0.05, 10, 8), hairM, Math.cos(a) * 0.15, 0.06 + Math.sin(i * 1.7) * 0.05, Math.sin(a) * 0.12 - 0.03); }
    }
    // ansigtsdetaljer
    if (L.facial === 'beard' && !baby) { const bd = add(head, hairCap(R * 1.0, Math.PI * 0.55, Math.PI * 0.86, Math.PI / 2 - 1.3, 2.6), hairM, 0, -0.005, 0.006); bd.scale.set(0.97, 1.05, 1.03); mouth.position.z += 0.012; }
    if (L.facial === 'stache' && !baby) { const st = add(head, M.sphG(0.03, 10, 8), hairM, 0, -0.042, R * 0.95); st.scale.set(1.7, 0.45, 0.6); }
    if (L.facial === 'glasses' && !baby) {
      const gm = M.mat('#1d1d20', 0.4, 0.3);
      [-1, 1].forEach(s => add(head, g('lens', () => new T.TorusGeometry(0.028, 0.004, 6, 18)), gm, s * 0.048, 0.018, R * 0.97));
      add(head, M.boxG(0.03, 0.005, 0.005), gm, 0, 0.022, R * 1.0);
      [-1, 1].forEach(s => add(head, M.boxG(0.004, 0.005, 0.12), gm, s * 0.078, 0.02, R * 0.4));
    }
    // arme
    const longSleeve = ['longsleeve', 'hoodie', 'suit', 'onesie'].includes(top);
    const armW = 0.9 + build * 0.12;
    const mkArm = (s) => {
      const sh = new T.Group(); sh.position.set(s * 0.19 * build * (fem ? 0.93 : 1), 0.48, 0); spine.add(sh);
      add(sh, M.sphG(0.058, 14, 10), top === 'tank' ? skin : topC, 0, 0, 0).scale.set(armW, 1, armW);
      const up = add(sh, latheLimb('ua' + (fem ? 'f' : 'm'), [[0.039, -0.285], [0.043, -0.2], [0.048, -0.1], [0.051, -0.02], [0.05, 0.01]]), longSleeve ? topC : skin, 0, 0, 0); up.scale.set(armW, 1, armW);
      if (top === 'tshirt' || top === 'dress') { const sl = add(sh, latheLimb('slv', [[0.058, -0.15], [0.059, -0.13], [0.06, -0.04], [0.059, 0.02]], true), topC, 0, 0, 0); sl.scale.set(armW, 1, armW); }
      const el = new T.Group(); el.position.y = -0.28; sh.add(el);
      if (longSleeve && !baby) { const cuff = add(el, M.cylG(0.036, 0.036, 0.03, 14), M.mat(shade(top === 'suit' ? '#f6f5f1' : L.topColor, -0.06), 0.8), 0, -0.24, 0); cuff.scale.set(armW, 1, armW); }
      add(el, M.sphG(0.041, 12, 8), longSleeve ? topC : skin, 0, 0, 0).scale.set(armW, 1, armW);
      const lo = add(el, latheLimb('fa', [[0.031, -0.25], [0.034, -0.19], [0.039, -0.1], [0.041, -0.03], [0.04, 0.01]]), longSleeve ? topC : skin, 0, 0, 0); lo.scale.set(armW, 1, armW);
      const hand = new T.Group(); hand.position.set(0, -0.285, 0.004); el.add(hand);
      add(hand, M.sphG(0.04, 14, 10), skin, 0, -0.012, 0).scale.set(0.72, 1.15, 0.5);
      add(hand, M.sphG(0.016, 8, 6), skin, s * -0.022, 0.0, 0.016).scale.set(0.9, 1.6, 0.9);
      return { sh, el, hand };
    };
    P.armL = mkArm(1); P.armR = mkArm(-1);
    // ben
    const legSkinTop = bottom === 'skirt' || top === 'dress' || bottom === 'shorts';
    const legSkinLow = bottom !== 'pants' && top !== 'onesie';
    const legW = 0.9 + build * 0.14;
    if (bottom === 'pants' || bottom === 'shorts') { const belt = add(hips, M.cylG(0.152, 0.152, 0.03, 22), M.mat('#2b2420', 0.5), 0, 0.12, 0); belt.scale.set(1.22 * build * (fem ? 1.04 : 1), 1, 0.79); add(hips, M.boxG(0.04, 0.026, 0.01), M.mat('#c9a24c', 0.3, 0.8), 0, 0.12, 0.12); }
    const mkLeg = (s) => {
      const hp = new T.Group(); hp.position.set(s * 0.085 * build * (fem ? 1.05 : 1), 0, 0); hips.add(hp);
      const pantsTop = !baby && !legSkinTop;
      const th = add(hp, pantsTop ? latheLimb('thp', [[0.064, -0.44], [0.07, -0.3], [0.08, -0.12], [0.086, 0.0], [0.085, 0.03]]) : latheLimb('th' + (fem ? 'f' : 'm'), [[0.056, -0.44], [0.062, -0.32], [0.074, -0.14], [0.082, -0.02], [0.08, 0.03]]), baby ? topC : (legSkinTop ? skin : botC), 0, 0, 0); th.scale.set(legW, 1, legW);
      if (bottom === 'shorts') { const sh = add(hp, latheLimb('shorts2', [[0.08, -0.22], [0.081, -0.19], [0.086, -0.05], [0.088, 0.03]], true), botC, 0, 0, 0); sh.scale.set(legW, 1, legW); }
      const kn = new T.Group(); kn.position.y = -0.43; hp.add(kn);
      const pantsLow = !legSkinLow && !baby;
      add(kn, M.sphG(pantsLow ? 0.064 : 0.056, 12, 8), baby ? topC : (legSkinLow ? skin : botC), 0, 0, 0).scale.set(legW, 1, legW);
      const sn = add(kn, pantsLow ? latheLimb('shp', [[0.06, -0.41], [0.061, -0.3], [0.063, -0.12], [0.064, 0.02]]) : latheLimb('sh' + (fem ? 'f' : 'm'), [[0.037, -0.41], [0.042, -0.33], [0.052, -0.2], [0.056, -0.1], [0.053, 0.02]]), baby ? topC : (legSkinLow ? skin : botC), 0, 0, 0); sn.scale.set(legW, 1, legW);
      if (!baby) {
        add(kn, M.rboxG(0.1, 0.07, 0.22, 0.034), shoeC, 0, -0.425, 0.045);
        add(kn, M.rboxG(0.104, 0.022, 0.226, 0.01), M.mat(shade(L.shoeColor || '#2a2a2e', L.shoeColor === '#f4f1ec' ? -0.25 : 0.25), 0.7), 0, -0.455, 0.046);
      } else add(kn, M.rboxG(0.1, 0.075, 0.18, 0.035), topC, 0, -0.43, 0.03);
      return { hp, kn };
    };
    P.legL = mkLeg(1); P.legR = mkLeg(-1);
    if (bottom === 'skirt' || top === 'dress') {
      const len = top === 'dress' ? 0.5 : 0.36;
      const sk = add(hips, g('skirt' + len, () => { const geo = new T.CylinderGeometry(0.16, 0.27, len, 22, 1, true); geo.translate(0, -len / 2, 0); return geo; }), top === 'dress' ? topC : botC, 0, 0.1, 0);
      sk.material = (top === 'dress' ? topC : botC); sk.scale.set(1.1 * build, 1, 0.85);
      const mm = sk.material.clone(); mm.side = T.DoubleSide; sk.material = mm;
      P.skirt = sk;
    }
    // proportioner efter alder
    root.scale.setScalar(age.scale * (fem ? 0.97 : 1) * (L.height || 1));
    head.scale.setScalar(age.head * 1.06);
    if (baby) { P.legL.hp.scale.set(1.25, 0.72, 1.25); P.legR.hp.scale.set(1.25, 0.72, 1.25); torso.scale.multiplyScalar(1.12); hips.position.y = 0.88 * 0.72; }
    if (p.age === 'child') { P.legL.hp.scale.y = 0.88; P.legR.hp.scale.y = 0.88; hips.position.y = 0.88 * 0.88; }
    if (isElder) spine.rotation.x = 0.09;
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.userData.pick = true; } });
    P.hipsY = hips.position.y;
    P.scale = root.scale.x;
    P.baby = baby;
    return P;
  };

  M.buildPet = function (pet) {
    const P = {}; const cat = pet.species === 'cat';
    const root = new T.Group(); P.root = root;
    const body = new T.Group(); root.add(body); P.body = body;
    const c1 = M.mat(pet.color || '#b07a45', 0.85), c2 = M.mat(pet.color2 || shade(pet.color || '#b07a45', 0.25), 0.85);
    const sc = cat ? 0.72 : (pet.size || 1);
    const torso = add(body, M.sphG(0.2, 20, 14), c1, 0, 0.36, 0); torso.scale.set(0.85, 0.8, 1.55);
    add(body, M.sphG(0.15, 16, 12), c2, 0, 0.3, 0.05).scale.set(0.9, 0.7, 1.6);
    const head = new T.Group(); head.position.set(0, 0.55, 0.28); body.add(head); P.head = head;
    add(head, M.sphG(0.14, 20, 14), c1, 0, 0, 0).scale.set(1, 0.95, 1);
    const snout = add(head, M.sphG(0.08, 14, 10), c2, 0, -0.04, cat ? 0.1 : 0.13); snout.scale.set(cat ? 0.9 : 1, 0.75, cat ? 0.7 : 1.2);
    add(head, M.sphG(0.025, 8, 6), M.mat('#1a1a1a', 0.3), 0, -0.01, cat ? 0.165 : 0.22);
    [-1, 1].forEach(s => {
      add(head, M.sphG(0.022, 10, 8), M.mat('#151515', 0.2), s * 0.055, 0.035, 0.115);
      add(head, M.sphG(0.006, 6, 4), M.mat('#fff', 0.1, 0, { emissive: new T.Color('#fff'), emissiveIntensity: 0.5 }), s * 0.055 + 0.006, 0.043, 0.135);
      if (cat) { const e = add(head, g('catear', () => new T.ConeGeometry(0.05, 0.11, 4)), c1, s * 0.075, 0.13, -0.01); e.rotation.z = -s * 0.25; }
      else { const e = add(head, M.sphG(0.06, 12, 10), M.mat(shade(pet.color || '#b07a45', -0.12), 0.85), s * 0.12, 0.0, -0.01); e.scale.set(0.45, 1.25, 0.8); e.rotation.z = s * 0.3; }
    });
    if (!cat) { const tg = add(head, M.sphG(0.03, 8, 6), M.mat('#e07a8a', 0.5), 0, -0.09, 0.15); tg.scale.set(1, 0.4, 1.2); P.tongue = tg; }
    P.legs = [];
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
      const l = new T.Group(); l.position.set(sx * 0.09, 0.3, sz * 0.18); body.add(l);
      add(l, limbGeo(0.045, 0.038, 0.28), c1, 0, 0, 0);
      add(l, M.sphG(0.04, 8, 6), c2, 0, -0.28, 0.015).scale.set(1, 0.6, 1.3);
      P.legs.push(l);
    });
    const tail = new T.Group(); tail.position.set(0, 0.42, -0.3); body.add(tail); P.tail = tail;
    const tl = add(tail, limbGeo(0.03, 0.018, cat ? 0.4 : 0.26), c1, 0, 0, 0); tail.rotation.x = cat ? -2.6 : -2.2;
    root.scale.setScalar(sc);
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.pick = true; } });
    return P;
  };

  /* ---------- Omgivelser ---------- */
  M.buildCar = function (color, bus) {
    const G = new T.Group();
    const L = bus ? 4.6 : 3.6, W = 1.6;
    const paint = M.mat(color, 0.25, 0.45);
    rbox(G, L, 0.6, W, 0.15, paint, 0, 0.55, 0);
    if (bus) { rbox(G, L - 0.3, 1.0, W - 0.06, 0.1, paint, -0.05, 1.3, 0); for (let i = 0; i < 5; i++) add(G, M.boxG(0.6, 0.45, W - 0.02), M.mat('#26323c', 0.1, 0.5), -1.6 + i * 0.75, 1.42, 0); }
    else { rbox(G, L * 0.55, 0.55, W - 0.12, 0.15, paint, -0.15, 1.05, 0); add(G, M.boxG(L * 0.5, 0.42, W - 0.08), M.mat('#26323c', 0.1, 0.5), -0.15, 1.07, 0); }
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const w = cyl(G, 0.32, 0.32, 0.22, M.mat('#1b1b1d', 0.8), a * (L / 2 - 0.65), 0.32, b * (W / 2 - 0.05), 18); w.rotation.x = Math.PI / 2; cyl(G, 0.18, 0.18, 0.23, M.mat('#bfc3c7', 0.3, 0.8), a * (L / 2 - 0.65), 0.32, b * (W / 2 - 0.05), 12).rotation.x = Math.PI / 2; });
    const hl = M.uniqueMat('#fff6d8', 0.3, 0, { emissive: new T.Color('#fff2c8'), emissiveIntensity: 0.4 });
    [-0.5, 0.5].forEach(z => add(G, M.boxG(0.04, 0.12, 0.3), hl, L / 2, 0.62, z));
    [-0.55, 0.55].forEach(z => add(G, M.boxG(0.04, 0.1, 0.25), M.mat('#c43030', 0.4, 0, { emissive: new T.Color('#801010'), emissiveIntensity: 0.6 }), -L / 2, 0.65, z));
    G.userData.headlight = hl;
    return G;
  };
  M.buildNeighborHouse = function (seed, w = 8, d = 7) {
    const G = new T.Group(); const rnd = seeded(seed);
    const walls = M.mat(H.pick ? ['#efe4d0', '#d9c3a5', '#c96e5a', '#e9e5df', '#b7c4cf', '#d8b874'][Math.floor(rnd() * 6)] : '#eee', 0.9);
    const roofM = M.mat(['#4a4f57', '#7a3b2e', '#3d4a3a', '#5b4636'][Math.floor(rnd() * 4)], 0.75);
    box(G, w, 3.0, d, walls, 0, 1.5, 0);
    const shape = new T.Shape(); shape.moveTo(-w / 2 - 0.4, 0); shape.lineTo(w / 2 + 0.4, 0); shape.lineTo(0, 2.2); shape.closePath();
    const roof = add(G, new T.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false }), roofM, 0, 3.0, -d / 2 - 0.3);
    const wins = [];
    for (let i = 0; i < 3; i++) {
      const gm = M.uniqueMat('#2d3a46', 0.15, 0.3, { emissive: new T.Color('#ffcf7a'), emissiveIntensity: 0 });
      add(G, M.boxG(0.9, 1.0, 0.05), gm, -w / 2 + 1.4 + i * (w - 2.8) / 2, 1.7, d / 2 + 0.01);
      add(G, M.boxG(1.05, 0.08, 0.12), M.mat('#f5f2ea', 0.6), -w / 2 + 1.4 + i * (w - 2.8) / 2, 1.16, d / 2 + 0.04);
      wins.push(gm);
    }
    add(G, M.boxG(1.0, 2.1, 0.06), M.mat(['#2f4f6f', '#7a2e2e', '#2f5f3f', '#f2efe8'][Math.floor(rnd() * 4)], 0.6), 0.3, 1.05, d / 2 + 0.02);
    box(G, 0.6, 1.2, 0.6, M.mat('#8a5a3a', 0.8), w / 3, 4.0, -d / 5);
    G.userData.wins = wins;
    return G;
  };
  M.buildStreetLamp = function () {
    const G = new T.Group(); const m = M.mat('#2c2f33', 0.5, 0.6);
    cyl(G, 0.07, 0.1, 4.2, m, 0, 2.1, 0, 10);
    const arm = box(G, 0.9, 0.06, 0.06, m, 0.4, 4.15, 0);
    const glow = M.uniqueMat('#fff1cf', 0.4, 0, { emissive: new T.Color('#ffd58a'), emissiveIntensity: 0 });
    add(G, M.boxG(0.42, 0.1, 0.25), glow, 0.8, 4.08, 0);
    G.userData.glow = glow;
    return G;
  };
  M.buildMailbox = function () {
    const G = new T.Group();
    cyl(G, 0.04, 0.04, 1.0, M.mat('#5a4636', 0.8), 0, 0.5, 0, 8);
    rbox(G, 0.3, 0.26, 0.48, 0.06, M.mat('#c43a3a', 0.4, 0.3), 0, 1.1, 0);
    box(G, 0.02, 0.18, 0.08, M.mat('#f2c94e', 0.4), 0.16, 1.2, 0.12);
    return G;
  };
  M.buildFence = function (len) {
    const G = new T.Group(); const m = M.mat('#f4f1ea', 0.7);
    for (let i = 0; i <= len * 4; i++) box(G, 0.06, 0.8, 0.04, m, -len / 2 + i * 0.25, 0.4, 0);
    box(G, len, 0.06, 0.03, m, 0, 0.62, 0.03); box(G, len, 0.06, 0.03, m, 0, 0.25, 0.03);
    return G;
  };
  M.selectionRing = function () {
    const m = new T.MeshBasicMaterial({ color: 0x5bd36b, transparent: true, opacity: 0.85, depthWrite: false });
    const r = new T.Mesh(new T.RingGeometry(0.34, 0.42, 40), m); r.rotation.x = -Math.PI / 2; r.position.y = 0.025; r.renderOrder = 2;
    return r;
  };
})();
