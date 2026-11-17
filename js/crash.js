/* ============ КРАШ ============ */
const Crash = (() => {
  const K = .15;                                   // скорость роста: x = e^(K·t)
  const LEVELS = [1.5, 2, 3, 5, 10, 20, 50, 100];
  const crashAt = () => Math.random() < .04 ? 1 : Math.min(500, Math.max(1.01, Math.floor(96 / (1 - Math.random())) / 100));
  const RK_W = 96, RK_H = 102.4, RK_AX = 16 * Math.PI / 180, RK_NX = -39, RK_NY = 23.7;   // размер картинки, наклон оси, сопло относительно центра
  const tier = m => m >= 10 ? 't3' : m >= 4 ? 't2' : m >= 2 ? 't1' : '';

  function open() {
    const st = { bet: 10 };
    let phase = 'idle', alive = true, raf = 0, t0 = 0, last = performance.now(), cp = 1, auto = 2;
    let cur = { t: 0, m: 1 }, crashed = false, shake = 0, parts = [], bots = [], cashed = 0;
    const hist = [1.84, 3.2, 1.12, 7.5, 2.05, 1.5, 12.4, 1.01, 2.7];

    const body = Sub.open('Краш', `
      <div class="cr-stage" id="stage"><canvas id="cv"></canvas><div class="rk-rocket" id="rk"><img src="assets/rocket.png" alt="" draggable="false"></div>
        <div class="cr-mult" id="crM"><b>1.00</b><i>x</i></div><div class="cr-sub" id="crS"></div></div>
      <div class="cr-hist" id="hist"></div>
      <div class="sl-ctl">
        <button class="btn gold block cr-go" id="goB">Старт</button>
        <div class="autoc"><span>Авто-вывод</span><label class="auto-in"><input id="autoI" type="number" inputmode="decimal" step="0.1" min="1.1" value="2.00"><i>x</i></label></div>
        ${betHTML()}</div>
      <div class="cr-live" id="live"></div>`,
      { bg: .16, onClose: () => { alive = false; cancelAnimationFrame(raf); } });

    bindBet(body, st, () => phase === 'fly');
    const cv = $('#cv', body), ctx = cv.getContext('2d'), stage = $('#stage', body), mEl = $('#crM', body), mB = $('b', mEl), rk = $('#rk', body), sEl = $('#crS', body), goB = $('#goB', body);
    let W = 0, H = 0;
    const stars = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() * .9 + .1 }));
    const fit = () => { const d = Math.min(1.5, devicePixelRatio || 1); W = stage.clientWidth; H = stage.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    fit(); window.addEventListener('resize', fit);

    const histPaint = () => { $('#hist', body).innerHTML = hist.slice(-10).reverse().map(x => `<span class="${x >= 2 ? 'hi' : 'lo'}">${fmt(x)}x</span>`).join(''); }; histPaint();

    /* --- маленький список «игроков» --- */
    const liveRows = () => $('#live', body).innerHTML = bots.map(b => `<div class="cl-row ${b.state}"><span class="dot" style="background:hsl(${b.h},60%,52%)">${esc(b.name[0].toUpperCase())}</span><span class="n">${esc(b.name)}</span><span class="b">${COIN}${fmt(b.bet, 0)}</span><span class="r">${b.state === 'win' ? fmt(b.at) + 'x' : b.state === 'bust' ? '—' : ''}</span></div>`).join('');
    const spawnBots = () => {
      const names = FAKE_NAMES.slice().sort(() => Math.random() - .5).slice(0, 5);
      bots = names.map(n => ({ name: n, h: Math.floor(Math.random() * 360), bet: pick([10, 25, 50, 100, 250, 500]), at: Math.max(1.1, Math.round((1 + -Math.log(Math.random()) * 1.4) * 100) / 100), state: 'wait' }));
      liveRows();
    };
    const botTick = m => { let ch = false; bots.forEach(b => { if (b.state === 'wait' && m >= b.at) { b.state = 'win'; ch = true; } }); if (ch) liveRows(); };
    const botBust = () => { bots.forEach(b => { if (b.state === 'wait') b.state = 'bust'; }); liveRows(); };

    /* --- геометрия --- */
    const padL = 18, padR = 46, padT = 56, padB = 26;
    const pt = (t, m, tv, ym) => [padL + (t / tv) * (W - padL - padR), H - padB - ((m - 1) / (ym - 1)) * (H - padT - padB)];
    const burst = (x, y, n, hue) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 40 + Math.random() * 220; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, d: .7 + Math.random() * .9, s: 1.5 + Math.random() * 3, h: hue + Math.random() * 40 }); } };

    function draw(now, dt) {
      const t = cur.t, m = cur.m, flying = phase === 'fly';
      ctx.save(); if (shake > 0) { ctx.translate((Math.random() - .5) * shake * 10, (Math.random() - .5) * shake * 10); shake = Math.max(0, shake - dt * 3.2); }
      ctx.clearRect(-20, -20, W + 40, H + 40);
      /* звёзды с параллаксом */
      stars.forEach(s => { s.x -= dt * s.z * (flying ? .05 + Math.min(.25, m * .01) : .006); s.y += dt * s.z * (flying ? .03 : .002); if (s.x < 0) { s.x = 1; s.y = Math.random(); } if (s.y > 1) s.y = 0;
        ctx.globalAlpha = .2 + .5 * s.z * (.6 + .4 * Math.sin(now / 500 + s.x * 20)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H, s.z * 2, s.z * 2); });
      ctx.globalAlpha = 1;
      const tv = Math.max(8, t * 1.12), ym = Math.max(2.4, m * 1.22);
      /* сетка уровней */
      ctx.font = '700 10px Manrope,system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      LEVELS.forEach(v => { if (v >= ym) return; const y = pt(0, v, tv, ym)[1]; ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR + 8, y); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.32)'; ctx.fillText(v + 'x', W - 10, y); });
      /* кривая */
      const N = 70, red = crashed; let ex, ey; ctx.beginPath();
      for (let i = 0; i <= N; i++) { const tt = t * i / N, [x, y] = pt(tt, Math.exp(K * tt), tv, ym); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      [ex, ey] = pt(t, m, tv, ym);
      const g = ctx.createLinearGradient(padL, H, ex, ey);
      if (red) { g.addColorStop(0, 'rgba(255,111,128,0)'); g.addColorStop(1, '#ff6f80'); } else { g.addColorStop(0, 'rgba(34,197,94,0)'); g.addColorStop(.55, '#22c55e'); g.addColorStop(1, '#c8ffe0'); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = red ? 'rgba(255,111,128,.18)' : 'rgba(34,197,94,.2)'; ctx.lineWidth = 13; ctx.stroke(); ctx.strokeStyle = g; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.lineTo(ex, H - padB); ctx.lineTo(padL, H - padB); ctx.closePath();
      const fg = ctx.createLinearGradient(0, ey, 0, H); fg.addColorStop(0, red ? 'rgba(255,111,128,.22)' : 'rgba(34,197,94,.26)'); fg.addColorStop(1, 'rgba(130,103,255,0)'); ctx.fillStyle = fg; ctx.fill();
      /* ракета (картинка) + огонь из сопла */
      let rx = ex, ry = ey, ang = -Math.PI / 4; const show = flying || (phase === 'idle' && !crashed);
      if (flying && t > .05) { const [px, py] = pt(t - .06, Math.exp(K * (t - .06)), tv, ym); ang = Math.atan2(ey - py, ex - px); }
      if (!flying) { rx = padL + 44; ry = H - padB - 40 + Math.sin(now / 420) * 3; } else { rx -= Math.cos(ang) * 26; ry -= Math.sin(ang) * 26; }
      if (show) {
        const th = ang + RK_AX, c = Math.cos(th), s = Math.sin(th), nx = rx + c * RK_NX - s * RK_NY, ny = ry + s * RK_NX + c * RK_NY;
        rk.style.opacity = 1; rk.style.transform = `translate3d(${(rx - RK_W / 2).toFixed(1)}px,${(ry - RK_H / 2).toFixed(1)}px,0) rotate(${(th * 180 / Math.PI).toFixed(1)}deg)`;
        const bx = -Math.cos(ang), by = -Math.sin(ang), px2 = -by, py2 = bx, pw = flying ? 1 : .45, fl = (22 + Math.min(34, m * 1.6)) * pw * (.85 + .15 * Math.sin(now / 38) + Math.random() * .12);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        [[1, 'rgba(255,90,20,.55)', 1], [.72, 'rgba(255,170,40,.75)', .7], [.42, 'rgba(255,245,200,.95)', .42]].forEach(([k, col, wk]) => {
          const L = fl * k * 1.25, w = 9 * wk * (.9 + Math.random() * .2) + 2;
          ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(nx + px2 * w, ny + py2 * w);
          ctx.quadraticCurveTo(nx + bx * L * .55 + px2 * w * 1.05, ny + by * L * .55 + py2 * w * 1.05, nx + bx * L, ny + by * L);
          ctx.quadraticCurveTo(nx + bx * L * .55 - px2 * w * 1.05, ny + by * L * .55 - py2 * w * 1.05, nx - px2 * w, ny - py2 * w); ctx.closePath(); ctx.fill(); });
        ctx.restore();
        if (flying) for (let k = 0; k < (document.documentElement.classList.contains('lite') ? 1 : 3); k++) parts.push({ x: nx + bx * 6, y: ny + by * 6, vx: bx * (90 + Math.random() * 90) + (Math.random() - .5) * 40, vy: by * (90 + Math.random() * 90) + (Math.random() - .5) * 40, life: 1, d: .35 + Math.random() * .4, s: 1.4 + Math.random() * 2.6, h: 18 + Math.random() * 34 });
      } else rk.style.opacity = 0;
      /* частицы */
      if (parts.length > 140) parts.splice(0, parts.length - 140); parts = parts.filter(p => p.life > 0); parts.forEach(p => { p.life -= dt / p.d; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; p.vy *= .985;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = `hsl(${p.h},95%,${55 + (1 - p.life) * 10}%)`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (.4 + p.life * .6), 0, 6.283); ctx.fill(); });
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.restore();
    }

    function setMult(m, cls) { mB.textContent = fmt(m); mEl.className = 'cr-mult ' + (cls || tier(m)); }
    function finish() { phase = 'idle'; hist.push(cp); histPaint(); goB.textContent = 'Старт'; goB.classList.add('gold'); goB.classList.remove('vio'); goB.disabled = false; $('.bet', body).classList.remove('lock'); }
    function boom() {
      crashed = true; cur.t = Math.log(cp) / K; cur.m = cp; const [x, y] = pt(cur.t, cp, Math.max(8, cur.t * 1.12), Math.max(2.4, cp * 1.22));
      burst(x, y, 70, 0); burst(x, y, 30, 270); shake = 1; setMult(cp, 'crash'); sEl.textContent = cashed ? '' : 'Краш'; sEl.className = 'cr-sub bad';
      hap('heavy'); sfx.lose(); botBust();
      if (!cashed) logH('rocket', 'Краш: x' + fmt(cp), -st.bet);
      finish();
    }
    function cash() {
      if (phase !== 'fly' || cashed) return; cashed = 1; const m = cur.m, win = Math.round(st.bet * m * 100) / 100;
      addBal(win); sfx.big(); hap('success'); logH('rocket', 'Краш: x' + fmt(m), win);
      sEl.textContent = '+' + fmt(win); sEl.className = 'cr-sub good'; burst(...pt(cur.t, m, Math.max(8, cur.t * 1.12), Math.max(2.4, m * 1.22)), 26, 120);
      goB.innerHTML = 'Ждём взрыв…'; goB.disabled = true;
    }
    function frame(now) {
      if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (phase === 'fly') {
        const t = (now - t0) / 1000, m = Math.exp(K * t);
        if (m >= cp) boom();
        else { cur.t = t; cur.m = m; setMult(m); botTick(m); if (!cashed) { goB.innerHTML = `Забрать ${COIN}${fmt(st.bet * m)}`; if (auto > 1 && m >= auto) cash(); } }
      }
      draw(now, dt);
    }
    goB.onclick = () => {
      if (phase === 'fly') return cash(); if (!canPay(st.bet)) return;
      auto = Math.max(0, parseFloat($('#autoI', body).value) || 0);
      addBal(-st.bet); S.stats.rounds++; addXP(Math.max(1, Math.round(st.bet / 10)));
      cp = crashAt(); phase = 'fly'; crashed = false; cashed = 0; cur = { t: 0, m: 1 }; parts = []; sEl.textContent = ''; sEl.className = 'cr-sub'; setMult(1);
      goB.classList.remove('gold'); goB.classList.add('vio'); hap('medium'); spawnBots(); t0 = performance.now();
    };
    setMult(1); spawnBots(); bots.forEach(b => b.state = ''); liveRows(); raf = requestAnimationFrame(frame);
  }
  return { open };
})();
