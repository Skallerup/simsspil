/* Hjemliv — opstart og hovedløkke */
'use strict';
(function () {
  const W = H.W, S = H.sim, UI = H.UI;
  let errCount = 0, lastErrNote = 0;
  function report(where, e) {
    errCount++;
    console.error('[Hjemliv] ' + where, e);
    const now = performance.now();
    if (now - lastErrNote > 15000 && UI.toast) { lastErrNote = now; UI.toast('Noget gik galt, men spillet kører videre. Brug "Nulstil fastlåste personer" i menuen, hvis nogen står stille.'); }
  }
  H.safe = (where, fn) => { try { return fn(); } catch (e) { report(where, e); } };
  function boot() {
    if (!window.THREE) { document.body.insertAdjacentHTML('beforeend', '<div style="position:fixed;inset:0;display:grid;place-items:center;color:#fff;font:700 16px system-ui;padding:16px;text-align:center">3D-motoren kunne ikke indlæses. Prøv at genindlæse siden.</div>'); return; }
    W.init(document.getElementById('game'));
    UI.init();
    UI.showTitle();
    // grafikken kan blive nulstillet af browseren (fx ved dvale eller for lidt grafikhukommelse)
    const cv = W.renderer.domElement;
    cv.addEventListener('webglcontextlost', e => {
      e.preventDefault(); W.lost = true;
      if (H.G && UI.state === 'game') UI.save(false);
      UI.showOverlay && UI.showOverlay('Grafikken blev afbrudt af browseren. Spillet er gemt.', 'Genindlæs', () => location.reload());
    });
    cv.addEventListener('webglcontextrestored', () => { W.lost = false; UI.hideOverlay && UI.hideOverlay(); UI.loadWorld && UI.loadWorld(); });
    // tilpas kvaliteten, hvis computeren er for langsom
    let slowT = 0, lowered = false;
    let last = performance.now(), lampT = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      const raw = (now - last) / 1000; last = now;
      const dt = Math.min(0.1, Math.max(0, raw));
      if (W.lost) return;
      if (!lowered && raw > 0.07 && raw < 1) { slowT += raw; if (slowT > 4) { lowered = true; H.safe('kvalitet', () => UI.lowerQuality()); } } else if (raw < 0.04) slowT = Math.max(0, slowT - raw);
      const g = H.G;
      const running = g && (UI.state === 'game' || UI.state === 'title') && UI.mode === 'live' && !UI.modal && !UI.casActive;
      const dtMin = running ? dt * (H.SPEEDS[g.speed] || 0) : 0;
      if (dtMin > 0 && isFinite(dtMin)) H.safe('simulation', () => { S.update(dtMin); W.updateCars(dtMin, dt); });
      if (!UI.casActive) {
        H.safe('visning', () => {
          if (UI.state === 'title') W.camT.yaw += dt * 0.04;
          S.visualTick(dt);
          W.updateSky(g ? g.time % 1440 : 720);
          lampT -= dt; if (lampT <= 0) { lampT = 0.5; W.updateLamps(); }
          W.updateWalls(dt); W.updateFx(dt); W.updateCamera(dt);
        });
        H.safe('brugerflade', () => UI.frame(dt));
        H.safe('tegning', () => W.render());
      } else {
        H.safe('brugerflade', () => UI.frame(dt));
        H.safe('tegning', () => W.renderer.render(UI.casScene, UI.casCamera()));
      }
    }
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
