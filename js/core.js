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
  daily: { last: '', streak: 0 }, tasks: {}, farm: { t: Date.now(), lvl: 1 }, promo: [], wheel: 0, free: 0, vip: 0, sound: true, haptic: true, refs: 0, rl: [] });
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
/* Контекст создаётся при первом касании; короткие «щелчки» заранее сгенерированы в буферах — без лагов. */
let _ac, _bufs, _lastTick = 0;
function ac() {
  if (!S.sound) return null;
  if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); makeBufs(); } catch (e) { return null; } }
  if (_ac.state === 'suspended') _ac.resume().catch(() => {});
  return _ac;
}
function makeBufs() {
  const sr = _ac.sampleRate, mk = (len, fn) => { const b = _ac.createBuffer(1, Math.floor(sr * len), sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = fn(i / sr); return b; };
  const TP = 2 * Math.PI;
  _bufs = {
    /* зубец трещотки: сухой щелчок + короткий «стук собачки» */
    rat: [0, 1, 2].map(k => mk(.035, t => ((Math.random() * 2 - 1) * Math.exp(-t * 520) * .55 + Math.sin(TP * (1700 + k * 260) * t) * Math.exp(-t * 300) * .6 + Math.sin(TP * (420 + k * 40) * t) * Math.exp(-t * 170) * .55))),
    tick: mk(.03, t => Math.sin(TP * 1250 * t) * Math.exp(-t * 230) * .7 + (Math.random() * 2 - 1) * Math.exp(-t * 600) * .25),
    click: mk(.04, t => Math.sin(TP * 700 * t) * Math.exp(-t * 130) * .6)
  };
}
document.addEventListener('pointerdown', () => { if (S.sound) ac(); }, { capture: true, passive: true });
function playBuf(buf, when = 0, vol = .5, rate = 1) {
  const a = ac(); if (!a || !buf) return;
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = buf; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g); g.connect(a.destination); s.start(a.currentTime + Math.max(0, when));
}
function tone(f, d = .06, type = 'sine', v = .035, when = 0) {
  const a = ac(); if (!a) return;
  try { const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02); } catch (e) {}
}
const sfx = {
  tick: () => { const n = performance.now(); if (n - _lastTick < 16) return; _lastTick = n; ac() && _bufs && playBuf(_bufs.tick, 0, .55, .95 + Math.random() * .1); },
  /* зубец трещотки (when — секунды вперёд, для точной раскладки внутри кадра) */
  ratchet: (when = 0, vol = .6, rate = 1) => { if (ac() && _bufs) playBuf(_bufs.rat[(Math.random() * 3) | 0], when, vol, rate * (.97 + Math.random() * .06)); },
  click: () => { ac() && _bufs && playBuf(_bufs.click, 0, .4); },
  drop: () => tone(180, .09, 'sine', .05), pop: () => tone(760, .07, 'triangle', .03),
  win: () => [523, 659, 784].forEach((f, i) => tone(f, .2, 'sine', .045, i * .07)),
  big: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .35, 'sine', .05, i * .09)),
  err: () => tone(160, .14, 'sawtooth', .025), lose: () => tone(220, .25, 'sine', .04)
};

/* кубическая кривая как в CSS transition-timing-function — чтобы звук совпадал с анимацией секунда в секунду */
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 22; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}
/* Трещотка: value(k) = from + (to-from)*ease(k); каждый пройденный «зубец» (целое значение) — щелчок. */
function runRatchet(dur, ease, from, to, { vol = .6, maxPerFrame = 5, onTooth } = {}) {
  const t0 = performance.now(); let prevV = Math.floor(from), prevT = t0, dead = false, raf = 0;
  const f = now => {
    if (dead) return; const k = Math.min(1, (now - t0) / dur), v = from + (to - from) * ease(k), cur = Math.floor(v), n = Math.abs(cur - prevV), fd = Math.max(8, Math.min(40, now - prevT)) / 1000;
    if (n > 0) { const c = Math.min(n, maxPerFrame); for (let i = 0; i < c; i++) sfx.ratchet(i / c * fd, vol); onTooth && onTooth(cur); }
    prevV = cur; prevT = now; if (k < 1) raf = requestAnimationFrame(f);
  };
  raf = requestAnimationFrame(f); return () => { dead = true; cancelAnimationFrame(raf); };
}
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
