/* ============ РОУТЕР, ШАПКА, ГЛАВНАЯ ============ */
const BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const balChip = () => `<button class="bal" data-act="topup">${COIN}<b class="balV">${fmt(S.bal)}</b><small class="cur">USD</small><i class="plus">+</i></button>`;

/* ---------- Подэкран (кейс / игра) ---------- */
const Sub = {
  el: $('#sub'), onClose: null, open(title, html, { bg = .28, onClose } = {}) {
    this.close(true);
    this.onClose = onClose || null; Bg.pause(true);
    this.el.innerHTML = `<div class="sub-in"><div class="sub-top"><button class="back" aria-label="Назад">${BACK_SVG}</button><div class="sub-t">${title}</div>${balChip()}</div><div class="sub-body">${html}</div></div>`;
    this.el.classList.add('on'); document.body.classList.add('insub'); $('.back', this.el).onclick = () => Sub.close();
    renderBal(false); try { tg && tg.BackButton && tg.BackButton.show(); } catch (e) {}
    return $('.sub-body', this.el);
  },
  close(silent) {
    if (this.onClose) { try { this.onClose(); } catch (e) {} this.onClose = null; }
    if (!this.el.classList.contains('on')) return;
    this.el.classList.remove('on'); document.body.classList.remove('insub'); this.el.innerHTML = '';
    if (!silent) { Bg.pause(false); Bg.level(TAB_BG[cur] || .3); try { tg && tg.BackButton && tg.BackButton.hide(); } catch (e) {} renderTab(false); }
  }
};
try { tg && tg.BackButton && tg.BackButton.onClick(() => { const p = $('.pop:last-child'); if (p && p.close) p.close(); else Sub.close(); }); } catch (e) {}

/* ---------- Live-лента ---------- */
function liveItem() {
  const pool = G.filter(g => g.price < 700 || Math.random() < .12); const g = pick(pool);
  return `<div class="live-it"><div class="gi">${giftImg(g.i)}</div><div class="t"><span>${esc(pick(FAKE_NAMES))}</span><b>${fmt(g.price, 0)} ${CFG.CURRENCY}</b></div></div>`;
}
function liveHTML() { let h = ''; for (let i = 0; i < 6; i++) h += liveItem(); return `<div class="live"><div class="live-l"><i class="live-dot"></i>LIVE</div><div class="live-track">${h}</div></div>`; }
setInterval(() => { $$('.live-track').forEach(t => { t.insertAdjacentHTML('afterbegin', liveItem()); while (t.children.length > 8) t.lastElementChild.remove(); }); }, 3600);

/* ---------- Вкладки ---------- */
const TAB_BG = { home: .3, cases: .62, earn: .22, bonus: .28 };
const TABS = ['home', 'cases', 'earn', 'bonus'];
let cur = 'home';
/* ---------- Баннеры (авто-карусель) ---------- */
const SLOT_G = [136, 84, 99, 33, 68, 15, 84, 136, 99];
const BANNERS = [
  { id: 'slots', t: 'Слоты', btn: 'Играть', attr: 'data-game="slots"', art: () => `<div class="bn-slot">${SLOT_G.map((g, i) => `<div class="c" style="--i:${i}"><div class="t${[1, 4, 7].includes(i) ? ' hit' : ''}">${giftImg(g)}</div></div>`).join('')}<span class="bn-win">x25</span></div>` },
  { id: 'bonus', t: 'Бонусы', btn: 'Забрать', attr: 'data-tab-go="bonus"', art: () => `<div class="bn-wheel"><div class="w"></div><i class="pt"></i><div class="hub">${COIN}</div></div><span class="bn-chip c1">${COIN}250</span><span class="bn-chip c2">${COIN}100</span><div class="bn-conf">${'<i></i>'.repeat(8)}</div>` },
  { id: 'friends', t: 'Друзья', btn: 'Пригласить', attr: 'data-act="invite"', art: () => `<div class="bn-fr"><span style="--h:150">А</span><span style="--h:330">М</span><span style="--h:45">К</span></div><span class="bn-chip c1">+100 ${CFG.CURRENCY}</span><span class="bn-chip c2">${COIN}5%</span><i class="bn-spark s1"></i><i class="bn-spark s2"></i><i class="bn-spark s3"></i>` },
  { id: 'topup', t: 'Пополнение', btn: 'Пополнить', attr: 'data-act="topup"', art: () => `<div class="bn-card"><i class="chip"></i><b>$</b><span></span></div><div class="bn-coins">${COIN}${COIN}${COIN}</div><i class="bn-spark s1"></i><i class="bn-spark s2"></i><i class="bn-spark s3"></i>` }
];
function bannersHTML() {
  return `<div class="bn-wrap"><div class="bn-track">${BANNERS.map(b => `<div class="bn-s"><button class="bn b-${b.id} press" ${b.attr}><div class="bn-tx"><h3>${b.t}</h3><span class="btn gold">${b.btn}</span></div><div class="bn-art">${b.art()}</div></button></div>`).join('')}</div>
    <div class="bn-dots">${BANNERS.map((_, i) => `<i${i ? '' : ' class="on"'}><b></b></i>`).join('')}</div></div>`;
}
let _bnT = 0;
function bindBanners(v) {
  clearInterval(_bnT); const tr = $('.bn-track', v); if (!tr) return;
  const dots = $$('.bn-dots i', v), n = dots.length; let i = 0, hold = 0;
  const mark = k => { i = k; dots.forEach((d, j) => d.classList.toggle('on', j === k)); };
  const to = k => tr.scrollTo({ left: ((k % n) + n) % n * tr.clientWidth, behavior: 'smooth' });
  let sT = 0; tr.addEventListener('scroll', () => { const k = Math.round(tr.scrollLeft / tr.clientWidth); if (k !== i && k >= 0 && k < n) mark(k); }, { passive: true });
  tr.addEventListener('pointerdown', () => { hold = 1; clearTimeout(sT); }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => tr.addEventListener(ev, () => { clearTimeout(sT); sT = setTimeout(() => hold = 0, 1200); }, { passive: true }));
  dots.forEach((d, k) => d.onclick = () => { to(k); });
  _bnT = setInterval(() => { if (!document.body.contains(tr)) return clearInterval(_bnT); if (!hold && !document.body.classList.contains('insub') && !$('#overlay').children.length) to(i + 1); }, 5000);
}

function homeHTML() {
  const pop = CASES.filter(c => !c.free).slice(0, 5);
  return `<div class="page">
    ${liveHTML()}
    ${bannersHTML()}
    <div class="h2">Игры</div>
    <div class="gcards">
      <button class="gcard g-slots" data-game="slots"><h4>Слоты</h4><div class="art"><i>${giftImg(136)}</i><i class="hit">${giftImg(15)}</i><i>${giftImg(84)}</i><i class="hit">${giftImg(15)}</i><span class="gx">x25</span></div></button>
      <button class="gcard g-crash" data-game="crash"><h4>Краш</h4><div class="art"><svg viewBox="0 0 140 100" preserveAspectRatio="xMaxYMax meet"><defs><linearGradient id="gc1" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#22c55e" stop-opacity="0"/><stop offset=".6" stop-color="#22c55e"/><stop offset="1" stop-color="#d9ffe8"/></linearGradient><linearGradient id="gc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c55e" stop-opacity=".38"/><stop offset="1" stop-color="#22c55e" stop-opacity="0"/></linearGradient></defs><g stroke="rgba(255,255,255,.08)"><path d="M0 30H140M0 55H140M0 80H140"/></g><path d="M4 94 C50 92 88 78 112 38 L112 100 L4 100Z" fill="url(#gc2)"/><path d="M4 94 C50 92 88 78 112 38" fill="none" stroke="rgba(34,197,94,.25)" stroke-width="12" stroke-linecap="round"/><path d="M4 94 C50 92 88 78 112 38" fill="none" stroke="url(#gc1)" stroke-width="4.5" stroke-linecap="round"/></svg><b class="gm"><span>12.4</span>x</b><div class="rk"><span class="fl"></span><img src="assets/rocket.png" alt=""></div></div></button>
      <button class="gcard g-arena" data-game="arena"><h4>Арена</h4><div class="art"><svg viewBox="0 0 172 150" preserveAspectRatio="xMidYMid slice"><defs>
        <linearGradient id="a1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d27a"/><stop offset="1" stop-color="#0f8a4a"/></linearGradient>
        <linearGradient id="a2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b82ff"/><stop offset="1" stop-color="#5b3fe0"/></linearGradient>
        <linearGradient id="a3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#46d9f0"/><stop offset="1" stop-color="#1c8fb8"/></linearGradient>
        <linearGradient id="a4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7fb0"/><stop offset="1" stop-color="#d63a7a"/></linearGradient></defs>
        <polygon class="za" points="0,0 100,0 80,60 0,75" fill="url(#a1)"/><polygon class="zb" points="100,0 172,0 172,55 120,70 80,60" fill="url(#a2)"/>
        <polygon class="zc" points="0,75 80,60 120,70 100,150 0,150" fill="url(#a3)"/><polygon class="zd" points="172,55 172,150 100,150 120,70" fill="url(#a4)"/>
        <polygon class="zw" points="172,55 172,150 100,150 120,70" fill="#fff"/>
        <g fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="2" stroke-linejoin="round"><path d="M100 0L80 60 0 75"/><path d="M80 60L120 70 172 55"/><path d="M120 70L100 150"/></g>
        <g class="av"><circle cx="38" cy="30" r="9"/><circle cx="136" cy="24" r="8"/><circle cx="46" cy="108" r="9"/><circle cx="146" cy="104" r="8"/></g>
        <g class="ar-p"><g class="ar-arrow"><path d="M0 -26 L-6 -14 H6Z" fill="#a6f7c6"/><path d="M0 -14 V-9" stroke="#a6f7c6" stroke-width="3" stroke-linecap="round"/></g><circle r="9.5" fill="#06110b" stroke="#a6f7c6" stroke-width="3.5"/><circle r="3.6" fill="none" stroke="#a6f7c6" stroke-width="1.6"/></g></svg></div></button>
      <button class="gcard g-up" data-game="upgrade"><h4>Апгрейд</h4><div class="art"><svg viewBox="0 0 120 120"><defs><linearGradient id="gu1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9ffe8"/><stop offset=".45" stop-color="#4fe08a"/><stop offset="1" stop-color="#0f8a4a"/></linearGradient></defs><circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="11"/><circle cx="60" cy="60" r="48" fill="none" stroke="rgba(34,197,94,.22)" stroke-width="19" stroke-dasharray="132 400" transform="rotate(-90 60 60)" stroke-linecap="round"/><circle cx="60" cy="60" r="48" fill="none" stroke="url(#gu1)" stroke-width="11" stroke-linecap="round" stroke-dasharray="132 400" transform="rotate(-90 60 60)"/><path d="M60 3 L53 19 H67Z" fill="#fff"/></svg><div class="ug"><span class="ug-a">${giftImg(16)}</span><span class="ug-b">${giftImg(68)}</span></div><i class="uarr"></i><span class="up-pct">x5</span></div></button>
    </div>
    <div class="h2">Популярные кейсы <small data-tab-go="cases" class="press">Все →</small></div>
    <div class="hscroll">${pop.map(c => Cases.cardHTML(c, false, 'width:164px')).join('')}</div>
  </div>`;
}
function renderTab(anim = true) {
  const v = $('#view'); let html = '';
  if (cur === 'home') html = homeHTML(); else if (cur === 'cases') html = Cases.listHTML();
  else if (cur === 'earn') html = Earn.earnHTML(); else html = Earn.bonusHTML();
  v.innerHTML = html; if (!anim) $('.page', v).style.animation = 'none';
  if (cur === 'home') bindBanners(v); if (cur === 'earn') Earn.bindEarn(v); if (cur === 'bonus') Earn.bindBonus(v);
}
function go(tab) {
  cur = tab; const i = TABS.indexOf(tab);
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('.nav-ind').style.transform = `translateX(${i * 100}%)`;
  Bg.level(TAB_BG[tab]); renderTab(true); $('#view').scrollTop = 0;
}

/* ---------- Игры ---------- */
function openGame(name) { ({ slots: Slots, crash: Crash, arena: Arena, upgrade: Upgrade })[name].open(); }

/* ---------- Пополнение (демо) ---------- */
function topup() {
  const packs = [[500, 105], [2500, 85], [10000, 16]];
  const w = pop(`<h3 class="pt">Пополнить</h3>${packs.map(([n, gi]) => `<button class="pack card press" data-n="${n}"><div class="gi">${giftImg(gi)}</div><div><b>${COIN}${fmt(n, 0)}</b></div><span class="sp"></span><span class="tag">Бесплатно</span></button>`).join('')}`);
  $$('.pack', w).forEach(b => b.onclick = () => { addBal(+b.dataset.n); logH('plus', 'Демо-пополнение', +b.dataset.n); hap('success'); sfx.win(); toast('+' + fmt(+b.dataset.n, 0) + ' ' + CFG.CURRENCY); w.close(); });
}

/* ---------- Делегирование кликов ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab],[data-game],[data-case],[data-act],[data-tab-go]'); if (!t) return;
  if (t.dataset.tab) return go(t.dataset.tab);
  if (t.dataset.tabGo) return go(t.dataset.tabGo);
  if (t.dataset.game) return openGame(t.dataset.game);
  if (t.dataset.case) return Cases.open(t.dataset.case);
  const a = t.dataset.act;
  if (a === 'topup') topup();
  else if (a === 'invite') Earn.share();
  else if (a === 'profile') Profile.open();
});

/* ---------- Старт ---------- */
function init() {
  $$('.coinw').forEach(e => e.innerHTML = COIN);
  $('#avaBtn').innerHTML = avatarHTML(); $('#avaBtn').dataset.act = 'profile';
  $('#balBtn').dataset.act = 'topup';
  renderBal(false); Bg.init(16); go('home');
  const nav = $('.nav-ind'); nav.style.transition = 'none'; requestAnimationFrame(() => nav.style.transition = '');
}
init();
