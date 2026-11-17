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

/* ================= ПОДАРОЧНЫЙ КАСКАД ================= */
const Slots = (() => {
  const E = SlotEngine, GAP = 6, N = E.N;
  const gOf = s => s === E.SCATTER ? E.SCATTER_G : E.SYM[s].g;
  function open() {
    const st = { bet: 10 }; let busy = false, turbo = false, alive = true, board = null, cell = 0, winShown = 0;
    let fs = null; // {left,mult,total,done}
    const body = Sub.open('Слоты', `
      <div class="sl-top"><div class="sl-win" id="slWin"><small>Выигрыш</small><b>${COIN}<span id="slWinV">0</span></b></div><div class="sl-mult" id="slMult" style="visibility:hidden">x1</div></div>
      <div class="sl-board" id="board"><div class="sl-grid">${'<i></i>'.repeat(25)}</div><div class="sl-tiles" id="tiles"></div><svg class="sl-svg" id="fx"></svg></div>
      <div class="sl-ctl"><div class="sl-main">
        <button class="sl-buy" id="buyB">Купить бонус<b>${COIN}<span id="buyP">400</span></b></button>
        <button class="spinbtn" id="spinB" aria-label="Крутить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/></svg></button>
        <button class="sl-turbo" id="turboB">Турбо<b>выкл</b></button></div>
        ${betHTML()}</div>`,
      { bg: .16, onClose: () => { alive = false; } });
    const tilesEl = $('#tiles', body), boardEl = $('#board', body), fx = $('#fx', body), spinB = $('#spinB', body);
    const repaintBet = bindBet(body, st, () => busy);
    const upd = () => { $('#buyP', body).textContent = fmt(st.bet * 40, 0); };
    $$('.pm,.chips button', body).forEach(b => b.addEventListener('click', upd)); upd();
    const T = ms => sleep(ms * (turbo ? .45 : 1));
    const size = () => { const w = tilesEl.clientWidth; cell = (w - GAP * (N - 1)) / N; fx.setAttribute('viewBox', `0 0 ${w} ${w}`); };
    const pos = (r, c) => `translate(${c * (cell + GAP)}px,${r * (cell + GAP)}px)`;
    const mk = (s, r, c) => {
      const d = document.createElement('div'); d.className = 'tile s' + s; d.style.width = d.style.height = cell + 'px';
      d.style.transform = pos(r, c); d.dataset.s = s; d.innerHTML = giftImg(gOf(s)); tilesEl.appendChild(d); return d;
    };
    const setWin = v => { const el = $('#slWinV', body); const from = winShown; winShown = v; const t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / 450); el.textContent = fmt(from + (v - from) * k); if (k < 1 && alive) requestAnimationFrame(f); }; requestAnimationFrame(f); $('#slWin', body).classList.remove('pulse'); void $('#slWin', body).offsetWidth; if (v > from) $('#slWin', body).classList.add('pulse'); };
    const setMult = m => { const el = $('#slMult', body); el.style.visibility = m ? 'visible' : 'hidden'; if (m) el.textContent = 'Множитель x' + m; };

    function initBoard() {
      size(); tilesEl.innerHTML = ''; board = Array.from({ length: N }, () => Array(N).fill(null));
      const b = E.genBoard(Math.random, false);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) board[r][c] = mk(b[r][c], r, c);
    }
    initBoard(); window.addEventListener('resize', () => { if (!busy && alive) initBoard(); });

    async function clearOld() {
      const els = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c]) els.push([board[r][c], c]);
      els.forEach(([el, c]) => { el.style.transitionDelay = (c * 40) * (turbo ? .4 : 1) + 'ms'; el.style.transform += ' translateY(' + (N + 2) * (cell + GAP) + 'px)'; el.style.opacity = 0; });
      await T(520); els.forEach(([el]) => el.remove());
    }
    async function dropIn(b) {
      board = Array.from({ length: N }, () => Array(N).fill(null));
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const el = mk(b[r][c], r - N - 1, c); board[r][c] = el; }
      void tilesEl.offsetWidth;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const el = board[r][c]; el.style.transitionDelay = ((c * 55 + (N - r) * 25)) * (turbo ? .4 : 1) + 'ms'; el.style.transform = pos(r, c); }
      sfx.drop(); await T(900); $$('.tile', tilesEl).forEach(e => e.style.transitionDelay = '0ms');
    }
    const center = (r, c) => [c * (cell + GAP) + cell / 2, r * (cell + GAP) + cell / 2];
    function bolt(cells) {
      const left = cells.slice(), path = [left.shift()]; while (left.length) { const l = path[path.length - 1]; left.sort((a, b) => (Math.abs(a[0] - l[0]) + Math.abs(a[1] - l[1])) - (Math.abs(b[0] - l[0]) + Math.abs(b[1] - l[1]))); path.push(left.shift()); }
      const pts = path.map(([r, c]) => center(r, c)); let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; for (let k = 1; k <= 2; k++) { const t = k / 3; d += ` L${x0 + (x1 - x0) * t + rnd(-7, 7)},${y0 + (y1 - y0) * t + rnd(-7, 7)}`; } d += ` L${x1},${y1}`; }
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('stroke-width', 3.2);
      p.setAttribute('stroke', fs ? '#ffe39a' : '#ffd0f1'); fx.appendChild(p); const len = p.getTotalLength(); p.style.setProperty('--len', len); return pts;
    }
    function floatText(cells, txt) {
      const sx = cells.reduce((a, [r, c]) => a + center(r, c)[0], 0) / cells.length, sy = cells.reduce((a, [r, c]) => a + center(r, c)[1], 0) / cells.length;
      const f = document.createElement('div'); f.className = 'floatwin'; f.textContent = '+' + txt; f.style.left = sx + 8 + 'px'; f.style.top = sy + 8 + 'px'; boardEl.appendChild(f); setTimeout(() => f.remove(), 1200);
    }

    /* одна прокрутка: возвращает {total (в монетах), scat} */
    async function runSpin() {
      const res = E.play(Math.random, { fs: !!fs, fsMult: fs ? fs.mult : 1 });
      fx.innerHTML = ''; setWin(fs ? fs.total : 0); if (fs) setMult(fs.mult); else setMult(0);
      await clearOld(); await dropIn(res.first);
      let acc = 0, n = 0;
      for (const step of res.steps) {
        n++; step.clusters.forEach(cl => { cl.cells.forEach(([r, c]) => board[r][c].classList.add('win')); bolt(cl.cells); floatText(cl.cells, fmt(cl.mult * step.stepMult * st.bet)); });
        const stepWin = step.win * st.bet; acc += stepWin; sfx.win(); hap('light');
        addBal(stepWin); setWin((fs ? fs.total : 0) + acc); if (fs) fs.total += 0;
        if (!fs && n > 0) setMult(step.stepMult > 1 || res.steps.length > 1 ? step.stepMult : 0);
        await T(950);
        step.clusters.forEach(cl => cl.cells.forEach(([r, c]) => { const el = board[r][c]; el.style.setProperty('--tf', el.style.transform); el.classList.add('pop'); }));
        sfx.pop(); await T(330); fx.innerHTML = '';
        step.clusters.forEach(cl => cl.cells.forEach(([r, c]) => { board[r][c].remove(); board[r][c] = null; }));
        const nb = Array.from({ length: N }, () => Array(N).fill(null));
        step.moves.forEach((col, c) => col.forEach(m => {
          let el; if (m.isNew) el = mk(m.s, m.from, c); else el = board[m.from][c];
          nb[m.to][c] = el; if (m.isNew) { void el.offsetWidth; }
        }));
        board = nb; void tilesEl.offsetWidth;
        step.moves.forEach((col, c) => col.forEach(m => { const el = board[m.to][c]; el.style.transitionDelay = (m.isNew ? 60 + (N - m.to) * 18 : 0) * (turbo ? .4 : 1) + 'ms'; el.style.transform = pos(m.to, c); }));
        sfx.drop(); await T(780); $$('.tile', tilesEl).forEach(e => e.style.transitionDelay = '0ms');
        if (!alive) return null;
      }
      if (fs) { fs.mult = res.endMult; fs.total += acc; }
      return { total: acc, scat: res.scat, steps: res.steps.length };
    }
    function bigWin(v) {
      const x = v / st.bet; if (x < 10) return Promise.resolve();
      const t = x >= 60 ? 'МЕГА ВЫИГРЫШ' : x >= 25 ? 'ОГРОМНЫЙ ВЫИГРЫШ' : 'ОТЛИЧНО!';
      const el = document.createElement('div'); el.className = 'bigwin'; el.innerHTML = `<div><h4>${t}</h4><b>${COIN}${fmt(v)}</b></div>`; boardEl.appendChild(el); sfx.big(); hap('success');
      return sleep(2000).then(() => el.remove());
    }
    function lock(v) { busy = v; spinB.disabled = v; spinB.classList.toggle('spinning', v); $('#buyB', body).disabled = v; }

    async function runFS(count) {
      fs = { left: count, mult: 1, total: 0, played: 0 }; boardEl.classList.add('fs');
      const w = pop(`<div class="res r-legend"><div class="res-t">Бонус</div><div class="res-g">${giftImg(110)}</div><h3>${count} фриспинов!</h3><p class="ps" style="margin:10px 0 18px">Множитель растёт после каждого выигрышного каскада и не сбрасывается.</p><button class="btn gold block" data-close>Поехали</button></div>`, { type: 'modal' }); w.locked = true; sfx.big(); hap('success');
      await new Promise(r => { $('[data-close]', w).addEventListener('click', r, { once: true }); });
      while (fs.left > 0 && alive) {
        fs.left--; fs.played++;
        let badge = $('.fsbadge', boardEl); if (!badge) { badge = document.createElement('div'); badge.className = 'fsbadge'; boardEl.appendChild(badge); }
        badge.textContent = `Фриспин ${fs.played} / ${fs.played + fs.left} · x${fs.mult}`;
        const r = await runSpin(); if (!r) return;
        if (r.scat >= 3) { fs.left += 4; toast('+4 фриспина!'); }
        badge.textContent = `Фриспин ${fs.played} / ${fs.played + fs.left} · x${fs.mult}`; await T(450);
      }
      const tot = fs.total; $('.fsbadge', boardEl) && $('.fsbadge', boardEl).remove(); boardEl.classList.remove('fs'); fs = null; setMult(0);
      logH('slot', 'Каскад · фриспины', tot);
      const w2 = pop(`<div class="res r-legend"><div class="res-t">Итог бонуса</div><div class="res-g">${giftImg(15)}</div><div class="pr" style="font-size:26px">${COIN}${fmt(tot)}</div><button class="btn gold block" data-close>Забрать</button></div>`, { type: 'modal' }); sfx.big(); hap('success');
      await new Promise(r => { w2.onclose = r; });
    }

    async function spin(buy) {
      if (busy) return; const cost = buy ? st.bet * 40 : st.bet; if (!canPay(cost)) return;
      lock(true); addBal(-cost); S.stats.spins++; S.stats.rounds++; addXP(Math.max(1, Math.round(cost / 10))); hap('medium');
      if (buy) { await clearOld(); await dropIn(E.genBoard(Math.random, false)); await runFS(8); }
      else {
        const r = await runSpin();
        if (r) { if (r.total > 0) { await bigWin(r.total); if (r.total >= st.bet * 5) logH('slot', 'Каскад: x' + fmt(r.total / st.bet, 1), r.total); } if (r && r.scat >= 3) await runFS(8); }
      }
      if (alive) { lock(false); if (S.bal < st.bet) { st.bet = BETS.filter(b => b <= Math.max(5, S.bal)).pop() || 5; repaintBet(); upd(); } }
    }
    spinB.onclick = () => spin(false);
    $('#buyB', body).onclick = () => { if (busy) return; if (!canPay(st.bet * 40)) return; const w = pop(`<h3 class="pt">Купить бонус</h3><p class="ps">8 фриспинов с растущим множителем за ${fmt(st.bet * 40, 0)} ${CFG.CURRENCY}.</p><div class="row"><button class="btn ghost sp" data-close>Отмена</button><button class="btn gold sp" id="okBuy">Купить</button></div>`, { type: 'modal' }); $('#okBuy', w).onclick = () => { w.close(); spin(true); }; };
    $('#turboB', body).onclick = e => { turbo = !turbo; e.currentTarget.classList.toggle('on', turbo); $('b', e.currentTarget).textContent = turbo ? 'вкл' : 'выкл'; boardEl.classList.toggle('turbo', turbo); };
  }
  return { open };
})();
