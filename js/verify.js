/* ============ ПРОВЕРКА ДРУЗЕЙ · ВЫВОД И ПРОДАЖА ПОДАРКОВ ============
   Чтобы продать или вывести ОДИН подарок, нужно 5 проверенных друзей (каждый друг — только за один подарок).
   Друг «проверен», когда: пришёл по ссылке · у него Telegram Premium · в профиле есть подарки ·
   подтвердил активность видео в боте · крутанул бонусную рулетку.
   Вывод: подарок приходит в Telegram через 24 часа после проверки. Продажа: баланс зачисляется сразу.

   Реальные данные о друзьях приходят с сервера бота (CFG.API, см. BACKEND.md).
   Без сервера работает демо-режим: друзей можно добавить в «Профиль → Настройки → Тест проверки». */
const Verify = (() => {
  const NEED = 5, REVIEW = 86400000;
  const st = r => (r.premium === false || r.gifts === false || r.proof === 'fail') ? 'failed' : (r.premium && r.gifts && r.proof === 'ok' && r.spun) ? 'passed' : 'pending';
  const checks = r => [
    { ok: r.premium, bad: r.premium === false, t: 'Telegram Premium' },
    { ok: r.gifts, bad: r.gifts === false, t: 'Подарки в профиле' },
    { ok: r.proof === 'ok', bad: r.proof === 'fail', t: 'Видео-проверка активности', wait: r.proof === 'wait' },
    { ok: r.spun, bad: false, t: 'Крутанул рулетку' }
  ];
  const reason = r => { const c = checks(r).find(x => x.bad); if (c) return 'Не прошёл: ' + c.t.toLowerCase(); const w = checks(r).find(x => !x.ok); return w ? 'Ждём: ' + w.t.toLowerCase() : ''; };
  const stats = () => {
    const L = S.rl || [], passed = L.filter(r => st(r) === 'passed');
    return { invited: L.length, passed: passed.length, spun: L.filter(r => r.spun).length, failed: L.filter(r => st(r) === 'failed').length, free: passed.filter(r => !r.used).length };
  };

  /* ---- синхронизация с сервером (если задан CFG.API) ---- */
  async function sync() {
    if (!CFG.API) return;
    try {
      const r = await fetch(CFG.API.replace(/\/$/, '') + '/refs', { headers: { 'X-Init-Data': (tg && tg.initData) || '', 'X-User-Id': String(USER.id) } });
      if (!r.ok) return; const j = await r.json(); if (!Array.isArray(j.refs)) return;
      const used = {}; (S.rl || []).forEach(x => { if (x.used) used[x.id] = x.used; });
      S.rl = j.refs.map(x => Object.assign({ premium: null, gifts: null, proof: 'none', spun: false }, x, used[x.id] ? { used: used[x.id] } : {})); save();
    } catch (e) {}
  }

  /* ---- завершение вывода через 24 часа ---- */
  function tick() {
    let n = 0; S.inv = S.inv.filter(it => { if (it.st === 'review' && it.at <= Date.now()) { logH('gift', 'Выдан в Telegram: «' + G[it.g].name + '»', 0); n++; return false; } return true; });
    if (n) { save(); toast('Подарок отправлен в Telegram 🎁'); }
  }
  setInterval(tick, 30000); setTimeout(tick, 1500);

  /* ---- правила ---- */
  const rulesHTML = () => `<ol class="vf-rules">
    <li><b>5 друзей на каждый подарок.</b> Чтобы продать или вывести один подарок, нужно 5 проверенных друзей. Один друг засчитывается только за один подарок.</li>
    <li><b>Друг считается проверенным, если:</b><ul><li>пришёл по твоей ссылке;</li><li>у него есть Telegram Premium;</li><li>в его профиле есть подарки;</li><li>он подтвердил в боте, что аккаунт активный (видео);</li><li>он крутанул бонусную рулетку.</li></ul></li>
    <li><b>Вывод:</b> подарок приходит в Telegram через 24 часа после проверки.</li>
    <li><b>Продажа:</b> когда условия выполнены, сумма сразу зачисляется на баланс.</li>
    <li><b>Не прошёл проверку</b> — друг не засчитывается, в списке видно причину. Если друзей меньше 5, показывается «0 из 5».</li>
    <li>Фейковые и повторные аккаунты не засчитываются.</li></ol>`;
  const rules = () => { const p = pop(`<h3 class="pt">Правила вывода и продажи</h3>${rulesHTML()}<button class="btn gold block" data-close style="margin-top:14px">Понятно</button>`, { type: 'sheet' }); return p; };

  /* ---- окно «нужно 5 друзей» / подтверждение ---- */
  function gate(u, mode, done) {
    const it = S.inv.find(x => x.u === u); if (!it) return; const g = G[it.g], s = stats(), ok = s.free >= NEED, sell = mode === 'sell';
    const seg = Array.from({ length: NEED }, (_, i) => `<i class="${i < Math.min(s.free, NEED) ? 'on' : ''}"></i>`).join('');
    const p = pop(`<div class="vf">
      <div class="vf-g r-${g.rar}">${giftImg(g.i)}</div>
      <h3 class="pt">${sell ? 'Продажа' : 'Вывод'}: ${esc(g.name)}</h3>
      <div class="vf-big"><b>${Math.min(s.free, NEED)}</b><span>из ${NEED}</span></div>
      <div class="vf-seg">${seg}</div>
      <div class="vf-note">${ok ? 'Условия выполнены' : 'Друзей, прошедших проверку, за этот подарок'}</div>
      <div class="vf-stats"><div><b>${s.invited}</b><span>Приглашено</span></div><div><b>${s.passed}</b><span>Прошли проверку</span></div><div><b>${s.spun}</b><span>Крутанули рулетку</span></div></div>
      ${ok ? `<button class="btn gold block" id="vfGo">${sell ? 'Продать за ' + COIN + fmt(g.price, 0) : 'Запросить вывод'}</button>
        <div class="vf-sub">${sell ? 'Баланс пополнится сразу. Использованные друзья спишутся.' : 'Подарок придёт в Telegram через 24 часа. Использованные друзья спишутся.'}</div>`
        : `<button class="btn gold block" id="vfInv">Пригласить друзей</button><div class="vf-sub">Не хватает ${NEED - s.free}. Друг должен пройти все проверки.</div>`}
      <button class="btn ghost block" id="vfRules" style="margin-top:8px">Правила</button></div>`, { type: 'modal' });
    $('#vfRules', p).onclick = () => rules();
    const inv = $('#vfInv', p); if (inv) inv.onclick = () => { p.close(); Earn.share(); };
    const go = $('#vfGo', p); if (go) go.onclick = () => {
      const s2 = stats(); if (s2.free < NEED) return; let k = 0;
      (S.rl || []).forEach(r => { if (k < NEED && st(r) === 'passed' && !r.used) { r.used = u; k++; } });
      if (sell) { sellItem(u); sfx.win(); toast('Продано за ' + fmt(g.price, 0) + ' ' + CFG.CURRENCY); }
      else { it.st = 'review'; it.at = Date.now() + REVIEW; logH('gift', 'Заявка на вывод: «' + g.name + '»', 0); sfx.win(); toast('Заявка принята. Подарок придёт через 24 часа'); }
      hap('success'); save(); p.close(); done && done();
    };
  }
  const sell = (u, done) => gate(u, 'sell', done), withdraw = (u, done) => gate(u, 'out', done);

  /* ---- блок «Друзья» на вкладке «Заработок» ---- */
  const chip = (ok, bad, t) => `<span class="fc ${ok ? 'ok' : bad ? 'bad' : ''}">${ok ? '✓' : bad ? '✕' : '…'} ${t}</span>`;
  function friendsHTML(link) {
    const s = stats(), L = (S.rl || []).slice().reverse();
    return `<div class="card ref"><b style="font-size:15px">Друзья</b>
      <div class="muted" style="font-size:12.5px;margin-top:4px;line-height:1.45">+100 ${CFG.CURRENCY} тебе и другу сразу и 5% от его активности. Для продажи или вывода подарка нужно 5 проверенных друзей.</div>
      <div class="lnk">${esc(link)}</div>
      <div class="row"><button class="btn ghost sp sm" id="refCopy">Копировать</button><button class="btn vio sp sm" id="refShare">Пригласить</button></div>
      <div class="vf-stats" style="margin-top:14px"><div><b>${s.invited}</b><span>Приглашено</span></div><div><b>${s.passed}</b><span>Прошли проверку</span></div><div><b>${s.spun}</b><span>Крутанули рулетку</span></div></div>
      <div class="vf-prog"><div class="pl"><span>Для подарка</span><b>${Math.min(s.free, NEED)} / ${NEED}</b></div><div class="vf-seg">${Array.from({ length: NEED }, (_, i) => `<i class="${i < Math.min(s.free, NEED) ? 'on' : ''}"></i>`).join('')}</div></div>
      ${L.length ? `<div class="flist">${L.map(r => { const q = st(r); return `<div class="frow ${q}"><span class="dot" style="background:hsl(${(String(r.id).length * 53 + r.id.toString().charCodeAt(0) * 7) % 360},55%,48%)">${esc((r.name || '?')[0].toUpperCase())}</span>
        <div class="fi"><b>${esc(r.name)}${r.used ? ' <i>использован</i>' : ''}</b><div class="fcs">${checks(r).map(c => chip(c.ok, c.bad, c.t)).join('')}</div></div>
        <span class="fs ${q}">${q === 'passed' ? 'Проверен' : q === 'failed' ? 'Отказ' : 'Проверка'}</span></div>`; }).join('')}</div>` : '<div class="flist-e">Пока никого. Отправь ссылку друзьям.</div>'}
      <button class="btn ghost block" id="vfRules2" style="margin-top:12px">Правила вывода и продажи</button></div>`;
  }

  /* ---- демо-режим (без сервера) ---- */
  function demoAdd(kind) {
    const name = pick(FAKE_NAMES), id = 'd' + Date.now() + Math.floor(Math.random() * 99);
    const v = { id, name, at: Date.now(), premium: true, gifts: true, proof: 'ok', spun: true };
    if (kind === 'nopremium') v.premium = false; else if (kind === 'wait') { v.proof = 'wait'; v.spun = false; } else if (kind === 'nogift') v.gifts = false;
    (S.rl = S.rl || []).push(v); save();
  }
  return { NEED, stats, sync, tick, rules, rulesHTML, gate, sell, withdraw, friendsHTML, demoAdd, state: st };
})();
