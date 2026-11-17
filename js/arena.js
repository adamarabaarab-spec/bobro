/* ============ АРЕНА ============
   Каждый ставит — территория на поле пропорциональна ставке (взвешенная диаграмма Вороного).
   Шайба летит в случайную сторону, чья зона — тот забирает банк. */
const Arena = (() => {
  const AR = .8, FEE = .03;
  const ME = '#22c55e';
  const COLS = ['#8267ff', '#ff6f9a', '#35d6c0', '#5aa6ff', '#ff8a5c', '#9be14a', '#c06bd6', '#f2e86d'];
  const hex = c => [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];

  function open() {
    const st = { bet: 10 }; let alive = true, raf = 0, W = 360, H = 288, last = performance.now(), flash = 0;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const me = { id: 0, name: 'Вы', color: ME, bet: 0 };
    const A = { players: [], phase: 'idle', t: 0, pend: [], puck: null, win: null, trail: [], ar: 0, aw: 0, doneT: 0, _l: 0 };
    
    const body = Sub.open('Арена', `
      <div class="ar-info">
        <div class="card"><small>Банк</small><b id="aBank">${COIN}0</b></div>
        <div class="card"><small>Шанс</small><b id="aSh">0%</b></div>
        <div class="card"><small>Выигрыш</small><b id="aPw">${COIN}0</b></div></div>
      <div class="ar-wrap" id="arW"><canvas id="cv"></canvas>
        <div class="ar-timer" id="aTim"></div>
        <div class="ar-ban" id="aBan"><small>Победитель</small><b id="aBn"></b><em id="aBw"></em></div></div>
      <div class="sl-ctl"><button class="btn gold block cr-go" id="goB">Поставить</button>${betHTML()}</div>
      <div class="card ar-list" id="pl"></div>`,
      { bg: .16, onClose: () => { alive = false; cancelAnimationFrame(raf); } });
    bindBet(body, st, () => A.phase === 'spin' || A.phase === 'fly');
    const cv = $('#cv', body), cx = cv.getContext('2d'), goB = $('#goB', body), wrap = $('#arW', body);

    const total = () => A.players.reduce((a, p) => a + p.bet, 0);
    /* поле рисуем в offscreen: пока территории двигаются — в низком разрешении, как успокоились — один раз в полном (чётко) */
    let HI = { c: document.createElement('canvas'), img: null, w: 0, h: 0 }, LO = { c: document.createElement('canvas'), img: null, w: 0, h: 0 };
    let hiValid = false, stats = null;
    function size() {
      W = wrap.clientWidth - 4; H = Math.round(W * AR); cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      [[HI, dpr], [LO, .4]].forEach(([B, k]) => { B.w = Math.round(W * k); B.h = Math.round(B.w * AR); B.c.width = B.w; B.c.height = B.h; B.img = B.c.getContext('2d').createImageData(B.w, B.h); B.lab = new Uint8Array(B.w * B.h); });
      hiValid = false;
    }

    /* территории: площадь ∝ ставке, без пустот */
    function refit() {
      const P = A.players, n = P.length, tot = total(); if (!n) return;
      if (n === 1) { P[0].ts = { x: .5, y: AR / 2 }; P[0].tw = 0; }
      else {
        const gw = 34, gh = Math.round(gw * AR), N = gw * gh;
        for (let it = 0; it < 140; it++) {
          const K = .5 * (1 - it / 140) + .03, c = new Array(n).fill(0), mx = new Array(n).fill(0), my = new Array(n).fill(0);
          for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
            const u = (i + .5) / gw, v = (j + .5) / gw; let b = 0, bv = 1e9;
            for (let k = 0; k < n; k++) { const dx = u - P[k].ts.x, dy = v - P[k].ts.y, d = dx * dx + dy * dy - P[k].tw; if (d < bv) { bv = d; b = k; } }
            c[b]++; mx[b] += u; my[b] += v;
          }
          for (let k = 0; k < n; k++) {
            const t = P[k].bet / tot;
            if (it < 40 && c[k] > 0) { P[k].ts.x += .35 * (mx[k] / c[k] - P[k].ts.x); P[k].ts.y += .35 * (my[k] / c[k] - P[k].ts.y); }
            P[k].tw += (t - c[k] / N) * K; P[k].tw = Math.max(-.8, Math.min(.8, P[k].tw));
          }
        }
        const m = P.reduce((a, p) => a + p.tw, 0) / n; P.forEach(p => p.tw -= m);
      }
      P.forEach(p => { if (!p.s) { p.s = { x: p.ts.x, y: p.ts.y }; p.w = p.tw - .5; p.cx = p.ts.x * W; p.cy = p.ts.y * W; } });
    }
    function addBet(p, v) {
      v = Math.round(v * 100) / 100; if (v <= 0) return;
      if (A.players.indexOf(p) < 0) {
        let best = null, bd = -1;
        for (let t = 0; t < 14; t++) { const c = { x: .08 + Math.random() * .84, y: .08 + Math.random() * (AR - .16) }; let md = 9; A.players.forEach(q => md = Math.min(md, Math.hypot(c.x - q.ts.x, c.y - q.ts.y))); if (md > bd) { bd = md; best = c; } }
        p.bet = 0; p.ts = best; p.tw = 0; p.rgb = hex(p.color); p.s = null; A.players.push(p);
      }
      p.bet = Math.round((p.bet + v) * 100) / 100; refit(); ui();
    }
    const BOTS = FAKE_NAMES.slice();
    function startCount() {
      A.phase = 'count'; A.t = 20; const base = Math.max(me.bet, 10), n = 2 + Math.floor(Math.random() * 3), names = BOTS.slice().sort(() => Math.random() - .5); A.pend = [];
      for (let i = 0; i < n; i++) A.pend.push({ at: 19 - (Math.random() * 15 + 1), name: names[i], col: COLS[i % COLS.length], v: Math.max(5, Math.round(base * (.4 + Math.random() * 3))) });
      A.pend.sort((a, b) => b.at - a.at);
    }
    function botAct() {
      while (A.pend.length && A.t <= A.pend[0].at) { const b = A.pend.shift(), ex = A.players.filter(p => p.name === b.name)[0]; addBet(ex || { id: Math.random(), name: b.name, color: b.col, bet: 0 }, b.v); sfx.pop(); }
    }
    const pot = () => Math.round(total() * (1 - FEE) * 100) / 100;
    function ui() {
      const t = total(), ph = A.phase;
      $('#aBank', body).innerHTML = COIN + fmt(t, 0); $('#aSh', body).textContent = Math.round(t ? me.bet / t * 100 : 0) + '%'; $('#aPw', body).innerHTML = COIN + fmt(me.bet ? pot() : 0, 0);
      $('#pl', body).innerHTML = A.players.slice().sort((a, b) => b.bet - a.bet).map(p => `<div class="ar-row${A.win === p ? ' win' : ''}"><span class="dot" style="background:${p.color}">${esc(p.name[0].toUpperCase())}</span><span class="n">${esc(p.name)}${p === me ? ' <i>вы</i>' : ''}</span><span class="a">${COIN}${fmt(p.bet, 0)}</span><span class="p">${Math.round(p.bet / t * 100)}%</span></div>`).join('') || '<div class="ar-empty">—</div>';
      goB.disabled = ph === 'spin' || ph === 'fly';
      goB.textContent = ph === 'done' ? 'Новый раунд' : ph === 'count' ? 'Повысить ставку' : (ph === 'spin' || ph === 'fly') ? 'Раунд идёт' : 'Поставить';
      $('#aTim', body).textContent = ph === 'count' ? Math.ceil(A.t) : ''; $('#aTim', body).classList.toggle('on', ph === 'count');
    }
    goB.onclick = () => {
      if (A.phase === 'done') return reset();
      if (!canPay(st.bet)) return;
      addBal(-st.bet); S.stats.rounds++; addXP(Math.max(1, Math.round(st.bet / 10))); hap('medium'); addBet(me, st.bet);
      if (A.phase === 'idle') startCount(); ui();
    };
    function reset() { A.players = []; me.bet = 0; A.phase = 'idle'; A.puck = null; A.win = null; A.trail = []; $('#aBan', body).classList.remove('on'); ui(); }
    const owner = (px, py) => { const u = px / W, v = py / W; let b = 0, bv = 1e9; A.players.forEach((p, k) => { const dx = u - p.s.x, dy = v - p.s.y, d = dx * dx + dy * dy - p.w; if (d < bv) { bv = d; b = k; } }); return A.players[b]; };
    function spawn() { const m = W * .14; A.puck = { x: m + Math.random() * (W - 2 * m), y: m + Math.random() * (H - 2 * m), vx: 0, vy: 0, r: W * .045, rot: 0 }; A.ar = Math.random() * 6.283; A.aw = 13 + Math.random() * 4; A.t = 0; A.phase = 'spin'; hap('medium'); ui(); }
    function launch() { const v = W * (6.3 + Math.random() * 1.7); A.puck.vx = Math.cos(A.ar) * v; A.puck.vy = Math.sin(A.ar) * v; A.phase = 'fly'; ui(); }
    function finish() {
      const w = owner(A.puck.x, A.puck.y); A.win = w; A.phase = 'done'; A.doneT = 0; hiValid = false; const prize = pot(), mine = w === me;
      if (mine) { addBal(prize); logH('arena', 'Арена: победа', prize); sfx.big(); hap('success'); } else { logH('arena', 'Арена: проигрыш', -me.bet); sfx.lose(); hap('heavy'); }
      $('#aBn', body).textContent = mine ? 'Вы' : w.name; $('#aBn', body).style.color = w.color; $('#aBw', body).innerHTML = (mine ? '+' : '') + COIN + fmt(prize); $('#aBw', body).className = mine ? 'good' : ''; $('#aBan', body).classList.add('on'); ui();
    }

    function step(dt) {
      const P = A.players, k = Math.min(1, dt * 5);
      P.forEach(p => { if (!p.s) return; p.s.x += (p.ts.x - p.s.x) * k; p.s.y += (p.ts.y - p.s.y) * k; p.w += (p.tw - p.w) * k; });
      if (A.phase === 'count') {
        A.t -= dt; botAct();
        if (A.t <= 0) {
          while (P.length < 2) { const n = pick(BOTS); if (!P.some(q => q.name === n)) addBet({ id: Math.random(), name: n, color: COLS[P.length % COLS.length], bet: 0 }, Math.max(5, Math.round(me.bet * (.5 + Math.random() * 2)))); }
          A.t = 0; spawn();
        } else if (Math.ceil(A.t) !== A._l) { A._l = Math.ceil(A.t); $('#aTim', body).textContent = A._l; if (A._l <= 3) sfx.tick(); }
      } else if (A.phase === 'spin') { A.t += dt; if (A.t < 3.4) { A.aw *= Math.exp(-dt * .85); A.ar += A.aw * dt; } else if (A.t > 4.3) launch(); }
      else if (A.phase === 'fly') {
        const q = A.puck, sp = Math.hypot(q.vx, q.vy), fr = sp < W * .8 ? 2.2 : .55, sub = 4, d = dt / sub;
        for (let s = 0; s < sub; s++) {
          const f = Math.exp(-fr * d); q.vx *= f; q.vy *= f; q.x += q.vx * d; q.y += q.vy * d;
          if (q.x < q.r) { q.x = q.r; q.vx = Math.abs(q.vx) * .94; flash = 1; } if (q.x > W - q.r) { q.x = W - q.r; q.vx = -Math.abs(q.vx) * .94; flash = 1; }
          if (q.y < q.r) { q.y = q.r; q.vy = Math.abs(q.vy) * .94; flash = 1; } if (q.y > H - q.r) { q.y = H - q.r; q.vy = -Math.abs(q.vy) * .94; flash = 1; }
        }
        q.rot += sp * dt / q.r * .25; A.trail.push({ x: q.x, y: q.y }); if (A.trail.length > 18) A.trail.shift();
        if (Math.hypot(q.vx, q.vy) < W * .012) finish();
      } else if (A.phase === 'done') { A.doneT += dt; if (A.trail.length) A.trail.shift(); }
    }

    function renderField(B) {
      const P = A.players, n = P.length, done = A.phase === 'done', d = B.img.data, ow = B.w, oh = B.h, sc = 1 / ow, lab = B.lab;
      const cn = new Array(n).fill(0), mx = new Array(n).fill(0), my = new Array(n).fill(0), px = W * sc;     // px — размер пикселя в css-пикселях
      const sx = P.map(p => p.s.x), sy = P.map(p => p.s.y), sw = P.map(p => p.w), col = P.map(p => p.rgb), win = P.map(p => done && A.win === p);
      for (let y = 0; y < oh; y++) {
        const v = (y + .5) * sc;
        for (let x = 0; x < ow; x++) {
          const u = (x + .5) * sc; let b = 0, b2 = -1, e1 = 1e9, e2 = 1e9, q1 = 0;
          for (let i = 0; i < n; i++) { const dx = u - sx[i], dy = v - sy[i], q = dx * dx + dy * dy, e = q - sw[i]; if (e < e1) { e2 = e1; b2 = b; e1 = e; b = i; q1 = q; } else if (e < e2) { e2 = e; b2 = i; } }
          const o = y * ow + x; lab[o] = b; cn[b]++; mx[b] += u; my[b] += v;
          /* расстояние до границы (в css-пикселях) → сглаженная линия */
          let edge = 0;
          if (b2 >= 0) { const ddx = sx[b] - sx[b2], ddy = sy[b] - sy[b2], sep = Math.sqrt(ddx * ddx + ddy * ddy) || 1, dist = (e2 - e1) / (2 * sep) * W; edge = dist < 2 ? 1 - Math.max(0, dist - .4) / 1.6 : 0; }
          let kk = .55 + .55 * Math.exp(-Math.sqrt(q1) * 2.4);
          const isW = win[b]; if (done) kk *= isW ? 1.15 : .3;
          let r = col[b][0] * kk, g = col[b][1] * kk, bl = col[b][2] * kk;
          if (edge > 0) { const m = (isW ? .95 : done ? .12 : .55) * edge; r += (255 - r) * m; g += (255 - g) * m; bl += (255 - bl) * m; }
          const k4 = o * 4; d[k4] = r > 255 ? 255 : r; d[k4 + 1] = g > 255 ? 255 : g; d[k4 + 2] = bl > 255 ? 255 : bl; d[k4 + 3] = 255;
        }
      }
      B.c.getContext('2d').putImageData(B.img, 0, 0);
      stats = { cn, mx, my, tot: ow * oh };
    }
    function field() {
      const P = A.players, n = P.length, done = A.phase === 'done';
      const moving = P.some(p => Math.abs(p.ts.x - p.s.x) > .0012 || Math.abs(p.ts.y - p.s.y) > .0012 || Math.abs(p.tw - p.w) > .0015);
      if (moving) { hiValid = false; renderField(LO); cx.imageSmoothingEnabled = true; cx.drawImage(LO.c, 0, 0, W, H); }
      else { if (!hiValid) { renderField(HI); hiValid = true; } cx.drawImage(HI.c, 0, 0, W, H); }
      const t = total(), { cn, mx, my, tot } = stats; if (!cn || cn.length !== n) return;
      for (let i = 0; i < n; i++) {
        const p = P[i]; if (!cn[i]) continue; const tx = mx[i] / cn[i] * W, ty = my[i] / cn[i] * W; p.cx += (tx - p.cx) * .25; p.cy += (ty - p.cy) * .25;
        const m2 = Math.sqrt(cn[i] / tot) * W; if (m2 < 44) continue;
        const ar = Math.max(11, Math.min(m2 * .2, 26)), isW = done && A.win === p; cx.globalAlpha = done && !isW ? .45 : 1;
        const X = Math.min(W - 44, Math.max(44, p.cx)), Y = Math.min(H - ar - 30, Math.max(ar + 24, p.cy));
        cx.beginPath(); cx.arc(X, Y - 6, ar, 0, 6.283); cx.fillStyle = '#07140d'; cx.fill(); cx.lineWidth = 2.5; cx.strokeStyle = isW ? '#7bf0a8' : '#eafff3'; cx.stroke();
        if (isW) { const k = .5 + .5 * Math.sin(A.doneT * 6); cx.lineWidth = 3; cx.strokeStyle = 'rgba(123,240,168,' + (.25 + .5 * k) + ')'; cx.beginPath(); cx.arc(X, Y - 6, ar + 5 + k * 4, 0, 6.283); cx.stroke(); }
        cx.fillStyle = '#fff'; cx.font = '800 ' + Math.round(ar) + 'px Manrope,system-ui'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(p.name[0].toUpperCase(), X, Y - 5);
        const fs = 12, lb = fmt(p.bet, 0) + ' · ' + Math.round(p.bet / t * 100) + '%'; cx.font = '800 ' + fs + 'px Manrope,system-ui'; const lw = cx.measureText(lb).width + 16;
        cx.beginPath(); cx.roundRect ? cx.roundRect(X - lw / 2, Y + ar - 1, lw, fs + 10, (fs + 10) / 2) : cx.rect(X - lw / 2, Y + ar - 1, lw, fs + 10); cx.fillStyle = 'rgba(4,12,8,.72)'; cx.fill();
        cx.fillStyle = '#fff'; cx.fillText(lb, X, Y + ar + fs / 2 + 4);
        if (m2 > 90) { cx.font = '800 12px Manrope,system-ui'; cx.fillStyle = 'rgba(255,255,255,.88)'; cx.fillText(p === me ? 'Вы' : p.name, X, Y - ar - 14); }
        cx.globalAlpha = 1;
      }
      cx.textBaseline = 'alphabetic';
    }
    function puck(q) {
      const r = q.r, sc = A.phase === 'spin' ? Math.min(1, A.t * 4) : 1; cx.save(); cx.translate(q.x, q.y); cx.scale(sc, sc);
      const sh = cx.createRadialGradient(0, r * .35, r * .3, 0, r * .35, r * 1.5); sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = sh; cx.beginPath(); cx.arc(0, r * .35, r * 1.5, 0, 6.283); cx.fill();
      const rim = cx.createLinearGradient(-r, -r, r, r); rim.addColorStop(0, '#f2fff7'); rim.addColorStop(.45, '#7fb897'); rim.addColorStop(1, '#16301f');
      cx.beginPath(); cx.arc(0, 0, r, 0, 6.283); cx.fillStyle = rim; cx.fill();
      const fc = cx.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * .86); fc.addColorStop(0, '#2c4a39'); fc.addColorStop(1, '#06110b');
      cx.beginPath(); cx.arc(0, 0, r * .84, 0, 6.283); cx.fillStyle = fc; cx.fill();
      cx.strokeStyle = 'rgba(255,255,255,.22)'; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(0, 0, r * .6, 0, 6.283); cx.stroke();
      cx.strokeStyle = flash > 0 ? '#fff' : '#a6f7c6'; cx.lineWidth = 2.2; cx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = q.rot + i * 2.094; cx.beginPath(); cx.moveTo(Math.cos(a) * r * .62, Math.sin(a) * r * .62); cx.lineTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8); cx.stroke(); }
      cx.beginPath(); cx.arc(0, 0, r * .84, 3.5, 4.7); cx.strokeStyle = 'rgba(255,255,255,.4)'; cx.lineWidth = 2; cx.stroke(); cx.restore();
    }
    function draw() {
      cx.clearRect(0, 0, W, H); cx.fillStyle = '#060e09'; cx.fillRect(0, 0, W, H);
      if (!A.players.length) {
        const g = cx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * .6); g.addColorStop(0, '#12301f'); g.addColorStop(1, '#060e09'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
        cx.strokeStyle = 'rgba(255,255,255,.07)'; cx.lineWidth = 1; for (let i = 1; i < 6; i++) { cx.beginPath(); cx.arc(W / 2, H / 2, i * W * .09, 0, 6.283); cx.stroke(); }
        cx.fillStyle = 'rgba(255,255,255,.55)'; cx.font = '800 15px Manrope,system-ui'; cx.textAlign = 'center'; cx.fillText('Сделай ставку', W / 2, H / 2 + 5);
      } else field();
      const q = A.puck;
      if (q) {
        for (let i = 0; i < A.trail.length; i++) { const a = i / A.trail.length; cx.beginPath(); cx.arc(A.trail[i].x, A.trail[i].y, q.r * a * .85, 0, 6.283); cx.fillStyle = 'rgba(255,255,255,' + a * .2 + ')'; cx.fill(); }
        if (A.phase === 'spin') {
          const L = W * .1 + Math.sin(A.t * 8) * 1.5, c = Math.cos(A.ar), s = Math.sin(A.ar), sx = q.x + c * (q.r + 4), sy = q.y + s * (q.r + 4), ex = q.x + c * (q.r + 4 + L), ey = q.y + s * (q.r + 4 + L), hs = W * .026;
          cx.save(); cx.globalAlpha = Math.min(1, A.t * 4); cx.shadowColor = '#a6f7c6'; cx.shadowBlur = 10; cx.strokeStyle = cx.fillStyle = '#a6f7c6'; cx.lineWidth = 3; cx.lineCap = 'round';
          cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(ex, ey); cx.stroke();
          cx.beginPath(); cx.moveTo(ex + c * hs * 1.3, ey + s * hs * 1.3); cx.lineTo(ex + Math.cos(A.ar + 2.4) * hs * 1.2, ey + Math.sin(A.ar + 2.4) * hs * 1.2); cx.lineTo(ex + Math.cos(A.ar - 2.4) * hs * 1.2, ey + Math.sin(A.ar - 2.4) * hs * 1.2); cx.closePath(); cx.fill(); cx.restore();
        }
        puck(q);
      }
      if (flash > 0) { cx.lineWidth = 4; cx.strokeStyle = 'rgba(255,255,255,' + flash * .5 + ')'; cx.strokeRect(2, 2, W - 4, H - 4); }
    }
    function loop(n) { if (!alive) return; raf = requestAnimationFrame(loop); const dt = Math.min(.05, (n - last) / 1000); last = n; flash = Math.max(0, flash - dt * 4); step(dt); draw(); }
    window.addEventListener('resize', () => { if (alive) { size(); } });
    size(); ui(); raf = requestAnimationFrame(loop);
  }
  return { open };
})();
