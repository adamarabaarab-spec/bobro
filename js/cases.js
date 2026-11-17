/* ============ КЕЙСЫ ============ */
const Cases = (() => {
  const DAY = 86400000, W = 104, CW = 94, EASE = cubicBezier(.08, .6, .1, 1);
  const priceHTML = c => c.free ? 'Бесплатно' : `${COIN}${fmt(c.price, 0)}`;
  function cardHTML(c, big, style = '') {
    const art = `<div class="cc-art">${c.cover.map(i => giftImg(i)).join('')}</div>`;
    const st = `--c1:${c.theme[0]};--c2:${c.theme[1]};${style}`;
    if (big) {
      const left = Date.now() - S.free < DAY;
      return `<button class="ccard big" data-case="${c.id}" style="${st}">${art}<div class="info"><span class="tag">${left ? 'Через ' + timeLeft(DAY - (Date.now() - S.free)) : 'Доступен!'}</span><div class="cc-n" style="font-size:18px;margin-top:8px">${c.name} кейс</div><div class="cc-s">${c.sub}</div><span class="cc-p">${left ? 'Ждём…' : 'Забрать'}</span></div></button>`;
    }
    return `<button class="ccard" data-case="${c.id}" style="${st}">${art}<div class="cc-n">${c.name}</div><div class="cc-s">${c.sub}</div><span class="cc-p">${priceHTML(c)}</span></button>`;
  }
  function listHTML() {
    const daily = CASES[0], rest = CASES.slice(1);
    return `<div class="page">${liveHTML()}
      <div class="cgrid">${cardHTML(daily, true)}</div>
      <div class="h2">Кейсы с подарками <small>${rest.length} шт.</small></div>
      <div class="cgrid">${rest.map(c => cardHTML(c)).join('')}</div></div>`;
  }
  const weighted = c => { let r = Math.random(); for (const d of c.drops) { r -= d.p; if (r <= 0) return d.g; } return c.drops[c.drops.length - 1].g; };
  const EMPTY_ART = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="3" opacity=".55"/><path d="M13.5 34.5L34.5 13.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".55"/></svg>';
  const cellHTML = g => g.empty ? `<div class="cell empty"><div class="gi">${EMPTY_ART}</div><div class="cp">Пусто</div></div>` : `<div class="cell r-${g.rar}"><div class="gi">${giftImg(g.i)}</div><div class="cp">${COIN}${fmt(g.price, 0)}</div></div>`;
  /* для красоты ленты заполняем «пустыми» и подарками примерно поровну; выигрыш — всегда по настоящим шансам */
  const filler = c => { if (!c.free) return weighted(c); if (Math.random() < .5) return EMPTY; const gs = c.drops.filter(d => !d.g.empty); return gs[Math.floor(Math.random() * gs.length)].g; };

  function open(id) {
    const c = CASES.find(x => x.id === id); let demo = false, fast = false, busy = false, arr = [], cur = 0, timer = null, raf = 0, stopTk = null;
    const body = Sub.open(c.name, `
      <div class="cstage">
        <div class="cs-head"><div class="gi">${giftImg(c.cover[1])}</div><div><h2>${c.name} кейс</h2><p>${c.free ? 'Бесплатно раз в сутки' : 'Цена открытия ' + COIN + fmt(c.price, 0)}</p></div></div>
        <div class="roul"><div class="strip"></div><div class="rmark"></div></div>
        <div class="cs-ctl"><button class="btn gold block" id="goBtn"></button>
          <div class="cs-opt"><label><span class="switch" id="swDemo"></span>Демо-режим</label><label>Быстро<span class="switch" id="swFast"></span></label></div></div>
      </div>
      <div class="h2">Что может выпасть <small>${c.drops.filter(d => !d.g.empty).length} предметов</small></div>
      <div class="dgrid">${c.drops.map(d => d.g.empty ? `<div class="dcard empty"><div class="gi">${EMPTY_ART}</div><div class="dn">Пусто</div><div class="dp">—</div></div>` : `<div class="dcard r-${d.g.rar}"><div class="gi">${giftImg(d.g.i)}</div><div class="dn">${esc(d.g.name)}</div><div class="dp">${COIN}${fmt(d.g.price, 0)}</div></div>`).join('')}</div>`,
      { bg: .72, onClose: () => { clearInterval(timer); cancelAnimationFrame(raf); stopTk && stopTk(); } });
    const strip = $('.strip', body), roul = $('.roul', body), mark = $('.rmark', body), btn = $('#goBtn', body);
    const cx = () => roul.clientWidth / 2;
    const xAt = (i, off = 0) => cx() - (i * W + CW / 2 + off);
    arr = Array.from({ length: 30 }, () => filler(c)); cur = 15;
    const paint = () => { strip.innerHTML = arr.map(cellHTML).join(''); };
    paint(); strip.style.transform = `translateX(${xAt(cur)}px)`;
    window.addEventListener('resize', () => { if (!busy) strip.style.transform = `translateX(${xAt(cur)}px)`; });

    const label = () => {
      if (busy) return;
      if (demo) btn.innerHTML = 'Крутить в демо';
      else if (c.free) { const left = DAY - (Date.now() - S.free); btn.disabled = left > 0; btn.innerHTML = left > 0 ? 'Следующий через ' + timeLeft(left) : 'Крутить бесплатно'; }
      else btn.innerHTML = `Открыть за ${COIN}${fmt(c.price, 0)}`;
      if (!c.free || demo) btn.disabled = false;
    };
    label(); timer = setInterval(label, 1000);
    $('#swDemo', body).onclick = e => { if (busy) return; demo = !demo; e.currentTarget.classList.toggle('on', demo); label(); };
    $('#swFast', body).onclick = e => { fast = !fast; e.currentTarget.classList.toggle('on', fast); };

    btn.onclick = async () => {
      if (busy) return;
      if (!demo) { if (c.free) { if (Date.now() - S.free < DAY) return; } else if (!canPay(c.price)) return; }
      busy = true; btn.disabled = true; btn.innerHTML = 'Крутится…';
      if (!demo) { if (c.free) S.free = Date.now(); else addBal(-c.price); S.stats.cases++; addXP(Math.ceil(c.price / 10) + 2); save(); }
      const win = weighted(c), WIN = 5 + 50 + Math.floor(Math.random() * 4);
      const keep = arr.slice(cur - 5, cur + 6), na = keep.slice();
      while (na.length < WIN + 8) na.push(filler(c)); na[WIN] = win; arr = na; paint();
      strip.style.transition = 'none'; strip.style.transform = `translateX(${xAt(5)}px)`; void strip.offsetWidth;
      const dur = fast ? 2.4 : 6.4, off = rnd(-CW * .36, CW * .36);
      strip.style.transition = `transform ${dur}s cubic-bezier(.08,.6,.1,1)`; strip.style.transform = `translateX(${xAt(WIN, off)}px)`;
      /* щелчок каждый раз, когда под маркером проходит новая карточка — по той же кривой, что и анимация */
      const p0 = 5 + CW / 2 / W, p1 = WIN + CW / 2 / W + off / W;
      stopTk = runRatchet(dur * 1000, EASE, p0, p1, { vol: .5, maxPerFrame: 3, onTooth: () => hap('select') });
      await sleep(dur * 1000 + 120); stopTk && stopTk(); cur = WIN;
      $$('.cell', strip).forEach((el, i) => el.classList.add(i === WIN ? 'won' : 'dim'));
      if (win.empty) { hap('light'); sfx.lose(); if (!demo) logH('case', `${c.name}: пусто`, 0); }
      else { hap(win.rar === 'legend' || win.rar === 'epic' ? 'heavy' : 'medium'); (win.rar === 'legend' || win.rar === 'epic') ? sfx.big() : sfx.win(); if (!demo) { giveItem(win.i, !!c.free); logH('case', `${c.name}: «${win.name}»`, win.price); } }
      await sleep(650); showResult(win);
    };

    function showResult(g) {
      if (g.empty) {
        const w = pop(`<div class="res r-lose"><div class="res-t">${demo ? 'Демо · ' : ''}Пусто</div><div class="res-g emp">${EMPTY_ART}</div><h3>Не повезло</h3><div class="muted" style="font-size:13px;margin-top:4px">Попробуй завтра.</div>
          <div class="btns"><button class="btn vio block" data-close>Ок</button></div></div>`, { type: 'modal' });
        w.locked = false; w.onclose = () => { busy = false; $$('.cell', strip).forEach(el => el.classList.remove('won', 'dim')); label(); }; return;
      }
      const w = pop(`<div class="res r-${g.rar}"><div class="res-t">${demo ? 'Демо · ' : ''}${RAR[g.rar].n}</div><div class="res-g">${giftImg(g.i)}</div><h3>${esc(g.name)}</h3>
        <div class="pr">${COIN}${fmt(g.price, 0)}</div>
        <div class="btns">${demo ? '<button class="btn gold block" data-close>Круто!</button>' : `<button class="btn gold block" id="sellB">Продать за ${COIN}${fmt(g.price, 0)}</button><button class="btn ghost block" data-close>В инвентарь</button>`}</div></div>`, { type: 'modal' });
      w.locked = false;
      const sb = $('#sellB', w); if (sb) sb.onclick = () => Verify.sell(S.inv[S.inv.length - 1].u, () => w.close());
      w.onclose = () => { busy = false; $$('.cell', strip).forEach(el => el.classList.remove('won', 'dim')); label(); };
    }
  }
  return { cardHTML, listHTML, open };
})();
