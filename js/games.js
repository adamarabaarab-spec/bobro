/* ============ ИГРЫ: общие ставки + Слоты ============ */
const BETS = [5, 10, 25, 50, 100, 250, 500, 1000];
function betHTML() {
  return `<div class="bet"><button class="pm" data-d="-1">−</button><div class="bv">${COIN}<span class="betV">10</span></div><button class="pm" data-d="1">+</button></div>
  <div class="chips">${[10, 50, 100, 500].map(v => `<button data-v="${v}">${v}</button>`).join('')}<button data-v="max">Макс</button></div>`;
}
function bindBet(root, st, isLocked) {
  const paint = () => { $$('.betV', root).forEach(e => e.textContent = fmt(st.bet, 0)); $$('.chips button', root).forEach(b => b.classList.toggle('on', +b.dataset.v === st.bet)); };
  $$('.pm', root).forEach(b => b.onclick = () => { if (isLocked()) return; let i = BETS.indexOf(st.bet); if (i < 0) i = BETS.findIndex(x => x >= st.bet); i = Math.max(0, Math.min(BETS.length - 1, i + +b.dataset.d)); st.bet = BETS[i]; hap('select'); paint(); });
  $$('.chips button', root).forEach(b => b.onclick = () => { if (isLocked()) return; st.bet = b.dataset.v === 'max' ? Math.max(5, Math.min(1000, Math.floor(S.bal))) : +b.dataset.v; hap('select'); paint(); });
  paint(); return paint;
}

/* ================= СЛОТЫ =================
   Поле 6×5, выплата за 8+ одинаковых подарков где угодно, каскады, «Бонус» → суперспины с кристаллами-иксами. */
const Slots = (() => {
  const E = SlotEngine, P = E.P, COLS = E.COLS, ROWS = E.ROWS, GAP = 5, PAD = 8, SPEEDS = [1, .55, .3];
  const CRC = { 2: '#7cc8ff', 3: '#8f9bff', 5: '#c58bff', 10: '#ff7ad9', 15: '#ffb35c', 25: '#ffe36a' };
  const crysSVG = v => `<svg viewBox="0 0 48 56"><defs><linearGradient id="cg${v}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="${CRC[v]}"/><stop offset="1" stop-color="#6a4bd8"/></linearGradient></defs><path d="M24 2 42 16 36 46 24 54 12 46 6 16Z" fill="url(#cg${v})" stroke="rgba(255,255,255,.7)" stroke-width="1.4" stroke-linejoin="round"/><path d="M24 2 18 22 24 54 30 22Z M6 16 18 22 12 46 M42 16 30 22 36 46" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/></svg><b>x${v}</b>`;
  const tileHTML = id => E.isCr(id) ? crysSVG(E.CRYS[id - E.CR0].v) : id === E.SCATTER ? giftImg(E.SCATTER_G) + '<em>БОНУС</em>' : giftImg(E.SYM[id].g);
  const tileCls = id => E.isCr(id) ? 'cr' : id === E.SCATTER ? 'sc' : 's' + id;

  function open() {
    const st = { bet: 10 }; let busy = false, speed = 0, alive = true, board = null, cell = 0, winShown = 0, dc = false, auto = false, fs = null;
    const body = Sub.open('Слоты', `
      <div class="sl-top"><div class="sl-win" id="slWin"><small>Выигрыш</small><b>${COIN}<span id="slWinV">0</span></b></div><div class="sl-mult" id="slMult" style="visibility:hidden">x1</div><button class="sl-q" id="slRules" aria-label="Правила">?</button></div>
      <div class="sl-wrap" id="slw"><div class="sl-leds" id="leds"></div><div class="sx-board" id="board"><div class="sx-grid">${'<i></i>'.repeat(COLS * ROWS)}</div><div class="sx-tiles" id="tiles"></div><div class="sx-fx" id="fx"></div></div></div>
      <div class="sl-ctl">
        <div class="sl-fsbar" id="fsBar" style="display:none"><small>Общий выигрыш</small><b>${COIN}<span id="fsTot">0</span></b></div>
        <div id="betBox">${betHTML()}</div>
        <div class="sl-opts"><button class="sl-opt" id="spdB">Скорость <b id="spdV">1x</b></button><button class="sl-opt" id="autoB">Автоспин <b id="autoV">выкл</b></button></div>
        <div class="sl-main" id="mainRow">
          <button class="sl-buy" id="buyB">Купить бонус<b>${COIN}<span id="buyP">480</span></b></button>
          <button class="spinbtn" id="spinB" aria-label="Крутить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/></svg></button>
          <button class="sl-dc" id="dcB"><span class="switch" id="dcSw"></span><span>Двойной шанс<b>Ставка ${COIN}<span id="dcP">12,5</span></b></span></button></div>
        <div class="sl-fsleft" id="fsLeft" style="display:none"></div></div>`,
      { bg: .16, onClose: () => { alive = false; auto = false; } });
    const wrapEl = $('#slw', body), boardEl = $('#board', body), tilesEl = $('#tiles', body), fxEl = $('#fx', body), spinB = $('#spinB', body);
    { let h = ''; const PN = 32; for (let i = 0; i < PN; i++) { const t = i / PN * 4, side = Math.floor(t), f = t - side, x = side === 0 ? f : side === 1 ? 1 : side === 2 ? 1 - f : 0, y = side === 0 ? 0 : side === 1 ? f : side === 2 ? 1 : 1 - f; h += `<i style="left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;animation-delay:${(-i * .09).toFixed(2)}s"></i>`; } $('#leds', body).innerHTML = h; }
    const repaintBet = bindBet(body, st, () => busy || !!fs);
    const upd = () => { $('#buyP', body).textContent = fmt(st.bet * P.BUY, 0); $('#dcP', body).textContent = fmt(st.bet * P.DC); };
    $$('.pm,.chips button', body).forEach(b => b.addEventListener('click', upd)); upd();
    const T = ms => sleep(ms * SPEEDS[speed]);
    const pos = (r, c) => `translate(${c * (cell + GAP)}px,${r * (cell + GAP)}px)`;
    const size = () => {
      const w = boardEl.clientWidth; cell = (w - PAD * 2 - GAP * (COLS - 1)) / COLS; boardEl.style.height = (PAD * 2 + ROWS * cell + (ROWS - 1) * GAP) + 'px';
      boardEl.style.setProperty('--cell', cell + 'px');
    };
    const mk = (id, r, c) => { const d = document.createElement('div'); d.className = 'sx ' + tileCls(id); d.style.width = d.style.height = cell + 'px'; d.style.transform = pos(r, c); d.dataset.s = id; d.innerHTML = tileHTML(id); tilesEl.appendChild(d); return d; };
    const setWin = v => { const el = $('#slWinV', body), from = winShown; winShown = v; const t0 = performance.now(), dur = 450 * SPEEDS[speed]; const f = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(from + (v - from) * k); if (k < 1 && alive) requestAnimationFrame(f); }; requestAnimationFrame(f); const w = $('#slWin', body); w.classList.remove('pulse'); void w.offsetWidth; if (v > from) w.classList.add('pulse'); };
    const setMult = m => { const el = $('#slMult', body); el.style.visibility = m ? 'visible' : 'hidden'; if (m) { el.textContent = 'x' + m; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } };

    function calm() { for (let i = 0; i < 40; i++) { const b = E.genBoard(Math.random, {}); const cnt = {}; b.flat().forEach(x => cnt[x] = (cnt[x] || 0) + 1); if (Object.values(cnt).every(n => n < P.MIN)) return b; } return E.genBoard(Math.random, {}); }
    function initBoard() {
      size(); tilesEl.innerHTML = ''; board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      const b = calm(); for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) board[r][c] = mk(b[r][c], r, c);
    }
    initBoard();
    /* при смене размера окна только перераскладываем плитки — новая «прокрутка» сама не запускается */
    const onResize = () => { if (!alive) return window.removeEventListener('resize', onResize); size(); for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const el = board[r] && board[r][c]; if (el) { el.style.width = el.style.height = cell + 'px'; el.style.transform = pos(r, c); } } };
    window.addEventListener('resize', onResize);

    async function clearOld() {
      const els = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c]) els.push([board[r][c], c]);
      els.forEach(([el, c]) => { el.style.transitionDelay = (c * 35) * SPEEDS[speed] + 'ms'; el.style.transform += ' translateY(' + (ROWS + 2) * (cell + GAP) + 'px)'; el.style.opacity = 0; });
      await T(480); els.forEach(([el]) => el.remove());
    }
    async function dropIn(b) {
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) board[r][c] = mk(b[r][c], r - ROWS - 1, c);
      void tilesEl.offsetWidth;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const el = board[r][c]; el.style.transitionDelay = (c * 60 + (ROWS - r) * 22) * SPEEDS[speed] + 'ms'; el.style.transform = pos(r, c); }
      sfx.whoosh(.4 * SPEEDS[speed] + .2); for (let c = 0; c < COLS; c++) sfx.thud(c, (.3 + c * .06) * SPEEDS[speed]);
      await T(1000); $$('.sx', tilesEl).forEach(e => e.style.transitionDelay = '0ms');
    }
    async function landScat() {                      // «Бонус»-символы: ноты по нарастающей
      const sc = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c] && +board[r][c].dataset.s === E.SCATTER) sc.push(board[r][c]);
      for (let i = 0; i < sc.length; i++) { sc[i].classList.add('land'); sfx.scat(i); hap('light'); await T(260); }
      setTimeout(() => sc.forEach(e => e.classList.remove('land')), 900);
    }
    const center = (r, c) => [PAD + c * (cell + GAP) + cell / 2, PAD + r * (cell + GAP) + cell / 2];
    function pill(cells, txt, cls = '') {
      const sx = cells.reduce((a, [r, c]) => a + center(r, c)[0], 0) / cells.length, sy = cells.reduce((a, [r, c]) => a + center(r, c)[1], 0) / cells.length;
      const f = document.createElement('div'); f.className = 'sx-pill ' + cls; f.innerHTML = txt; f.style.left = sx + 'px'; f.style.top = sy + 'px'; fxEl.appendChild(f); setTimeout(() => f.remove(), 1500 * SPEEDS[speed] + 500);
    }

    /* одна прокрутка. Возвращает {total, scat} */
    async function runSpin(o = {}) {
      const res = E.play(Math.random, { fs: !!fs, mult: fs ? fs.mult : 1, dc, buy: !!o.buy });
      fxEl.innerHTML = ''; setWin(0); if (fs) setMult(fs.mult); else setMult(0);
      await clearOld(); await dropIn(res.first); if (!alive) return null;
      if (res.first.flat().includes(E.SCATTER)) await landScat();
      let acc = 0, n = 0;
      for (const step of res.steps) {
        if (!alive) return null; n++;
        const win = new Set(step.win.map(w => w.sym));
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const el = board[r][c]; if (el) el.classList.add(step.gone[r][c] ? 'hit' : 'dim'); }
        step.win.forEach(w => { const cells = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (step.gone[r][c] && step.board[r][c] === w.sym) cells.push([r, c]); pill(cells, '+' + fmt(w.pay * st.bet)); });
        acc += step.stepRaw * st.bet; sfx.chime(n); sfx.coins(3 + Math.min(10, n * 2)); hap('light');
        wrapEl.classList.add('win'); setTimeout(() => wrapEl.classList.remove('win'), 900);
        setWin(acc); await T(950);
        step.gone.forEach((row, r) => row.forEach((g, c) => { if (g) { const el = board[r][c]; el.style.setProperty('--tf', el.style.transform); el.classList.add('pop'); } }));
        step.win.forEach((w, k) => sfx.pah(k * .05)); await T(330); fxEl.innerHTML = '';
        $$('.sx.dim', tilesEl).forEach(e => e.classList.remove('dim'));
        const nb = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        step.moves.forEach((col, c) => col.forEach(m => { let el; if (m.isNew) el = mk(m.s, m.from, c); else el = board[m.from][c]; nb[m.to][c] = el; }));
        step.gone.forEach((row, r) => row.forEach((g, c) => { if (g) board[r][c].remove(); }));
        board = nb; void tilesEl.offsetWidth;
        step.moves.forEach((col, c) => col.forEach(m => { const el = board[m.to][c]; el.style.transitionDelay = (m.isNew ? 50 + (ROWS - m.to) * 16 : 0) * SPEEDS[speed] + 'ms'; el.style.transform = pos(m.to, c); }));
        for (let c = 0; c < COLS; c++) sfx.thud(c, (.1 + c * .04) * SPEEDS[speed]);
        await T(720); $$('.sx', tilesEl).forEach(e => e.style.transitionDelay = '0ms');
      }
      let total = res.total * st.bet;
      /* кристаллы-иксы: в бонусе складываются в общий множитель и умножают выигрыш спина */
      if (fs && res.crys.length) {
        const cr = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c] && E.isCr(+board[r][c].dataset.s)) cr.push([board[r][c], r, c]);
        if (res.raw > 0) {
          let m = fs.mult; for (let i = 0; i < cr.length; i++) { const v = E.CRYS[+cr[i][0].dataset.s - E.CR0].v; cr[i][0].classList.add('zap'); sfx.zap(i); hap('medium'); m += v; setMult(m); await T(420); }
          fs.mult = res.mult; setWin(total); if (cr.length) { pill([[ROWS / 2 - .5, COLS / 2 - .5]], 'x' + fs.mult, 'big'); await T(700); }
        }
      }
      if (total > 0) { const cap = P.CAP * st.bet - (fs ? fs.total : 0); if (total > cap) total = Math.max(0, cap); addBal(total); }
      if (fs) { fs.total += total; $('#fsTot', body).textContent = fmt(fs.total); }
      setWin(total);
      let scat = res.scat; return { total, scat, steps: res.steps.length };
    }
    function bigWin(v) {
      const x = v / st.bet; if (x < 12) return Promise.resolve();
      const t = x >= 100 ? 'МЕГА ВЫИГРЫШ' : x >= 40 ? 'ОГРОМНЫЙ ВЫИГРЫШ' : 'ОТЛИЧНО!';
      const el = document.createElement('div'); el.className = 'bigwin'; el.innerHTML = `<div><h4>${t}</h4><b>${COIN}${fmt(v)}</b><small>x${fmt(x, 1)}</small></div>`; boardEl.appendChild(el); sfx.big(); sfx.coins(14); hap('success');
      return sleep(2200 * SPEEDS[speed] + 600).then(() => el.remove());
    }
    function lock(v) { busy = v; wrapEl.classList.toggle('spin', v); spinB.classList.toggle('spinning', v); $('#buyB', body).disabled = v || !!fs; $('#dcB', body).disabled = v || !!fs; }
    const syncDC = () => { $('#dcSw', body).classList.toggle('on', dc); $('#dcB', body).classList.toggle('on', dc); upd(); };

    async function runFS(count) {
      fs = { left: count, mult: 1, total: 0, played: 0 };
      wrapEl.classList.add('fs'); $('#betBox', body).style.display = 'none'; $('#fsBar', body).style.display = ''; $('#mainRow', body).querySelectorAll('.sl-buy,.sl-dc').forEach(e => e.style.visibility = 'hidden'); $('#fsLeft', body).style.display = ''; $('#fsTot', body).textContent = '0'; setMult(1);
      const w = pop(`<div class="res r-legend"><div class="res-t">Бонус</div><div class="res-g">${giftImg(E.SCATTER_G)}</div><h3>${count} суперспинов!</h3><p class="ps" style="margin:10px 0 18px">Выпадают кристаллы-иксы. Они складываются в общий множитель и не сбрасываются до конца бонуса.</p><button class="btn gold block" data-close>Поехали</button></div>`, { type: 'modal' }); w.locked = true; sfx.big(); hap('success');
      await new Promise(r => { $('[data-close]', w).addEventListener('click', r, { once: true }); });
      while (fs.left > 0 && alive) {
        fs.left--; fs.played++; $('#fsLeft', body).textContent = `Суперспины: ${fs.left + 1}`;
        const r = await runSpin(); if (!r) return;
        if (r.scat >= 3) { fs.left += P.RETRIG; toast(`+${P.RETRIG} суперспинов!`); sfx.big(); }
        $('#fsLeft', body).textContent = `Суперспины: ${fs.left}`; await T(500);
      }
      const tot = fs.total; fs = null; wrapEl.classList.remove('fs'); $('#betBox', body).style.display = ''; $('#fsBar', body).style.display = 'none'; $('#fsLeft', body).style.display = 'none'; $('#mainRow', body).querySelectorAll('.sl-buy,.sl-dc').forEach(e => e.style.visibility = ''); setMult(0);
      logH('slot', 'Слоты · суперспины', tot);
      const w2 = pop(`<div class="res r-legend"><div class="res-t">Итог бонуса</div><div class="res-g">${giftImg(15)}</div><div class="pr" style="font-size:26px">${COIN}${fmt(tot)}</div><button class="btn gold block" data-close>Забрать</button></div>`, { type: 'modal' }); sfx.big(); sfx.coins(16); hap('success');
      await new Promise(r => { w2.onclose = r; });
    }

    async function spin(buy) {
      if (busy) return; const cost = buy ? st.bet * P.BUY : st.bet * (dc ? P.DC : 1); if (!canPay(cost)) { auto = false; paintAuto(); return; }
      lock(true); addBal(-cost); S.stats.spins++; S.stats.rounds++; addXP(Math.max(1, Math.round(cost / 10))); hap('medium');
      let bonus = false;
      if (buy) { await runBuy(); bonus = true; }
      else {
        const r = await runSpin();
        if (r) { if (r.total > 0) { await bigWin(r.total); if (r.total >= st.bet * 5) logH('slot', 'Слоты: x' + fmt(r.total / st.bet, 1), r.total); } if (r.scat >= 3) { bonus = true; await runFS(P.FS); } }
      }
      if (alive) { lock(false); if (S.bal < st.bet) { st.bet = BETS.filter(b => b <= Math.max(5, S.bal)).pop() || 5; repaintBet(); upd(); }
        if (auto && !bonus) setTimeout(() => { if (alive && auto && !busy) spin(false); }, 350 * SPEEDS[speed]); else if (bonus) { auto = false; paintAuto(); } }
    }
    async function runBuy() { fxEl.innerHTML = ''; setWin(0); await clearOld(); await dropIn(E.genBoard(Math.random, { buy: true })); await landScat(); await T(400); await runFS(P.FS); }

    spinB.onclick = () => { if (busy) return; spin(false); };
    $('#buyB', body).onclick = () => { if (busy || fs) return; const cost = st.bet * P.BUY; if (!canPay(cost)) return; const w = pop(`<h3 class="pt">Купить бонус</h3><p class="ps">${P.FS} суперспинов с кристаллами-иксами за ${fmt(cost, 0)} ${CFG.CURRENCY}. Три «Бонус» на поле гарантированы.</p><div class="row"><button class="btn ghost sp" data-close>Отмена</button><button class="btn gold sp" id="okBuy">Купить</button></div>`, { type: 'modal' }); $('#okBuy', w).onclick = () => { w.close(); spin(true); }; };
    $('#dcB', body).onclick = () => { if (busy || fs) return; dc = !dc; hap('select'); syncDC(); };
    $('#spdB', body).onclick = () => { speed = (speed + 1) % SPEEDS.length; $('#spdV', body).textContent = ['1x', '2x', '3x'][speed]; hap('select'); };
    const paintAuto = () => { $('#autoV', body).textContent = auto ? 'вкл' : 'выкл'; $('#autoB', body).classList.toggle('on', auto); };
    $('#autoB', body).onclick = () => { auto = !auto; paintAuto(); hap('select'); if (auto && !busy) spin(false); };

    /* ---- правила ---- */
    const symGrid = n => E.SYM.map((s, i) => `<div class="pt-row">${giftImg(s.g)}<span>×${fmt(E.payFor(i, n), E.payFor(i, n) >= 10 ? 0 : 2)}</span></div>`).join('');
    $('#slRules', body).onclick = () => {
      const cnts = [8, 9, 10, 11, 12, 13, 14];
      const w = pop(`<div class="sl-rules"><h3 class="pt">Правила</h3>
        <div class="rl-card"><b>Как выиграть</b><p>Выигрыш дают ${P.MIN} и больше одинаковых подарков в любом месте поля. Выигравшие подарки исчезают, сверху падают новые — каскады продолжаются, пока есть выигрыш.</p></div>
        <div class="rl-card"><b>Таблица выплат</b><p>Множители ставки за количество одинаковых подарков.</p><div class="rl-tabs">${cnts.map((n, i) => `<button data-n="${n}" class="${i ? '' : 'on'}">${n}${n === 14 ? '+' : ''}</button>`).join('')}</div><div class="pt-grid" id="ptG">${symGrid(8)}</div></div>
        <div class="rl-card"><b>Суперспины</b><p>3 и больше символов «Бонус» на поле запускают ${P.FS} суперспинов. Во время них ещё 3 «Бонус» добавляют ${P.RETRIG} спинов.</p></div>
        <div class="rl-card"><b>Кристаллы-иксы</b><p>Выпадают только в суперспинах. Если спин выигрышный, иксы всех кристаллов на поле складываются в общий множитель, он растёт весь бонус и умножает выигрыши.</p><div class="rl-chips">${E.CRYS.map(c => `<span>x${c.v} · ${c.w}%</span>`).join('')}</div></div>
        <div class="rl-card"><b>Двойной шанс</b><p>Спин дороже на ${Math.round((P.DC - 1) * 100)}%, зато «Бонус» выпадает примерно вдвое чаще.</p></div>
        <div class="rl-card"><b>Покупка бонуса</b><p>Сразу запускает суперспины за ${P.BUY} ставок: на поле гарантированно 3 «Бонус».</p></div>
        <div class="rl-card"><b>Лимит</b><p>Максимальный выигрыш за один спин — ${fmt(P.CAP, 0)} ставок. RTP около 95%.</p></div>
        <button class="btn gold block" data-close style="margin-top:12px">Понятно</button></div>`, { type: 'sheet' });
      $$('.rl-tabs button', w).forEach(b => b.onclick = () => { $$('.rl-tabs button', w).forEach(x => x.classList.toggle('on', x === b)); $('#ptG', w).innerHTML = symGrid(+b.dataset.n); });
    };
  }
  return { open };
})();
