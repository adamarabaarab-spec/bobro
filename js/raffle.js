/* ============ РОЗЫГРЫШ NFT · топ-100 по билетам ============
   Билеты даются только за потраченные деньги (кейсы, игры, апгрейд): 1 билет за каждые RAFFLE.per USD.
   Бесплатные открытия и бонусы билетов не дают. Места делят призы по RAFFLE.prizes. */
const Raffle = (() => {
  const R = RAFFLE, TOP = 100;
  const st = () => (S.raf = S.raf && S.raf.id === R.id ? S.raf : { id: R.id, wag: 0 });
  const tickets = () => Math.floor(st().wag / R.per + 1e-9);
  const prizeOf = place => R.prizes.find(p => place >= p.from && place <= p.to);
  function spent(n) { if (Date.now() > R.ends) return; st().wag += n; save(); }
  /* ---- таблица: настоящие данные придут с сервера; пока — стабильно сгенерированные игроки ---- */
  function board() {
    let x = 7 + R.id.length * 131; const rnd = () => (x = (x * 1664525 + 1013904223) >>> 0) / 4294967296;
    const rows = Array.from({ length: TOP }, (_, i) => ({ name: FAKE_NAMES[Math.floor(rnd() * FAKE_NAMES.length)] + (rnd() < .6 ? Math.floor(rnd() * 99) : ''), t: Math.max(1, Math.round(1800 / Math.pow(i + 1, .82) * (.85 + rnd() * .3))), h: Math.floor(rnd() * 360) }));
    rows.sort((a, b) => b.t - a.t); const me = tickets(); let rank = rows.findIndex(r => me > r.t); if (rank < 0) rank = rows.length;
    return { rows, me, rank: rank + 1, inTop: me > 0 && rank < TOP };
  }
  const left = () => Math.max(0, R.ends - Date.now());
  const dhm = ms => { const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return (d ? d + ' д ' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const ava = (name, h, cls = '') => `<span class="rf-ava ${cls}" style="background:hsl(${h},55%,46%)">${esc((name || '?')[0].toUpperCase())}</span>`;
  const prizeChip = place => { const p = prizeOf(place); return p ? `<span class="rf-pz">${giftImg(p.g)}${p.count > 1 ? '×' + p.count : ''}</span>` : ''; };

  /* ---- баннер на вкладке «Заработок» ---- */
  function bannerHTML() {
    const nft = R.prizes.slice(0, 3);
    return `<button class="rf-banner" id="rafB"><div class="rf-bg"></div>
      <div class="rf-txt"><span class="rf-tag">Розыгрыш</span><h3>${esc(R.title)}</h3><p>Копи билеты и попади в топ-100</p><div class="rf-time" id="rafT">${dhm(left())}</div><span class="rf-go">Участвовать</span></div>
      <div class="rf-nft">${nft.map((p, i) => `<i class="n${i + 1}">${giftImg(p.g)}</i>`).join('')}</div></button>`;
  }
  /* реклама: ADS (из бота) + розыгрыш. Если слайдов больше одного — листаются сами */
  function adsHTML() {
    const ads = (CFG.ADS || []).map(a => `<a class="ad-slide ad-img" href="${esc(a.url || '#')}" data-ad="${esc(a.url || '')}"><img src="${esc(a.img)}" alt="" loading="lazy"></a>`);
    const slides = [bannerHTML().replace('class="rf-banner"', 'class="rf-banner ad-slide"'), ...ads];
    return `<div class="ads" id="ads"><div class="ads-tr">${slides.join('')}</div>${slides.length > 1 ? `<div class="ads-dots">${slides.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div>`;
  }
  let adT = 0;
  function bindAds(v) {
    const root = $('#ads', v); if (!root) return; const tr = $('.ads-tr', root), n = tr.children.length, dots = $$('.ads-dots i', root); let i = 0;
    $('#rafB', v).onclick = open;
    $$('[data-ad]', root).forEach(a => a.onclick = e => { e.preventDefault(); if (a.dataset.ad) openTG(a.dataset.ad); });
    const go = k => { i = (k + n) % n; tr.style.transform = `translateX(${-i * 100}%)`; dots.forEach((d, j) => d.classList.toggle('on', j === i)); };
    clearInterval(adT); if (n > 1) adT = setInterval(() => { if (!document.body.contains(root)) return clearInterval(adT); go(i + 1); }, 5000);
  }

  /* ---- окно розыгрыша ---- */
  function open() {
    const b = board(), pod = [2, 1, 3].map(pl => ({ pl, r: b.rows[pl - 1], p: prizeOf(pl) }));
    const medal = { 1: 'g', 2: 's', 3: 'b' };
    const w = pop(`<div class="rf">
      <button class="pf-x" data-close aria-label="Закрыть">✕</button>
      <div class="rf-head"><span class="rf-tag">Розыгрыш</span><h2>${esc(R.title)}</h2><div class="rf-left">До конца <b id="rfL">${dhm(left())}</b></div></div>
      <div class="rf-me"><div><small>Твои билеты</small><b>${fmt(b.me, 0)}</b></div><div><small>Место</small><b>${b.inTop ? '#' + b.rank : b.me ? '100+' : '—'}</b></div><div><small>До след. билета</small><b>${COIN}${fmt(R.per - (st().wag % R.per), 0)}</b></div></div>
      <div class="rf-how">1 билет за каждые ${COIN}${R.per}, потраченные в кейсах и играх. Бесплатные открытия и бонусы билетов не дают.</div>
      <div class="podium">${pod.map(({ pl, r, p }) => `<div class="pd pd${pl} ${medal[pl]}">
          ${p ? `<div class="pd-g"><span class="pd-ring"></span>${giftImg(p.g)}</div><div class="pd-gn">${esc(G[p.g].name)}</div>` : ''}
          ${ava(r.name, r.h, 'big')}<b class="pd-n">${esc(r.name)}</b><span class="pd-t">${fmt(r.t, 0)} бил.</span>
          <div class="pd-step"><em>${pl}</em></div></div>`).join('')}</div>
      <div class="rf-list">${b.rows.slice(3).map((r, i) => { const pl = i + 4; return `<div class="rf-row"><span class="rk">${pl}</span>${ava(r.name, r.h)}<b>${esc(r.name)}</b>${prizeChip(pl)}<span class="tk">${fmt(r.t, 0)}</span></div>`; }).join('')}</div>
      ${b.inTop ? '' : `<div class="rf-row me pin"><span class="rk">${b.me ? '100+' : '—'}</span>${ava(USER.name, 140)}<b>Ты</b><span class="tk">${fmt(b.me, 0)}</span></div>`}
      <button class="btn gold block" id="rfPlay" style="margin-top:12px">Играть и копить билеты</button></div>`, { type: 'full' });
    const t = setInterval(() => { const e = $('#rfL', w); if (!e) return clearInterval(t); e.textContent = dhm(left()); }, 1000);
    $('#rfPlay', w).onclick = () => { w.close(); try { go('cases'); } catch (e) {} };
  }
  setInterval(() => { const e = $('#rafT'); if (e) e.textContent = dhm(left()); }, 1000);
  return { spent, tickets, adsHTML, bindAds, open, board };
})();
