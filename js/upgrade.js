/* ============ АПГРЕЙД ============
   Ставишь подарки и/или баланс → выбираешь цель дороже → стрелка крутится.
   Шанс = ставка / цена цели × 0.95 (макс. 95%). Попал в золотую зону — цель твоя. */
const Upgrade = (() => {
  const EDGE = .95, MULTS = [1.5, 2, 3, 5, 10, 25], STAKES = [0, 50, 200, 1000];
  const R = 100, CIRC = 2 * Math.PI * R;
  const SORTED = G.slice().sort((a, b) => a.price - b.price);

  function open() {
    let sel = new Set(), stake = 0, target = null, mult = null, tab = 'mine', busy = false, alive = true, ang = 0;
    const src = () => stake + [...sel].reduce((a, u) => { const it = S.inv.find(x => x.u === u); return a + (it ? G[it.g].price : 0); }, 0);
    const chance = () => { const s = src(); return target && s > 0 && target.price > s ? Math.min(.95, Math.max(.005, s / target.price * EDGE)) : 0; };

    const ticks = Array.from({ length: 72 }, (_, i) => { const a = i * 5 * Math.PI / 180, l = i % 6 === 0 ? 9 : 5; return `<line x1="${120 + Math.sin(a) * 116}" y1="${120 - Math.cos(a) * 116}" x2="${120 + Math.sin(a) * (116 - l)}" y2="${120 - Math.cos(a) * (116 - l)}"/>`; }).join('');
    const body = Sub.open('Апгрейд', `
      <div class="up-stage" id="upSt">
        <div class="up-ring" id="upRing">
          <svg viewBox="0 0 240 240"><defs>
            <linearGradient id="ugG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9ffe8"/><stop offset=".5" stop-color="#5fe394"/><stop offset="1" stop-color="#12894d"/></linearGradient>
            <linearGradient id="ugN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#9d7bff"/></linearGradient></defs>
            <g class="up-ticks">${ticks}</g>
            <circle cx="120" cy="120" r="${R}" class="up-track"/>
            <circle cx="120" cy="120" r="${R}" class="up-lose"/>
            <circle cx="120" cy="120" r="${R}" class="up-win" id="upArc" stroke-dasharray="0 ${CIRC}" transform="rotate(-90 120 120)"/>

          </svg>
          <div class="up-needle" id="upNeedle"><b></b><i></i></div>
          <div class="up-core"><div class="up-tg" id="upTg"><span class="up-q">?</span></div><b class="up-pc" id="upPc">0%</b></div>
        </div>
        <div class="up-pair">
          <div class="up-slot" id="upFrom"><div class="up-th" id="upFromT"></div><b id="upFromV">${COIN}0</b></div>
          <div class="up-arrows"><i></i><i></i><i></i></div>
          <div class="up-slot" id="upTo"><div class="up-th" id="upToT"></div><b id="upToV">${COIN}0</b></div>
        </div>
        <div class="up-mult chips" id="upMult">${MULTS.map(m => `<button data-m="${m}">x${m}</button>`).join('')}</div>
      </div>
      <div class="seg up-seg"><button data-t="mine" class="on">Мои подарки</button><button data-t="goal">Цель</button></div>
      <div id="upPick"></div>
      <div class="up-gobar"><button class="btn gold block cr-go" id="upGo" disabled>Апгрейд</button></div>`,
      { bg: .16, onClose: () => { alive = false; } });
    const go = $('#upGo', body), needle = $('#upNeedle', body), arc = $('#upArc', body), pick_ = $('#upPick', body), stage = $('#upSt', body);

    /* ---- отрисовка ---- */
    function autoPick() {
      const s = src(); if (!mult || !s) return; const want = s * mult; let best = null;
      SORTED.forEach(g => { if (g.price > s && (!best || Math.abs(g.price - want) < Math.abs(best.price - want))) best = g; });
      if (best !== target) { target = best; if (tab === 'goal') paintPick(); }
    }
    function paintStage() {
      if (mult && !busy) autoPick(); $$('#upMult button', body).forEach(b => b.classList.toggle('on', +b.dataset.m === mult));
      const s = src(), c = chance(), ok = !!target && s > 0 && target.price > s;
      arc.style.strokeDasharray = `${CIRC * c} ${CIRC}`;
      $('#upPc', body).textContent = (c ? fmt(c * 100, c >= .1 ? 1 : 2) : '0') + '%';
      $('#upTg', body).innerHTML = target ? giftImg(target.i) : '<span class="up-q">?</span>'; $('#upTg', body).className = 'up-tg' + (target ? ' r-' + target.rar : '');
      const items = [...sel].map(u => S.inv.find(x => x.u === u)).filter(Boolean);
      $('#upFromT', body).innerHTML = items.length ? items.slice(0, 3).map(it => giftImg(it.g)).join('') + (items.length > 3 ? `<em>+${items.length - 3}</em>` : '') : (stake ? COIN : '<span class="up-q">+</span>');
      $('#upFromV', body).innerHTML = COIN + fmt(s, 0);
      $('#upToT', body).innerHTML = target ? giftImg(target.i) : '<span class="up-q">?</span>';
      $('#upToV', body).innerHTML = COIN + fmt(target ? target.price : 0, 0);
      $('#upFrom', body).classList.toggle('has', s > 0); $('#upTo', body).classList.toggle('has', !!target);
      go.disabled = busy || !ok;
      go.innerHTML = busy ? 'Крутится…' : !s ? 'Выбери ставку' : !target ? 'Выбери цель' : !ok ? 'Цель должна быть дороже' : `Апгрейд · ${fmt(c * 100, c < .1 ? 2 : 1)}%`;
    }
    function paintPick() {
      if (tab === 'mine') {
        const inv = S.inv.slice().sort((a, b) => G[b.g].price - G[a.g].price);
        pick_.innerHTML = `<div class="up-stake"><span>Баланс</span><div class="chips">${STAKES.map(v => `<button data-s="${v}" class="${stake === v ? 'on' : ''}">${v || '0'}</button>`).join('')}<button data-s="max" class="${stake && stake === Math.floor(S.bal) ? 'on' : ''}">Макс</button></div></div>
          ${inv.length ? `<div class="up-grid">${inv.map(it => { const g = G[it.g]; return `<button class="up-it r-${g.rar}${sel.has(it.u) ? ' on' : ''}" data-u="${it.u}"><div class="gi">${giftImg(it.g)}</div><div class="dn">${esc(g.name)}</div><div class="dp">${COIN}${fmt(g.price, 0)}</div><i class="ck"></i></button>`; }).join('')}</div>`
            : `<div class="empty">${giftImg(136)}Пусто</div>`}`;
        $$('[data-s]', pick_).forEach(b => b.onclick = () => { if (busy) return; const v = b.dataset.s === 'max' ? Math.floor(S.bal) : +b.dataset.s; stake = Math.min(v, Math.floor(S.bal)); if (stake < 0) stake = 0; hap('select'); paintPick(); paintStage(); });
        $$('.up-it', pick_).forEach(b => b.onclick = () => { if (busy) return; const u = +b.dataset.u; sel.has(u) ? sel.delete(u) : sel.add(u); b.classList.toggle('on'); hap('select'); sfx.click(); paintStage(); });
      } else {
        const s = src();
        pick_.innerHTML = `<div class="up-grid">${SORTED.filter(g => !(s > 0 && g.price <= s)).map(g => { const lock = false; return `<button class="up-it r-${g.rar}${target === g ? ' on' : ''}${lock ? ' lock' : ''}" data-i="${g.i}" ${lock ? 'disabled' : ''}><div class="gi">${giftImg(g.i)}</div><div class="dn">${esc(g.name)}</div><div class="dp">${COIN}${fmt(g.price, 0)}</div><i class="ck"></i>${s > 0 && !lock ? `<span class="xm">x${fmt(g.price / s, g.price / s >= 10 ? 0 : 1)}</span>` : ''}</button>`; }).join('')}</div>`;
        $$('.up-it', pick_).forEach(b => b.onclick = () => { if (busy) return; target = G[+b.dataset.i]; mult = null; hap('select'); sfx.click(); $$('.up-it', pick_).forEach(x => x.classList.toggle('on', x === b)); paintStage(); });
      }
    }
    $$('.up-seg button', body).forEach(b => b.onclick = () => { if (busy) return; tab = b.dataset.t; $$('.up-seg button', body).forEach(x => x.classList.toggle('on', x === b)); hap('select'); paintPick(); });
    $$('#upMult button', body).forEach(b => b.onclick = () => {
      if (busy) return; if (!src()) { hap('error'); return toast('Сначала выбери ставку'); }
      const m = +b.dataset.m; mult = mult === m ? null : m; hap('select'); sfx.click(); paintStage(); if (tab === 'goal') paintPick();
    });
    paintStage(); paintPick();

    /* ---- запуск ---- */
    go.onclick = async () => {
      const s = src(), c = chance(); if (busy || !c) return;
      if (stake > S.bal + 1e-9) { stake = Math.floor(S.bal); paintStage(); return canPay(stake + 1); }
      busy = true; paintStage(); body.scrollTo({ top: 0, behavior: 'smooth' });
      const used = [...sel].map(u => S.inv.find(x => x.u === u)).filter(Boolean), tgt = target, pay = stake;
      used.forEach(it => { const k = S.inv.findIndex(x => x.u === it.u); if (k >= 0) S.inv.splice(k, 1); }); if (pay) addBal(-pay); save();
      S.stats.rounds++; addXP(Math.max(1, Math.round(s / 20))); hap('medium');
      const roll = Math.random(), win = roll < c, fin = ang + 360 * 6 + (roll * 360 - (ang % 360) + 360) % 360, dur = 5400;
      stage.classList.add('spin'); needle.style.transition = `transform ${dur}ms cubic-bezier(.12,.6,.06,1)`; needle.style.transform = `rotate(${fin}deg)`;
      const N = 46; for (let i = 1; i <= N; i++) setTimeout(() => alive && sfx.tick(), dur * (1 - Math.pow(1 - i / N, 1 / 3)) * .96);
      await sleep(dur + 150); if (!alive) return;
      ang = fin % 360; needle.style.transition = 'none'; needle.style.transform = `rotate(${ang}deg)`;
      stage.classList.remove('spin'); stage.classList.add(win ? 'won' : 'lost'); setTimeout(() => stage.classList.remove('won', 'lost'), 1800);
      if (win) { giveItem(tgt.i); logH('upgrade', `Апгрейд: «${tgt.name}»`, tgt.price - s); sfx.big(); hap('success'); }
      else { logH('upgrade', 'Апгрейд: неудача', -s); sfx.lose(); hap('heavy'); }
      sel = new Set(); stake = Math.min(stake, Math.floor(S.bal)); if (win) target = null; busy = false; paintStage(); paintPick();
      const m = pop(win
        ? `<div class="res r-${tgt.rar}"><div class="res-t">Успех</div><div class="res-g">${giftImg(tgt.i)}</div><h3>${esc(tgt.name)}</h3><div class="pr">${COIN}${fmt(tgt.price, 0)}</div><div class="btns"><button class="btn gold block" id="upSell">Продать за ${COIN}${fmt(tgt.price, 0)}</button><button class="btn ghost block" data-close>В инвентарь</button></div></div>`
        : `<div class="res r-lose"><div class="res-t">Не повезло</div><div class="up-lost">${used.slice(0, 4).map(it => giftImg(it.g)).join('') || COIN}</div><div class="pr" style="color:var(--red)">−${COIN}${fmt(s, 0)}</div><div class="btns"><button class="btn vio block" data-close>Ещё раз</button></div></div>`, { type: 'modal' });
      const sb = $('#upSell', m); if (sb) sb.onclick = () => { const it = S.inv[S.inv.length - 1]; if (it) { sellItem(it.u); hap('success'); toast('Продано за ' + fmt(tgt.price, 0) + ' ' + CFG.CURRENCY); } m.close(); if (alive) { paintStage(); paintPick(); } };
    };
  }
  return { open };
})();
