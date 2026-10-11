/* Hjemliv — 3D-verden: renderer, kamera, lys, grund, vægge, gulve, objekter, stifinding */
'use strict';
(function () {
  const T = THREE, M = H.M;
  const W = H.W = {};
  const N = H.WORLD;
  let renderer, scene, camera;
  W.objMeshes = {}; W.wallMeshes = {}; W.floorMeshes = {}; W.posts = [];
  W.occ = new Int32Array(N * N); // 0 = fri, >0 = objekt-uid, -1 = statisk
  W.static = new Int8Array(N * N);
  W.wallMode = 'cut';
  W.cam = { tx: 16, tz: 13, yaw: -0.65, pitch: 0.82, dist: 26 };
  W.camT = { tx: 16, tz: 13, yaw: -0.65, pitch: 0.82, dist: 26 };

  W.init = function (canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    W.renderer = renderer;
    scene = new T.Scene(); W.scene = scene;
    scene.background = new T.Color('#9cc9e6');
    scene.fog = new T.Fog('#bcd8e8', 55, 150);
    camera = new T.PerspectiveCamera(34, 1, 0.3, 400); W.camera = camera;

    W.hemi = new T.HemisphereLight('#dfefff', '#6b7a4a', 0.55); scene.add(W.hemi);
    W.amb = new T.AmbientLight('#ffffff', 0.12); scene.add(W.amb);
    W.sun = new T.DirectionalLight('#fff3df', 2.2);
    W.sun.castShadow = true;
    W.sun.shadow.mapSize.set(2048, 2048);
    const sc = W.sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 120;
    W.sun.shadow.bias = -0.0004; W.sun.shadow.normalBias = 0.02;
    scene.add(W.sun); scene.add(W.sun.target);
    W.sun.target.position.set(16, 0, 16);
    W.lampLights = [];
    for (let i = 0; i < 8; i++) { const l = new T.PointLight('#ffcf8a', 0, 7, 2); l.visible = false; scene.add(l); W.lampLights.push(l); }
    W.interiorFill = new T.PointLight('#ffd9a8', 0, 18, 2); W.interiorFill.position.set(15, 2.4, 14); scene.add(W.interiorFill);

    W.root = new T.Group(); scene.add(W.root);
    W.objRoot = new T.Group(); scene.add(W.objRoot);
    W.wallRoot = new T.Group(); scene.add(W.wallRoot);
    W.floorRoot = new T.Group(); scene.add(W.floorRoot);
    W.agentRoot = new T.Group(); scene.add(W.agentRoot);
    W.fxRoot = new T.Group(); scene.add(W.fxRoot);
    buildEnvironment();
    W.helpers();
    W.resize();
    window.addEventListener('resize', W.resize);
  };

  W.resize = function () {
    const c = renderer.domElement; const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };

  /* ---------- Omgivelser ---------- */
  function buildEnvironment() {
    const gt = M.grassTex(); gt.repeat.set(30, 30);
    const ground = new T.Mesh(new T.PlaneGeometry(240, 240), new T.MeshStandardMaterial({ map: gt, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(16, 0, 16); ground.receiveShadow = true; scene.add(ground);
    W.ground = ground;
    // Grundens kant (lys græsstribe)
    const lot = H.LOT;
    const lotMat = new T.MeshStandardMaterial({ map: gt, color: new T.Color('#e8f5d0'), roughness: 1 });
    const lotPlane = new T.Mesh(new T.PlaneGeometry(lot.x1 - lot.x0, lot.z1 - lot.z0), lotMat);
    lotPlane.rotation.x = -Math.PI / 2; lotPlane.position.set((lot.x0 + lot.x1) / 2, 0.003, (lot.z0 + lot.z1) / 2); lotPlane.receiveShadow = true; scene.add(lotPlane);
    // vej
    const at = M.asphaltTex(); at.repeat.set(60, 2);
    const road = new T.Mesh(new T.PlaneGeometry(240, 4), new T.MeshStandardMaterial({ map: at, roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2; road.position.set(16, 0.006, 2); road.receiveShadow = true; scene.add(road);
    const dashM = new T.MeshStandardMaterial({ color: '#f1efe6', roughness: 0.7 });
    for (let x = -100; x < 130; x += 3) { const d = new T.Mesh(M.boxG(1.4, 0.005, 0.12), dashM); d.position.set(x, 0.012, 2); scene.add(d); }
    const st = M.sidewalkTex(); st.repeat.set(240, 1);
    [4.5, -0.5].forEach(z => {
      const sw = new T.Mesh(new T.BoxGeometry(240, 0.12, 1), new T.MeshStandardMaterial({ map: st, roughness: 0.9 }));
      sw.position.set(16, 0.06, z); sw.receiveShadow = true; scene.add(sw);
      const curb = new T.Mesh(new T.BoxGeometry(240, 0.14, 0.08), M.mat('#9b9891', 0.9)); curb.position.set(16, 0.07, z < 2 ? z + 0.5 : z - 0.5); scene.add(curb);
    });
    // nabohuse
    W.neighborWins = [];
    const houses = [[-1, -9, 8, 7, 3], [11, -9.5, 9, 7, 5], [23, -9, 8, 7, 8], [35, -9, 8, 7, 12], [-12, -9, 8, 7, 14], [46, -9.5, 9, 7, 21], [-10, 14, 7, 8, 30], [43, 14, 7, 8, 33]];
    houses.forEach(([x, z, w, d, s]) => {
      const h = M.buildNeighborHouse(s, w, d); h.position.set(x, 0, z);
      if (z > 0) h.rotation.y = x < 16 ? Math.PI / 2 : -Math.PI / 2;
      h.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(h); W.neighborWins.push(...h.userData.wins);
    });
    // gadelamper
    W.streetLamps = [];
    [-2, 16, 34].forEach(x => { const l = M.buildStreetLamp(); l.position.set(x, 0, 4.85); l.rotation.y = Math.PI / 2; scene.add(l); W.streetLamps.push(l); l.traverse(o => { if (o.isMesh) o.castShadow = true; }); });
    // træer udenfor grunden
    const rnd = (() => { let s = 77; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const spots = [[-3, 8], [-2, 20], [1, 28], [-4, 33], [31, 9], [33, 22], [30.5, 31], [36, 30], [10, 32], [20, 33.5], [26, 35], [-6, -16], [5, -15], [18, -16], [30, -15], [42, -16], [-16, 25], [48, 26]];
    spots.forEach(([x, z], i) => { const t = M.buildObject('tree', i % 5 === 0 ? 2 : 0, 100 + i); t.position.set(x, 0, z); t.scale.setScalar(1 + rnd() * 0.6); scene.add(t); });
    // postkasse
    const mb = M.buildMailbox(); mb.position.set(H.LOT.entryX - 0.6, 0, 5.5); mb.rotation.y = 0; scene.add(mb);
    mb.traverse(o => { if (o.isMesh) o.castShadow = true; });
    W.static[(5) * N + (H.LOT.entryX - 1)] = 1;
    // hegn langs bagkanten
    [[16, 29.05, 24, 0], [4.02, 17, 24, Math.PI / 2], [27.98, 17, 24, Math.PI / 2]].forEach(([x, z, len, ry]) => { const f = M.buildFence(len); f.position.set(x, 0, z); f.rotation.y = ry; scene.add(f); f.traverse(o => { if (o.isMesh) o.castShadow = true; }); });
    // himmel-skyer (enkle)
    W.clouds = new T.Group(); scene.add(W.clouds);
    const cm = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.9, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const c = new T.Group();
      for (let k = 0; k < 4; k++) { const s = new T.Mesh(new T.IcosahedronGeometry(2 + rnd() * 2, 1), cm); s.position.set(k * 2.5, rnd(), rnd() * 2); s.scale.y = 0.55; c.add(s); }
      c.position.set(-60 + rnd() * 150, 28 + rnd() * 8, -60 + rnd() * 140); W.clouds.add(c);
    }
    W.cloudMat = cm;
  }
  H.LOT.entryX = 12;

  /* ---------- Hjælpere: gitter, markør ---------- */
  W.helpers = function () {
    const lot = H.LOT;
    const pts = [];
    for (let x = lot.x0; x <= lot.x1; x++) { pts.push(x, 0.02, lot.z0, x, 0.02, lot.z1); }
    for (let z = lot.z0; z <= lot.z1; z++) { pts.push(lot.x0, 0.02, z, lot.x1, 0.02, z); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    W.grid = new T.LineSegments(geo, new T.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.34 }));
    W.grid.visible = false; scene.add(W.grid);
    const bp = [lot.x0, 0.03, lot.z0, lot.x1, 0.03, lot.z0, lot.x1, 0.03, lot.z0, lot.x1, 0.03, lot.z1, lot.x1, 0.03, lot.z1, lot.x0, 0.03, lot.z1, lot.x0, 0.03, lot.z1, lot.x0, 0.03, lot.z0];
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(bp, 3));
    W.lotLine = new T.LineSegments(bg, new T.LineBasicMaterial({ color: '#fff7c2', transparent: true, opacity: 0.7 }));
    W.lotLine.visible = false; scene.add(W.lotLine);
    W.cursor = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: '#7fe0ff', transparent: true, opacity: 0.35, depthWrite: false }));
    W.cursor.rotation.x = -Math.PI / 2; W.cursor.position.y = 0.03; W.cursor.visible = false; W.cursor.renderOrder = 3; scene.add(W.cursor);
    W.marker = new T.Mesh(new T.RingGeometry(0.15, 0.24, 24), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }));
    W.marker.rotation.x = -Math.PI / 2; W.marker.position.y = 0.03; W.marker.visible = false; scene.add(W.marker);
    W.previewRoot = new T.Group(); scene.add(W.previewRoot);
  };
  W.showGrid = function (v) { W.grid.visible = v; W.lotLine.visible = v; };

  /* ---------- Kanter / vægge ---------- */
  W.ek = (o, x, z) => o + ',' + x + ',' + z;
  W.wallAt = (o, x, z) => H.G.walls[W.ek(o, x, z)];
  W.blocksEdge = (o, x, z) => { const w = H.G.walls[W.ek(o, x, z)]; return w && (w.t === 'wall' || w.t === 'window'); };
  W.inLot = (x, z) => x >= H.LOT.x0 && x < H.LOT.x1 && z >= H.LOT.z0 && z < H.LOT.z1;
  W.inWorld = (x, z) => x >= 0 && x < N && z >= 0 && z < N;

  W.rebuildWalls = function () {
    Object.values(W.wallMeshes).forEach(m => W.wallRoot.remove(m));
    W.posts.forEach(p => W.wallRoot.remove(p)); W.posts = [];
    W.wallMeshes = {}; W.doors = []; W.windowsGlass = [];
    const verts = {};
    for (const k in H.G.walls) {
      const w = H.G.walls[k]; const [o, xs, zs] = k.split(','); const x = +xs, z = +zs;
      const g = M.buildWallSegment(w.t, w.p || 'kalk', o === 'h');
      if (o === 'h') { g.position.set(x + 0.5, 0, z); verts[x + ',' + z] = 1; verts[(x + 1) + ',' + z] = 1; }
      else { g.position.set(x, 0, z + 0.5); g.rotation.y = Math.PI / 2; verts[x + ',' + z] = 1; verts[x + ',' + (z + 1)] = 1; }
      g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.userData.pick = true; } });
      g.userData.owner = { kind: 'wall', key: k };
      g.userData.cut = 1;
      W.wallRoot.add(g); W.wallMeshes[k] = g;
      if (g.userData.hinge) W.doors.push({ g, x: o === 'h' ? x + 0.5 : x, z: o === 'h' ? z : z + 0.5, a: 0 });
      if (g.userData.glass) W.windowsGlass.push(g.userData.glass);
    }
    for (const v in verts) {
      const [x, z] = v.split(',').map(Number);
      const hh = (H.G.walls[W.ek('h', x - 1, z)] ? 1 : 0) + (H.G.walls[W.ek('h', x, z)] ? 1 : 0);
      const vv = (H.G.walls[W.ek('v', x, z - 1)] ? 1 : 0) + (H.G.walls[W.ek('v', x, z)] ? 1 : 0);
      if ((hh === 2 && vv === 0) || (vv === 2 && hh === 0)) continue; // lige væg: ingen stolpe
      const p = M.buildPost(); p.position.x = x; p.position.z = z; p.userData.cut = 1; p.userData.vx = x; p.userData.vz = z;
      W.wallRoot.add(p); W.posts.push(p);
    }
    W.computeIndoor();
  };

  /* Indendørs: flood-fill fra grundens kant; fliser der ikke nås er indendørs */
  W.indoor = new Uint8Array(N * N);
  W.computeIndoor = function () {
    const out = new Uint8Array(N * N); const q = [];
    for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) if (x === 0 || z === 0 || x === N - 1 || z === N - 1) { out[z * N + x] = 1; q.push(x, z); }
    while (q.length) {
      const z = q.pop(), x = q.pop();
      const nb = [[1, 0, 'v', x + 1, z], [-1, 0, 'v', x, z], [0, 1, 'h', x, z + 1], [0, -1, 'h', x, z]];
      for (const [dx, dz, o, ex, ez] of nb) {
        const nx = x + dx, nz = z + dz; if (!W.inWorld(nx, nz) || out[nz * N + nx]) continue;
        const w = H.G.walls[W.ek(o, ex, ez)]; if (w) continue;
        out[nz * N + nx] = 1; q.push(nx, nz);
      }
    }
    for (let i = 0; i < N * N; i++) W.indoor[i] = out[i] ? 0 : 1;
  };
  W.isIndoor = (x, z) => W.inWorld(x, z) && W.indoor[z * N + x] === 1;

  /* ---------- Gulve ---------- */
  const floorGeo = new T.PlaneGeometry(1, 1);
  W.rebuildFloors = function () {
    Object.values(W.floorMeshes).forEach(m => W.floorRoot.remove(m)); W.floorMeshes = {};
    for (const k in H.G.floors) {
      const [x, z] = k.split(',').map(Number);
      const m = new T.Mesh(floorGeo, M.floorMat(H.G.floors[k]));
      m.rotation.x = -Math.PI / 2; m.position.set(x + 0.5, 0.012, z + 0.5); m.receiveShadow = true;
      W.floorRoot.add(m); W.floorMeshes[k] = m;
    }
  };

  /* ---------- Objekter ---------- */
  W.footprint = function (o) {
    const c = H.CAT_BY_ID[o.type]; const odd = o.rot % 2 === 1;
    return { w: odd ? c.d : c.w, d: odd ? c.w : c.d };
  };
  W.objCenter = function (o) { const f = W.footprint(o); return { x: o.x + f.w / 2, z: o.z + f.d / 2 }; };
  W.objTiles = function (o) {
    const f = W.footprint(o), out = [];
    for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) out.push([o.x + i, o.z + j]);
    return out;
  };
  // lokal (meter fra centrum, front = +z) → verden
  W.l2w = function (o, px, pz) {
    const c = W.objCenter(o); const th = o.rot * Math.PI / 2;
    const cs = Math.cos(th), sn = Math.sin(th);
    return { x: c.x + px * cs + pz * sn, z: c.z - px * sn + pz * cs };
  };
  W.localTile = function (o, lx, lz) {
    const c = H.CAT_BY_ID[o.type];
    const fx = lx + 0.5 - c.w / 2, fz = lz + 0.5 - c.d / 2;
    const p = W.l2w(o, fx, fz); return [Math.floor(p.x), Math.floor(p.z)];
  };
  W.rotY = o => o.rot * Math.PI / 2;

  W.addObjectMesh = function (o) {
    if (W.objMeshes[o.uid]) W.objRoot.remove(W.objMeshes[o.uid]);
    const g = M.buildObject(o.type, o.tier || 0, o.uid * 13);
    const c = W.objCenter(o); g.position.set(c.x, 0, c.z); g.rotation.y = W.rotY(o);
    g.userData.owner = { kind: 'object', uid: o.uid };
    W.objRoot.add(g); W.objMeshes[o.uid] = g;
    W.refreshObjectState(o);
    return g;
  };
  W.removeObjectMesh = function (o) { const g = W.objMeshes[o.uid]; if (g) { W.objRoot.remove(g); delete W.objMeshes[o.uid]; } };
  W.refreshObjectState = function (o) {
    const g = W.objMeshes[o.uid]; if (!g) return;
    if (g.userData.food) g.userData.food.visible = (o.food || 0) > 0;
    if (g.userData.art) {
      g.userData.art.visible = (o.art || 0) > 0;
      if (o.art) g.userData.artMat.color.set(['#e7b35a', '#5a8fd6', '#d65a7a', '#5ad6a0', '#a05ad6'][o.art % 5]);
    }
  };

  W.rebuildOcc = function () {
    W.occ.fill(0);
    for (let i = 0; i < N * N; i++) if (W.static[i]) W.occ[i] = -1;
    for (const o of H.G.objects) {
      const c = H.CAT_BY_ID[o.type]; if (c.rug) continue;
      for (const [x, z] of W.objTiles(o)) if (W.inWorld(x, z)) W.occ[z * N + x] = o.uid;
    }
  };
  W.free = (x, z) => W.inWorld(x, z) && W.occ[z * N + x] === 0;

  /* ---------- Bevægelse og stifinding ---------- */
  W.canStep = function (x, z, nx, nz) {
    if (!W.inWorld(nx, nz)) return false;
    const dx = nx - x, dz = nz - z;
    if (dx !== 0 && dz !== 0) {
      return W.canStep(x, z, nx, z) && W.canStep(nx, z, nx, nz) && W.canStep(x, z, x, nz) && W.canStep(x, nz, nx, nz) && W.free(nx, z) && W.free(x, nz);
    }
    if (dx === 1) return !W.blocksEdge('v', x + 1, z);
    if (dx === -1) return !W.blocksEdge('v', x, z);
    if (dz === 1) return !W.blocksEdge('h', x, z + 1);
    if (dz === -1) return !W.blocksEdge('h', x, z);
    return true;
  };
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  W.findPath = function (sx, sz, goals, opt) {
    opt = opt || {};
    if (!goals.length) return null;
    const gset = new Set(goals.filter(([x, z]) => W.inWorld(x, z)).map(([x, z]) => z * N + x));
    if (!gset.size) return null;
    if (gset.has(sz * N + sx)) return [[sx, sz]];
    const gl = [...gset].map(i => [i % N, Math.floor(i / N)]);
    const hfn = (x, z) => { let b = 1e9; for (const [gx, gz] of gl) { const dx = Math.abs(gx - x), dz = Math.abs(gz - z); const h = Math.max(dx, dz) + 0.414 * Math.min(dx, dz); if (h < b) b = h; } return b; };
    const gs = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
    const heap = [];
    const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const s = sz * N + sx; gs[s] = 0; push(s, hfn(sx, sz));
    let found = -1, it = 0;
    while (heap.length && it++ < 6000) {
      const [, i] = pop(); if (closed[i]) continue; closed[i] = 1;
      if (gset.has(i)) { found = i; break; }
      const x = i % N, z = Math.floor(i / N);
      for (const [dx, dz, c] of DIRS) {
        const nx = x + dx, nz = z + dz; if (!W.inWorld(nx, nz)) continue;
        const ni = nz * N + nx; if (closed[ni]) continue;
        if (W.occ[ni] !== 0 && !gset.has(ni)) continue;
        if (W.occ[ni] !== 0 && gset.has(ni) && !opt.allowOccGoal) continue;
        if (!W.canStep(x, z, nx, nz)) continue;
        let cost = c; if (nz < 4) cost += 6; // undgå vejen
        const ng = gs[i] + cost;
        if (ng < gs[ni]) { gs[ni] = ng; from[ni] = i; push(ni, ng + hfn(nx, nz)); }
      }
    }
    if (found < 0) return null;
    const path = []; let c = found;
    while (c !== -1) { path.push([c % N, Math.floor(c / N)]); c = from[c]; }
    return path.reverse();
  };

  /* ---------- Plukning ---------- */
  const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), tmpV = new T.Vector3();
  W.setRay = function (cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  W.groundPoint = function (cx, cy, y = 0) {
    W.setRay(cx, cy); plane.constant = -y;
    const p = ray.ray.intersectPlane(plane, tmpV); return p ? { x: p.x, z: p.z } : null;
  };
  W.pick = function (cx, cy, kinds) {
    W.setRay(cx, cy);
    const roots = [];
    if (!kinds || kinds.includes('agent')) roots.push(W.agentRoot);
    if (!kinds || kinds.includes('object')) roots.push(W.objRoot);
    if (kinds && kinds.includes('wall')) roots.push(W.wallRoot);
    const hits = ray.intersectObjects(roots, true);
    for (const h of hits) {
      let o = h.object; if (!o.visible) continue;
      while (o && !o.userData.owner) o = o.parent;
      if (o && o.userData.owner) return Object.assign({ point: h.point }, o.userData.owner);
    }
    const g = W.groundPoint(cx, cy);
    return g ? { kind: 'ground', x: g.x, z: g.z } : null;
  };
  W.project = function (x, y, z) {
    tmpV.set(x, y, z).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: (tmpV.x + 1) / 2 * r.width + r.left, y: (1 - tmpV.y) / 2 * r.height + r.top, vis: tmpV.z < 1 };
  };

  /* ---------- Kamera ---------- */
  W.focus = function (x, z, dist) { W.camT.tx = x; W.camT.tz = z; if (dist) W.camT.dist = dist; };
  // dr = til højre på skærmen, df = fremad (væk fra kameraet)
  W.panBy = function (dr, df) {
    const c = W.camT; const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
    c.tx += dr * cs - df * sn; c.tz += -dr * sn - df * cs;
    c.tx = H.clamp(c.tx, -6, 38); c.tz = H.clamp(c.tz, -8, 38);
  };
  W.rotateBy = (dy, dp) => { W.camT.yaw += dy; W.camT.pitch = H.clamp(W.camT.pitch + dp, 0.32, 1.38); };
  W.zoomBy = f => { W.camT.dist = H.clamp(W.camT.dist * f, 5, 60); };
  W.keys = {};
  W.updateCamera = function (dt) {
    const c = W.cam, t = W.camT;
    const k = W.keys, ps = dt * (8 + t.dist * 0.6);
    if (!W.keysBlocked) {
      if (k.w || k.arrowup) W.panBy(0, ps);
      if (k.s || k.arrowdown) W.panBy(0, -ps);
      if (k.a || k.arrowleft) W.panBy(-ps, 0);
      if (k.d || k.arrowright) W.panBy(ps, 0);
      if (k.q) W.rotateBy(dt * 1.6, 0);
      if (k.e) W.rotateBy(-dt * 1.6, 0);
      if (k['+'] || k['=']) W.zoomBy(1 - dt * 1.5);
      if (k['-']) W.zoomBy(1 + dt * 1.5);
    }
    const a = 1 - Math.pow(0.0015, dt);
    c.tx += (t.tx - c.tx) * a; c.tz += (t.tz - c.tz) * a; c.yaw += (t.yaw - c.yaw) * a; c.pitch += (t.pitch - c.pitch) * a; c.dist += (t.dist - c.dist) * a;
    const y = Math.sin(c.pitch) * c.dist, hr = Math.cos(c.pitch) * c.dist;
    camera.position.set(c.tx + Math.sin(c.yaw) * hr, y, c.tz + Math.cos(c.yaw) * hr);
    camera.lookAt(c.tx, 0.6, c.tz);
  };
  // yaw-justering til panorering: skærm-højre i verden
  W.panScreen = function (dxPx, dyPx) {
    const s = W.cam.dist * 0.0016;
    W.panBy(-dxPx * s, dyPx * s / Math.max(0.5, Math.sin(W.cam.pitch)));
  };

  /* ---------- Dag og nat ---------- */
  const cDayTop = new T.Color('#86bfe6'), cDusk = new T.Color('#f2a07a'), cNight = new T.Color('#101b33'), cFogDay = new T.Color('#cfe3ee'), cFogNight = new T.Color('#16223a');
  const tmpC = new T.Color(), tmpC2 = new T.Color();
  W.nightF = 0;
  W.updateSky = function (minuteOfDay) {
    const f = minuteOfDay / 1440;
    const elev = Math.sin((f - 0.25) * Math.PI * 2); // 1 ved middag
    const day = H.clamp(elev * 2.4 + 0.25, 0, 1);
    const dusk = H.clamp(1 - Math.abs(elev) * 3.2, 0, 1) * (elev > -0.35 ? 1 : 0);
    W.nightF = 1 - day;
    tmpC.copy(cNight).lerp(cDayTop, day); tmpC.lerp(cDusk, dusk * 0.55);
    scene.background.copy(tmpC);
    tmpC2.copy(cFogNight).lerp(cFogDay, day).lerp(cDusk, dusk * 0.35); scene.fog.color.copy(tmpC2).convertSRGBToLinear();
    const az = f * Math.PI * 2 + 0.6;
    const se = Math.max(0.12, Math.abs(elev));
    const R = 50;
    const tx = W.cam.tx, tz = W.cam.tz;
    W.sun.target.position.set(tx, 0, tz);
    W.sun.position.set(tx + Math.cos(az) * R * Math.cos(Math.asin(Math.min(1, se))), Math.max(6, se * R), tz + Math.sin(az) * R * 0.6 - 18);
    W.sun.target.updateMatrixWorld();
    if (elev > -0.05) {
      W.sun.color.set('#fff1dc').lerp(tmpC2.set('#ff9a5a'), dusk * 0.7);
      W.sun.intensity = 0.25 + 2.0 * day;
    } else { W.sun.color.set('#8fa6ff'); W.sun.intensity = 0.16; }
    W.hemi.intensity = 0.07 + 0.57 * day;
    W.hemi.color.set('#dfefff').lerp(tmpC2.set('#5a6a9a'), 1 - day);
    W.amb.intensity = 0.04 + 0.08 * day;
    renderer.toneMappingExposure = 0.92 + 0.18 * day;
    W.cloudMat.opacity = 0.35 + 0.55 * day;
    W.cloudMat.color.set('#ffffff').lerp(tmpC2.set('#2a3550'), 1 - day).lerp(cDusk, dusk * 0.4);
    // vinduer og lamper
    const lampOn = W.nightF > 0.45;
    (W.windowsGlass || []).forEach(g => { g.emissiveIntensity = lampOn ? 0.55 : 0; });
    W.neighborWins.forEach((g, i) => { g.emissiveIntensity = lampOn && (i % 3 !== 1 || minuteOfDay < 23 * 60) ? 0.9 : 0; });
    W.streetLamps.forEach(l => { l.userData.glow.emissiveIntensity = lampOn ? 2 : 0; });
    W.interiorFill.intensity = lampOn ? 0.35 : 0;
    W.lampsOn = lampOn;
  };

  W.updateLamps = function () {
    const lamps = [];
    if (H.G) for (const o of H.G.objects) { if (H.CAT_BY_ID[o.type].light) lamps.push(o); }
    // nærmeste lamper til kameraet får rigtige lyskilder
    lamps.sort((a, b) => { const ca = W.objCenter(a), cb = W.objCenter(b); return (Math.hypot(ca.x - W.cam.tx, ca.z - W.cam.tz)) - (Math.hypot(cb.x - W.cam.tx, cb.z - W.cam.tz)); });
    W.lampLights.forEach((l, i) => {
      const o = lamps[i];
      if (!o || !W.lampsOn) { l.visible = false; l.intensity = 0; return; }
      const g = W.objMeshes[o.uid]; if (!g) { l.visible = false; return; }
      const ud = g.userData; const p = W.l2w(o, 0, ud.lightZ || 0);
      l.position.set(p.x, ud.lightY || 1.2, p.z);
      l.color.set(ud.lightColor || '#ffcf8a');
      l.intensity = (ud.lightPow || 1.1) * (1 + (o.tier || 0) * 0.15); l.visible = true; l.distance = 7;
    });
    if (H.G) for (const o of H.G.objects) {
      const g = W.objMeshes[o.uid]; if (!g || !g.userData.glow) continue;
      g.userData.glow.emissiveIntensity = W.lampsOn ? 1.1 : 0;
    }
  };

  /* ---------- Cutaway-vægge og døre ---------- */
  W.updateWalls = function (dt) {
    const camX = camera.position.x - W.cam.tx, camZ = camera.position.z - W.cam.tz;
    const l = Math.hypot(camX, camZ) || 1; const dx = camX / l, dz = camZ / l;
    const mode = W.wallMode;
    const lowFor = (cx, cz) => {
      if (mode === 'up') return false; if (mode === 'down') return true;
      return ((cx - W.cam.tx) * dx + (cz - W.cam.tz) * dz) > -1.2;
    };
    const k = 1 - Math.pow(0.002, dt);
    for (const key in W.wallMeshes) {
      const g = W.wallMeshes[key];
      const tgt = lowFor(g.position.x, g.position.z) ? 0.13 : 1;
      g.userData.cut += (tgt - g.userData.cut) * k;
      g.scale.y = g.userData.cut;
    }
    for (const p of W.posts) { const tgt = lowFor(p.position.x, p.position.z) ? 0.13 : 1; p.userData.cut += (tgt - p.userData.cut) * k; p.scale.y = p.userData.cut; }
    for (const d of (W.doors || [])) {
      let near = false;
      if (H.G) for (const id in H.G.agents) { const a = H.G.agents[id]; if (a._hidden) continue; if (Math.abs(a.x - d.x) < 0.95 && Math.abs(a.z - d.z) < 0.95) { near = true; break; } }
      d.a += ((near ? 1.45 : 0) - d.a) * (1 - Math.pow(0.0005, dt));
      d.g.userData.hinge.rotation.y = d.a;
    }
  };

  W.render = function () { renderer.render(scene, camera); };

  /* ---------- Effekter ---------- */
  W.fx = [];
  W.spawnSparkles = function (x, y, z, color = '#ffe27a', n = 26) {
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(M.sphG(0.035, 6, 4), new T.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
      m.position.set(x, y, z); W.fxRoot.add(m);
      W.fx.push({ m, vx: (Math.random() - 0.5) * 1.4, vy: 0.5 + Math.random() * 1.3, vz: (Math.random() - 0.5) * 1.4, life: 1.4 + Math.random(), float: true });
    }
  };
  W.spawnSmoke = function (x, y, z) {
    const m = new T.Mesh(M.sphG(0.12, 8, 6), new T.MeshBasicMaterial({ color: '#555', transparent: true, opacity: 0.5, depthWrite: false }));
    m.position.set(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3); W.fxRoot.add(m);
    W.fx.push({ m, vx: 0, vy: 0.6, vz: 0, life: 2, grow: true });
  };
  W.spawnNote = function (x, y, z, color) {
    const m = new T.Mesh(M.sphG(0.04, 6, 4), new T.MeshBasicMaterial({ color: color || '#8fd3ff', transparent: true }));
    m.position.set(x, y, z); W.fxRoot.add(m);
    W.fx.push({ m, vx: (Math.random() - 0.5) * 0.4, vy: 0.5, vz: (Math.random() - 0.5) * 0.4, life: 1.6 });
  };
  W.updateFx = function (dt) {
    for (let i = W.fx.length - 1; i >= 0; i--) {
      const f = W.fx[i]; f.life -= dt;
      f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt;
      if (f.float) { f.vx *= 0.96; f.vz *= 0.96; } else if (!f.grow) f.vy -= 1.6 * dt; else f.m.scale.multiplyScalar(1 + dt * 0.8);
      f.m.material.opacity = Math.max(0, Math.min(1, f.life));
      if (f.life <= 0) { W.fxRoot.remove(f.m); f.m.material.dispose(); W.fx.splice(i, 1); }
    }
  };

  /* ---------- Biler ---------- */
  W.cars = [];
  W.spawnCar = function (opts) {
    const g = M.buildCar(opts.color || '#3d7fc4', opts.bus);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const lane = opts.dir > 0 ? 1.0 : 3.0;
    g.position.set(opts.dir > 0 ? -40 : 72, 0, lane); g.rotation.y = opts.dir > 0 ? 0 : Math.PI;
    scene.add(g);
    const car = Object.assign({ g, x: g.position.x, state: 'arrive', wait: 0, speed: 14 }, opts);
    car.lane = lane;
    W.cars.push(car); return car;
  };
  W.updateCars = function (dtMin, dtReal) {
    for (let i = W.cars.length - 1; i >= 0; i--) {
      const c = W.cars[i];
      const dt = Math.min(dtReal * Math.max(1, Math.min(dtMin / Math.max(dtReal, 1e-6), 6)), 0.5);
      if (c.state === 'arrive') {
        const dist = c.stopX - c.x;
        const v = Math.min(c.speed, Math.abs(dist) * 2 + 0.6);
        c.x += Math.sign(dist) * Math.min(Math.abs(dist), v * dt);
        if (Math.abs(dist) < 0.02) { c.state = 'wait'; c.onArrive && c.onArrive(c); }
      } else if (c.state === 'wait') {
        if (c.ready && c.ready()) { c.state = 'leave'; c.onLeave && c.onLeave(c); }
      } else if (c.state === 'leave') {
        c.speed = Math.min(16, c.speed + dt * 6);
        c.x += c.dir * c.speed * dt;
        if (c.x > 80 || c.x < -48) { scene.remove(c.g); W.cars.splice(i, 1); continue; }
      } else if (c.state === 'pass') {
        c.x += c.dir * c.speed * dt;
        if (c.x > 80 || c.x < -48) { scene.remove(c.g); W.cars.splice(i, 1); continue; }
      }
      c.g.position.x = c.x;
      c.g.userData.headlight.emissiveIntensity = W.lampsOn ? 2.2 : 0.3;
    }
  };

  /* ---------- Miniature-renderer til portrætter og katalogbilleder ---------- */
  let thumbR, thumbScene, thumbCam;
  W.thumb = function (obj3d, opts) {
    opts = opts || {};
    if (!thumbR) {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      thumbR = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
      thumbR.outputEncoding = T.sRGBEncoding; thumbR.toneMapping = T.ACESFilmicToneMapping; thumbR.setSize(160, 160, false);
      thumbScene = new T.Scene();
      thumbScene.add(new T.HemisphereLight('#ffffff', '#8a8f9a', 0.9));
      const d = new T.DirectionalLight('#ffffff', 1.6); d.position.set(3, 5, 4); thumbScene.add(d);
      const d2 = new T.DirectionalLight('#cfe0ff', 0.5); d2.position.set(-4, 2, -2); thumbScene.add(d2);
      thumbCam = new T.PerspectiveCamera(30, 1, 0.05, 50);
    }
    thumbScene.add(obj3d);
    obj3d.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(obj3d);
    const ctr = new T.Vector3(); bb.getCenter(ctr); const size = new T.Vector3(); bb.getSize(size);
    if (opts.portrait) {
      const hy = opts.headY; ctr.set(obj3d.position.x, hy, obj3d.position.z);
      thumbCam.position.set(ctr.x + 0.12, hy + 0.04, ctr.z + opts.dist);
      thumbCam.lookAt(ctr.x, hy - 0.02, ctr.z);
    } else {
      const r = Math.max(size.x, size.y, size.z) * 0.5;
      const dist = r / Math.tan(15 * Math.PI / 180) * 1.05;
      thumbCam.position.set(ctr.x + dist * 0.55, ctr.y + dist * 0.5, ctr.z + dist * 0.68);
      thumbCam.lookAt(ctr);
    }
    thumbR.setClearColor(0x000000, 0);
    thumbR.render(thumbScene, thumbCam);
    const url = thumbR.domElement.toDataURL('image/png');
    thumbScene.remove(obj3d);
    return url;
  };
})();
