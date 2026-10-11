/* Hjemliv — visuelle personer og dyr, poser og animation */
'use strict';
(function () {
  const T = THREE, M = H.M, W = H.W;
  const A = H.A = {};

  A.create = function (a) {
    A.remove(a);
    let P;
    if (a.kind === 'pet') P = M.buildPet(a);
    else P = M.buildPerson(a);
    P.root.userData.owner = { kind: 'agent', id: a.id };
    W.agentRoot.add(P.root);
    a._v = { P, t: Math.random() * 10, blink: 2 + Math.random() * 3, walkP: 0, prop: null, propKind: '' };
    A.place(a);
    return a._v;
  };
  A.remove = function (a) { if (a._v) { W.agentRoot.remove(a._v.P.root); a._v = null; } };
  A.place = function (a) { if (!a._v) return; const r = a._v.P.root; r.position.set(a.x, a._py || 0, a.z); r.rotation.y = a.ry || 0; };

  function propFor(kind) {
    const G = new T.Group();
    if (kind === 'book') {
      M.add(G, M.boxG(0.16, 0.22, 0.03), M.mat('#a63d40', 0.7), 0, 0, 0);
      M.add(G, M.boxG(0.15, 0.21, 0.032), M.mat('#f4efe2', 0.9), 0.006, 0, 0);
    } else if (kind === 'plate') {
      M.add(G, M.cylG(0.12, 0.1, 0.02, 18), M.mat('#f6f5f1', 0.3), 0, 0, 0);
      M.add(G, M.sphG(0.06, 10, 8), M.mat('#d08a4a', 0.7), 0, 0.03, 0).scale.set(1, 0.5, 1);
    } else if (kind === 'guitar') {
      const b = M.mat('#c88a3a', 0.35);
      M.add(G, M.sphG(0.15, 16, 12), b, 0, 0, 0).scale.set(1, 1.05, 0.3);
      M.add(G, M.sphG(0.11, 16, 12), b, 0.18, 0.02, 0).scale.set(1, 1, 0.3);
      M.add(G, M.boxG(0.45, 0.045, 0.03), M.mat('#3b2a22', 0.6), 0.48, 0.03, 0.01);
      M.add(G, M.cylG(0.035, 0.035, 0.02, 14), M.mat('#111', 0.6), 0.06, 0.01, 0.045).rotation.x = Math.PI / 2;
    } else if (kind === 'bottle') {
      M.add(G, M.cylG(0.03, 0.03, 0.12, 10), M.mat('#f4f1ea', 0.3, 0, { transparent: true, opacity: 0.85 }), 0, 0, 0);
      M.add(G, M.cylG(0.015, 0.02, 0.04, 8), M.mat('#e0a0b0', 0.5), 0, 0.08, 0);
    } else if (kind === 'brush') {
      M.add(G, M.cylG(0.008, 0.008, 0.22, 6), M.mat('#8a5a37', 0.6), 0, 0, 0);
      M.add(G, M.sphG(0.015, 6, 6), M.mat('#d24e4e', 0.6), 0, 0.12, 0);
    } else if (kind === 'phone') {
      M.add(G, M.boxG(0.06, 0.12, 0.012), M.mat('#1d1f24', 0.3), 0, 0, 0);
    }
    G.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return G;
  }
  const PROP_OF = { read: 'book', eat: 'plate', eatstand: 'plate', guitar: 'guitar', paint: 'brush', feedbaby: 'bottle', phone: 'phone' };

  function setProp(a, kind) {
    const v = a._v; if (v.propKind === kind) return;
    if (v.prop) { v.prop.parent && v.prop.parent.remove(v.prop); v.prop = null; }
    v.propKind = kind || '';
    if (!kind) return;
    const p = propFor(kind); v.prop = p;
    const P = v.P;
    if (kind === 'guitar') { P.spine.add(p); p.position.set(-0.05, 0.2, 0.17); p.rotation.set(0, 0, 0.45); }
    else { P.armR.el.add(p); p.position.set(0, -0.3, 0.06); if (kind === 'book') p.rotation.set(-0.6, 0, 0); if (kind === 'plate') p.position.set(0, -0.29, 0.08); if (kind === 'brush') p.rotation.set(1.2, 0, 0); }
  }

  function reset(P) {
    P.body.rotation.set(0, 0, 0); P.body.position.set(0, 0, 0);
    P.hips.position.y = P.hipsY; P.hips.rotation.set(0, 0, 0);
    P.spine.rotation.set(P.spine.userData.baseX || 0, 0, 0);
    P.head.rotation.set(0, 0, 0);
    for (const arm of [P.armL, P.armR]) { arm.sh.rotation.set(0, 0, 0); arm.el.rotation.set(0, 0, 0); }
    for (const leg of [P.legL, P.legR]) { leg.hp.rotation.set(0, 0, 0); leg.kn.rotation.set(0, 0, 0); }
  }

  A.update = function (a, dt, animRate) {
    const v = a._v; if (!v) return;
    const P = v.P;
    P.root.visible = !a._hidden;
    if (a._hidden) return;
    v.t += dt * animRate;
    const t = v.t;
    const root = P.root;
    // position og retning
    let ry = a.ry || 0;
    const cur = root.rotation.y;
    let d = ry - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    root.rotation.y = cur + d * Math.min(1, dt * 10 * Math.max(1, animRate * 0.5));
    root.position.x = a.x; root.position.z = a.z;
    if (a.kind === 'pet') return petPose(a, P, t, dt, animRate);

    if (P.spine.userData.baseX === undefined) P.spine.userData.baseX = P.spine.rotation.x;
    reset(P);
    const s = P.scale;
    const pose = a._pose || {};
    let anim = a.anim || 'idle';
    if (P.baby && (anim === 'idle' || anim === 'walk') && !a._carriedBy) anim = 'babysit';
    if (a._carriedBy) anim = 'carried';
    let y = 0;
    const sinT = Math.sin(t * 2), sw = Math.sin;
    const armRest = () => { P.armL.sh.rotation.z = 0.07; P.armR.sh.rotation.z = -0.07; P.armL.el.rotation.x = -0.12; P.armR.el.rotation.x = -0.12; };
    const sit = (h) => { P.legL.hp.rotation.x = -1.52; P.legR.hp.rotation.x = -1.52; P.legL.kn.rotation.x = 1.5; P.legR.kn.rotation.x = 1.5; P.hips.position.y = (h + 0.07) / s; P.armL.sh.rotation.x = -0.35; P.armR.sh.rotation.x = -0.35; P.armL.el.rotation.x = -0.55; P.armR.el.rotation.x = -0.55; };
    const lie = (h) => { P.body.rotation.x = -Math.PI / 2; P.body.position.z = 0.86; y = h + 0.12 * s; P.armL.sh.rotation.z = 0.12; P.armR.sh.rotation.z = -0.12; P.head.rotation.x = -0.15; };
    let eyesClosed = false, talking = false;
    let prop = PROP_OF[anim] || '';
    switch (anim) {
      case 'walk': case 'run': {
        const fast = anim === 'run' ? 1.65 : 1;
        v.walkP += dt * animRate * (anim === 'run' ? 11 : 7.2) * (a.age === 'child' ? 1.15 : 1);
        const p = v.walkP;
        const amp = 0.5 * fast;
        P.legL.hp.rotation.x = sw(p) * amp; P.legR.hp.rotation.x = -sw(p) * amp;
        P.legL.kn.rotation.x = 0.12 + Math.max(0, sw(p - 1.5)) * 0.8 * fast;
        P.legR.kn.rotation.x = 0.12 + Math.max(0, -sw(p - 1.5)) * 0.8 * fast;
        P.armL.sh.rotation.x = -sw(p) * 0.42 * fast; P.armR.sh.rotation.x = sw(p) * 0.42 * fast;
        P.armL.sh.rotation.z = 0.08; P.armR.sh.rotation.z = -0.08;
        P.armL.el.rotation.x = anim === 'run' ? -1.3 : -0.28; P.armR.el.rotation.x = anim === 'run' ? -1.3 : -0.28;
        P.hips.position.y = P.hipsY + Math.abs(Math.cos(p)) * 0.025 * fast - 0.01;
        P.spine.rotation.x += anim === 'run' ? 0.14 : 0.03;
        P.hips.rotation.y = sw(p) * 0.06;
        y = pose.h || 0;
        break;
      }
      case 'babysit': P.legL.hp.rotation.x = -1.45; P.legR.hp.rotation.x = -1.45; P.legL.hp.rotation.z = 0.3; P.legR.hp.rotation.z = -0.3; P.hips.position.y = 0.16 / s; armRest(); P.armL.sh.rotation.x = -0.4 + sinT * 0.05; P.armR.sh.rotation.x = -0.4 - sinT * 0.05; P.head.rotation.y = Math.sin(t * 0.7) * 0.3; y = pose.h || 0; break;
      case 'carried': P.legL.hp.rotation.x = -1.2; P.legR.hp.rotation.x = -1.2; P.legL.kn.rotation.x = 0.8; P.legR.kn.rotation.x = 0.8; P.armL.sh.rotation.x = -0.6; P.armR.sh.rotation.x = -0.6; y = a._py || 0.75; break;
      case 'sit': case 'tv': sit(pose.h || 0.45); if (anim === 'tv') { P.spine.rotation.x -= 0.12; P.head.rotation.x = 0.05; } P.spine.rotation.x += Math.sin(t * 1.3) * 0.01; y = 0; break;
      case 'sitsleep': sit(pose.h || 0.45); P.head.rotation.x = 0.35; P.head.rotation.z = 0.2; eyesClosed = true; P.spine.rotation.x -= 0.2; break;
      case 'eat': sit(pose.h || 0.45); { const c = Math.max(0, Math.sin(t * 1.6)); P.armR.sh.rotation.x = -0.6 - c * 0.85; P.armR.el.rotation.x = -1.2 - c * 0.6; P.armR.sh.rotation.z = -0.15; P.head.rotation.x = 0.1 - c * 0.1; } break;
      case 'type': sit(pose.h || 0.46); P.armL.sh.rotation.x = -0.75; P.armR.sh.rotation.x = -0.75; P.armL.el.rotation.x = -0.75 + Math.sin(t * 14) * 0.05; P.armR.el.rotation.x = -0.75 + Math.cos(t * 13) * 0.05; P.armL.sh.rotation.z = -0.15; P.armR.sh.rotation.z = 0.15; P.head.rotation.x = -0.05; break;
      case 'sleep': lie(pose.h || 0.55); eyesClosed = true; P.body.position.y = Math.sin(t * 0.8) * 0.005; break;
      case 'bath': lie(pose.h || 0.15); P.spine.rotation.x = -0.25; P.head.rotation.x = 0.3; eyesClosed = Math.sin(t * 0.3) > 0.3; break;
      case 'passout': lie(0); eyesClosed = true; break;
      case 'use': armRest(); P.armL.sh.rotation.x = -0.75 + Math.sin(t * 3) * 0.1; P.armR.sh.rotation.x = -0.75 - Math.sin(t * 3) * 0.1; P.armL.el.rotation.x = -0.65; P.armR.el.rotation.x = -0.65; P.head.rotation.x = 0.15; y = pose.h || 0; break;
      case 'cook': armRest(); P.armL.sh.rotation.x = -0.6; P.armL.el.rotation.x = -0.9; P.armR.sh.rotation.x = -0.85 + Math.sin(t * 5) * 0.12; P.armR.sh.rotation.z = -0.1 + Math.cos(t * 5) * 0.15; P.armR.el.rotation.x = -0.9; P.head.rotation.x = 0.28; break;
      case 'eatstand': armRest(); { const c = Math.max(0, Math.sin(t * 1.6)); P.armR.sh.rotation.x = -0.5 - c * 0.9; P.armR.el.rotation.x = -1.3 - c * 0.5; P.armL.sh.rotation.x = -0.3; P.armL.el.rotation.x = -1.0; } break;
      case 'read': armRest(); P.armL.sh.rotation.x = -0.75; P.armL.el.rotation.x = -1.2; P.armR.sh.rotation.x = -0.75; P.armR.el.rotation.x = -1.2; P.armL.sh.rotation.z = -0.25; P.armR.sh.rotation.z = 0.25; P.head.rotation.x = 0.35; if (pose.kind === 'sit') sit(pose.h); break;
      case 'paint': armRest(); P.armR.sh.rotation.x = -1.35 + Math.sin(t * 2.6) * 0.3; P.armR.sh.rotation.z = -0.2 + Math.cos(t * 1.7) * 0.2; P.armR.el.rotation.x = -0.35; P.armL.sh.rotation.x = -0.4; P.armL.el.rotation.x = -1.0; P.head.rotation.y = Math.sin(t * 0.6) * 0.15; break;
      case 'shower': armRest(); { const c = Math.sin(t * 4); P.armL.sh.rotation.x = -2.6 + c * 0.25; P.armR.sh.rotation.x = -2.6 - c * 0.25; P.armL.el.rotation.x = -1.4; P.armR.el.rotation.x = -1.4; P.head.rotation.x = -0.25; eyesClosed = true; } break;
      case 'talk': armRest(); talking = true; P.armL.sh.rotation.x = -0.35 + Math.sin(t * 2.3) * 0.3; P.armR.sh.rotation.x = -0.35 + Math.sin(t * 2.9 + 1) * 0.35; P.armL.el.rotation.x = -0.75; P.armR.el.rotation.x = -0.8; P.armR.sh.rotation.z = -0.15 - Math.max(0, Math.sin(t * 1.7)) * 0.3; P.head.rotation.x = Math.sin(t * 3) * 0.06; P.head.rotation.y = Math.sin(t * 1.1) * 0.12; if (pose.kind === 'sit') sit(pose.h); break;
      case 'listen': armRest(); P.head.rotation.x = Math.sin(t * 1.5) * 0.05; P.head.rotation.z = 0.08; P.armL.sh.rotation.x = -0.1; if (pose.kind === 'sit') sit(pose.h); break;
      case 'laugh': armRest(); P.spine.rotation.x -= 0.15 + Math.abs(Math.sin(t * 10)) * 0.06; P.head.rotation.x = -0.25; P.armL.sh.rotation.x = -0.6; P.armL.el.rotation.x = -1.3; P.armR.sh.rotation.x = -0.6; P.armR.el.rotation.x = -1.3; talking = true; break;
      case 'dance': { const b = Math.abs(Math.sin(t * 4.2)); P.hips.position.y = P.hipsY - b * 0.06; P.legL.kn.rotation.x = b * 0.25; P.legR.kn.rotation.x = b * 0.25; P.legL.hp.rotation.x = -b * 0.12; P.legR.hp.rotation.x = -b * 0.12; P.body.rotation.z = Math.sin(t * 2.1) * 0.08; P.armL.sh.rotation.z = 1.2 + Math.sin(t * 4.2) * 0.8; P.armR.sh.rotation.z = -1.2 + Math.sin(t * 4.2 + 1.5) * 0.8; P.armL.el.rotation.z = 0.6; P.armR.el.rotation.z = -0.6; P.head.rotation.z = Math.sin(t * 2.1) * 0.15; P.spine.rotation.y = Math.sin(t * 2.1) * 0.2; break; }
      case 'guitar': armRest(); P.armL.sh.rotation.x = -0.75; P.armL.sh.rotation.z = -0.55; P.armL.el.rotation.x = -1.1; P.armR.sh.rotation.x = -0.55; P.armR.sh.rotation.z = 0.4; P.armR.el.rotation.x = -1.3 + Math.sin(t * 9) * 0.18; P.head.rotation.x = 0.2 + Math.sin(t * 2) * 0.05; P.head.rotation.z = Math.sin(t * 1.4) * 0.1; break;
      case 'crouch': case 'care': case 'pet': P.legL.hp.rotation.x = -1.25; P.legR.hp.rotation.x = -0.6; P.legL.kn.rotation.x = 2.1; P.legR.kn.rotation.x = 1.9; P.hips.position.y = P.hipsY * 0.52; P.spine.rotation.x += 0.35; P.armL.sh.rotation.x = -0.9 + Math.sin(t * 3) * 0.15; P.armR.sh.rotation.x = -0.9 - Math.sin(t * 3) * 0.15; P.armL.el.rotation.x = -0.4; P.armR.el.rotation.x = -0.4; P.head.rotation.x = 0.25; break;
      case 'feedbaby': armRest(); P.armR.sh.rotation.x = -1.0; P.armR.el.rotation.x = -0.8; P.armL.sh.rotation.x = -0.8; P.armL.el.rotation.x = -1.2; P.head.rotation.x = 0.35; prop = 'bottle'; break;
      case 'hug': armRest(); P.armL.sh.rotation.x = -1.25; P.armR.sh.rotation.x = -1.25; P.armL.sh.rotation.z = -0.35; P.armR.sh.rotation.z = 0.35; P.armL.el.rotation.x = -0.7; P.armR.el.rotation.x = -0.7; P.head.rotation.z = 0.2; break;
      case 'wave': armRest(); P.armR.sh.rotation.z = -2.5; P.armR.el.rotation.z = Math.sin(t * 8) * 0.4; P.head.rotation.z = 0.08; break;
      case 'cheer': { const b = Math.abs(Math.sin(t * 5)); P.armL.sh.rotation.z = 2.7; P.armR.sh.rotation.z = -2.7; P.armL.el.rotation.z = 0.3 * b; P.armR.el.rotation.z = -0.3 * b; P.hips.position.y = P.hipsY + b * 0.07; P.head.rotation.x = -0.2; talking = true; break; }
      case 'angry': armRest(); P.armL.sh.rotation.x = -0.4 + Math.sin(t * 6) * 0.3; P.armR.sh.rotation.x = -0.4 - Math.sin(t * 6) * 0.3; P.armL.el.rotation.x = -1.4; P.armR.el.rotation.x = -1.4; P.head.rotation.y = Math.sin(t * 7) * 0.2; P.spine.rotation.x += 0.12; talking = true; break;
      case 'sad': armRest(); P.head.rotation.x = 0.45; P.spine.rotation.x += 0.18; P.armL.sh.rotation.x = 0.1; P.armR.sh.rotation.x = 0.1; break;
      case 'phone': armRest(); P.armR.sh.rotation.x = -0.4; P.armR.sh.rotation.z = -0.6; P.armR.el.rotation.x = -2.3; talking = true; break;
      case 'stretch': armRest(); P.armL.sh.rotation.z = 2.8; P.armR.sh.rotation.z = -2.8; P.spine.rotation.x -= 0.1; break;
      default: // idle
        armRest(); P.armL.sh.rotation.x = Math.sin(t * 0.9) * 0.03; P.armR.sh.rotation.x = -Math.sin(t * 0.9) * 0.03;
        P.hips.rotation.z = Math.sin(t * 0.5) * 0.015; P.head.rotation.y = Math.sin(t * 0.37) * 0.18; P.head.rotation.x = Math.sin(t * 0.23) * 0.05;
        if (pose.kind === 'sit') sit(pose.h);
        if (pose.kind === 'lie') { lie(pose.h); eyesClosed = true; }
        y = pose.kind === 'onobj' ? pose.h : y;
    }
    if (pose.kind === 'onobj' && anim !== 'run') y = pose.h;
    if (anim === 'run') y = pose.h || 0;
    root.position.y = a._carriedBy ? (a._py || 0.8) : y;
    // vejrtrækning
    P.spine.scale.set(1, 1 + Math.sin(t * 2.4) * 0.008, 1);
    // øjne og mund
    v.blink -= dt;
    let eyeS = 1;
    if (v.blink < 0) { eyeS = 0.1; if (v.blink < -0.12) v.blink = 2.5 + Math.random() * 3.5; }
    if (eyesClosed) eyeS = 0.08;
    P.eyes.forEach(e => e.scale.y = eyeS);
    const mood = a.mood || 0;
    const m = P.mouth;
    if (talking) { m.rotation.z = Math.PI; m.scale.set(0.9, 0.6 + Math.abs(Math.sin(t * 14)) * 1.2, 1); }
    else if (mood > 5 || eyesClosed) { m.rotation.z = Math.PI; m.scale.set(1, mood > 40 ? 1.2 : 0.8, 1); m.position.y = -0.06; }
    else if (mood < -25) { m.rotation.z = 0; m.scale.set(0.9, 0.7, 1); m.position.y = -0.078; }
    else { m.rotation.z = Math.PI; m.scale.set(0.9, 0.25, 1); m.position.y = -0.064; }
    if (P.ponytail) P.ponytail.rotation.z = Math.sin(t * 3) * (anim === 'walk' || anim === 'dance' ? 0.15 : 0.03);
    setProp(a, prop);
  };

  function petPose(a, P, t, dt, rate) {
    const anim = a.anim || 'idle';
    const v = a._v; const pose = a._pose || {};
    P.body.rotation.set(0, 0, 0); P.body.position.set(0, 0, 0);
    P.head.rotation.set(0, 0, 0);
    P.legs.forEach(l => l.rotation.set(0, 0, 0));
    P.tail.rotation.y = 0;
    const happy = (a.mood || 0) > -10;
    const wag = happy ? Math.sin(t * (a.species === 'cat' ? 2 : 12)) * (a.species === 'cat' ? 0.3 : 0.6) : 0;
    P.tail.rotation.z = wag;
    let y = 0;
    if (anim === 'walk' || anim === 'run') {
      v.walkP += dt * rate * (anim === 'run' ? 14 : 9);
      const p = v.walkP;
      P.legs[0].rotation.x = Math.sin(p) * 0.6; P.legs[3].rotation.x = Math.sin(p) * 0.6;
      P.legs[1].rotation.x = -Math.sin(p) * 0.6; P.legs[2].rotation.x = -Math.sin(p) * 0.6;
      P.body.position.y = Math.abs(Math.cos(p)) * 0.02;
      P.head.rotation.x = Math.sin(p * 2) * 0.05;
    } else if (anim === 'sit' || anim === 'beg') {
      P.body.rotation.x = -0.45; P.body.position.y = -0.06; P.body.position.z = -0.08;
      P.legs[0].rotation.x = 0.45; P.legs[1].rotation.x = 0.45;
      P.legs[2].rotation.x = -1.1; P.legs[3].rotation.x = -1.1;
      P.head.rotation.x = 0.35 + (anim === 'beg' ? Math.sin(t * 6) * 0.1 : 0);
    } else if (anim === 'sleep' || anim === 'lie') {
      P.body.position.y = -0.22; P.legs.forEach((l, i) => l.rotation.x = i < 2 ? -1.4 : 1.4);
      P.head.rotation.x = 0.35; P.tail.rotation.z = 0;
    } else if (anim === 'eat') {
      P.head.rotation.x = 0.85 + Math.sin(t * 8) * 0.06; P.body.rotation.x = 0.12;
    } else if (anim === 'play') {
      const b = Math.abs(Math.sin(t * 6)); P.body.position.y = b * 0.12; P.body.rotation.x = -0.2 + Math.sin(t * 6) * 0.2;
      P.legs[0].rotation.x = -0.6 * b; P.legs[1].rotation.x = -0.6 * b;
    } else if (anim === 'spin') {
      P.body.rotation.y = t * 6;
    } else {
      P.head.rotation.y = Math.sin(t * 0.6) * 0.4; P.head.rotation.x = Math.sin(t * 0.4) * 0.1;
    }
    P.root.position.y = (pose.h || 0) + y;
  }
})();
