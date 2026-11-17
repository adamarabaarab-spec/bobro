/* ============ ЯДРО: состояние, Telegram, звук, попапы ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmt = (n, d = 2) => {
  n = +n || 0; const r = Math.abs(n - Math.round(n)) < 0.005 ? 0 : d;
  return n.toLocaleString('ru-RU', { minimumFractionDigits: r, maximumFractionDigits: r }).replace(/ | /g, ' ');
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Telegram ---------- */
const tg = (window.Telegram && window.Telegram.WebApp) || null;
const inTG = !!(tg && tg.initData);
try { if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor && tg.setHeaderColor('#0a0812'); tg.setBackgroundColor && tg.setBackgroundColor('#0a0812'); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } } catch (e) {}
const TU = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
const USER = {
  id: TU ? TU.id : 7770001,
  name: TU ? [TU.first_name, TU.last_name].filter(Boolean).join(' ') : 'Гость',
  username: TU && TU.username ? '@' + TU.username : '@guest',
  photo: TU && TU.photo_url || ''
};
function avatarHTML(cls = '') {
  const ini = esc((USER.name || 'G').trim().charAt(0).toUpperCase());
  const hue = (USER.id * 47) % 360;
  const fb = `<span class="ava-ini" style="background:linear-gradient(135deg,hsl(${hue},55%,52%),hsl(${(hue + 50) % 360},60%,36%))">${ini}</span>`;
  return USER.photo
    ? `<span class="ava-box ${cls}">${fb}<img src="${esc(USER.photo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()"></span>`
    : `<span class="ava-box ${cls}">${fb}</span>`;
}

/* ---------- Состояние ---------- */
const KEY = 'upbaer_demo_v1';
const defState = () => ({ bal: 1000, inv: [], hist: [], xp: 0, uid: 1, stats: { cases: 0, spins: 0, best: 0, rounds: 0 },
  daily: { last: '', streak: 0 }, tasks: {}, farm: { t: Date.now(), lvl: 1 }, promo: [], wheel: 0, free: 0, vip: 0, sound: true, haptic: true, refs: 0 });
let S;
try { S = Object.assign(defState(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = defState(); }
let _sv; function save() { clearTimeout(_sv); _sv = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 150); }
function resetAll() { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); }

/* ---------- Монета и баланс ---------- */
const COIN = `<svg class="coin" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9ffd6"/><stop offset=".5" stop-color="#3fd981"/><stop offset="1" stop-color="#0e8a4b"/></linearGradient></defs><circle cx="12" cy="12" r="10.8" fill="url(#cg)"/><circle cx="12" cy="12" r="8.4" fill="none" stroke="rgba(0,70,35,.35)" stroke-width="1"/><text x="12" y="16.6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12.5" font-weight="900" fill="#04301a">$</text></svg>`;
let _shown = null;
function renderBal(animate) {
  const els = $$('.balV'); if (!els.length) return;
  const to = S.bal; if (_shown === null || !animate) { _shown = to; els.forEach(e => e.textContent = fmt(to)); return; }
  const from = _shown, t0 = performance.now(), dur = 600; _shown = to;
  const step = t => { const k = Math.min(1, (t - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - k, 3)); $$('.balV').forEach(e => e.textContent = fmt(k < 1 ? v : to)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function addBal(d, animate = true) { S.bal = Math.round((S.bal + d) * 100) / 100; if (S.bal < 0) S.bal = 0; save(); renderBal(animate); }
function canPay(n) { if (S.bal + 1e-9 >= n) return true; hap('error'); toast('Недостаточно ' + CFG.CURRENCY); sfx.err(); return false; }
function addXP(n) { S.xp += n; save(); }
function vipLevel() { let l = 0; VIP.forEach((v, i) => { if (S.xp >= v.xp) l = i; }); return l; }

/* ---------- Инвентарь / история ---------- */
function logH(icon, text, amt) { S.hist.unshift({ t: Date.now(), icon, text, amt: amt || 0 }); S.hist.length = Math.min(S.hist.length, 60); save(); }
function giveItem(gi) { const it = { u: S.uid++, g: gi, t: Date.now() }; S.inv.push(it); if (G[gi].price > S.stats.best) S.stats.best = G[gi].price; save(); return it; }
function sellItem(u) {
  const k = S.inv.findIndex(x => x.u === u); if (k < 0) return 0;
  const g = G[S.inv[k].g]; S.inv.splice(k, 1); addBal(g.price); logH('sell', 'Продан «' + g.name + '»', g.price); return g.price;
}
const invValue = () => S.inv.reduce((a, it) => a + G[it.g].price, 0);

/* ---------- Звук / вибро ---------- */
let _ac;
function tone(f, d = .06, type = 'sine', v = .035, when = 0) {
  if (!S.sound) return;
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = _ac.currentTime + when, o = _ac.createOscillator(), g = _ac.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(_ac.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
const sfx = {
  tick: () => tone(1100, .03, 'triangle', .028), click: () => tone(640, .05, 'sine', .03),
  drop: () => tone(180, .09, 'sine', .05), pop: () => tone(760, .07, 'triangle', .03),
  win: () => [523, 659, 784].forEach((f, i) => tone(f, .2, 'sine', .045, i * .07)),
  big: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .35, 'sine', .05, i * .09)),
  err: () => tone(160, .14, 'sawtooth', .025), lose: () => tone(220, .25, 'sine', .04)
};
function hap(kind = 'light') {
  if (!S.haptic) return;
  try {
    const h = tg && tg.HapticFeedback; if (!h || !inTG) { if (navigator.vibrate && kind !== 'select') navigator.vibrate(kind === 'heavy' ? 30 : 10); return; }
    if (kind === 'select') h.selectionChanged(); else if (['success', 'error', 'warning'].includes(kind)) h.notificationOccurred(kind); else h.impactOccurred(kind);
  } catch (e) {}
}

/* ---------- Toast / попапы ---------- */
function toast(msg, ms = 2200) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.add('in')); setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, ms);
}
function pop(html, { type = 'sheet', cls = '' } = {}) {
  const w = document.createElement('div'); w.className = `pop pop-${type} ${cls}`;
  w.innerHTML = `<div class="pop-bd"></div><div class="pop-card">${type === 'sheet' ? '<div class="grab"></div>' : ''}<div class="pop-body">${html}</div></div>`;
  $('#overlay').appendChild(w); requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('in')));
  w.close = () => { if (w._c) return; w._c = 1; w.classList.remove('in'); setTimeout(() => { w.remove(); w.onclose && w.onclose(); }, 320); };
  $('.pop-bd', w).onclick = () => { if (!w.locked) w.close(); };
  $$('[data-close]', w).forEach(b => b.addEventListener('click', w.close));
  return w;
}
function copyText(t) { try { navigator.clipboard.writeText(t); } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e2) {} a.remove(); } }
function openTG(url) { try { if (tg && inTG && /^https:\/\/t\.me\//.test(url)) tg.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) { window.open(url, '_blank'); } }
const giftImg = (gi, cls = '') => `<img class="gimg ${cls}" src="${G[gi].img}" alt="${esc(G[gi].name)}" draggable="false" loading="lazy">`;
const timeLeft = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return [h, m, s % 60].map(x => String(x).padStart(2, '0')).join(':'); };
const dayKey = () => new Date().toISOString().slice(0, 10);

/* delegated press feedback */
document.addEventListener('pointerdown', e => { const b = e.target.closest('button,.press'); if (b && !b.disabled) sfx.click(); }, { passive: true });

/* ---------- Авто-«лайт»: слабые телефоны ---------- */
(function () {
  const root = document.documentElement, set = v => { root.classList.toggle('lite', v); try { window.Bg && Bg.lite(v); } catch (e) {} };
  const weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 3);
  if (weak) set(true);
  let n = 0, t0 = performance.now(), bad = 0;
  const probe = t => { n++; if (t - t0 >= 1000) { if (n < 40) bad++; else bad = Math.max(0, bad - 1); n = 0; t0 = t; if (bad >= 2 && !root.classList.contains('lite')) { set(true); return; } if (t < 12000) requestAnimationFrame(probe); return; } requestAnimationFrame(probe); };
  setTimeout(() => requestAnimationFrame(probe), 2500);
})();
