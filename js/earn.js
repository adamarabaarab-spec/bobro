/* ============ ЗАРАБОТОК + БОНУСЫ ============ */
const Earn = (() => {
  const DAY = 86400000, CAP_H = 8, DAILY = [20, 30, 50, 75, 100, 150, 300];
  const rate = () => 12 * S.farm.lvl, upCost = () => 200 * S.farm.lvl;
  const accrued = () => Math.min(CAP_H * 3600000, Date.now() - S.farm.t) / 3600000 * rate();
  const refLink = () => `https://t.me/${CFG.BOT}/${CFG.APP}?startapp=ref_${USER.id}`;
  const yest = () => new Date(Date.now() - DAY).toISOString().slice(0, 10);
  const streakNow = () => { let s = S.daily.last === dayKey() || S.daily.last === yest() ? S.daily.streak : 0; return s >= 7 && S.daily.last !== dayKey() ? 0 : s; };

  const TASKS = [
    { id: 'sub', ic: 138, t: 'Подпишись на канал', s: 'Новости, розыгрыши и промокоды', r: 100, type: 'link' },
    { id: 'cases', ic: 105, t: 'Открой 5 кейсов', s: '', r: 150, target: 5, get: () => S.stats.cases, go: 'cases' },
    { id: 'rounds', ic: 15, t: 'Сыграй 10 раундов', s: '', r: 120, target: 10, get: () => S.stats.rounds, go: 'home' },
    { id: 'inv', ic: 16, t: 'Собери инвентарь на 500', s: '', r: 200, target: 500, get: () => invValue(), go: 'cases' },
    { id: 'friends', ic: 33, t: 'Пригласи 3 друзей', s: '', r: 300, target: 3, get: () => S.refs, go: null }
  ];

  function earnHTML() {
    const acc = accrued(), cap = rate() * CAP_H, days = streakNow(), today = S.daily.last === dayKey();
    return `<div class="page">
      <div class="farm"><div class="farm-h">
        <div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="7"/><circle id="ringC" cx="50" cy="50" r="44" fill="none" stroke="url(#rg)" stroke-width="7" stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="${276.5 * (1 - acc / cap)}"/><defs><linearGradient id="rg"><stop offset="0" stop-color="#8267ff"/><stop offset="1" stop-color="#4fe08a"/></linearGradient></defs></svg><div class="gi">${giftImg(136)}</div></div>
        <div><h3>Берлога · ур. ${S.farm.lvl}</h3><p>Мишка копит ${CFG.CURRENCY} сам: ${rate()}/час, до ${CAP_H} часов.<br><span class="gold" style="font-weight:800" id="farmAcc">${COIN} ${fmt(acc)}</span> накоплено</p></div></div>
        <div class="acts"><button class="btn gold" id="farmClaim">Собрать</button><button class="btn ghost" id="farmUp">Улучшить · ${fmt(upCost(), 0)}</button></div></div>

      <div class="h2">Ежедневная награда <small>${today ? 'Получено сегодня' : 'Доступна'}</small></div>
      <div class="stk">${DAILY.map((v, i) => `<div class="day ${i < days ? 'done' : (!today && i === days ? 'now' : '')}">День ${i + 1}<div class="gi">${i === 6 ? giftImg(105) : COIN.replace('class="coin"', 'class="coin" style="width:28px;height:28px;margin:4px auto;display:block"')}</div><b>${i === 6 ? '' : ''}${v}</b></div>`).join('')}</div>
      <button class="btn ${today ? 'ghost' : 'gold'} block" id="dailyB" style="margin-top:12px" ${today ? 'disabled' : ''}>${today ? 'Приходи завтра' : 'Забрать награду'}</button>

      <div class="h2">Задания</div>
      <div class="list" id="tasks">${TASKS.map(taskHTML).join('')}</div>

      <div class="h2">Друзья</div>
      <div class="card ref"><b style="font-size:15px">Получай ${CFG.CURRENCY} за каждого друга</b>
        <div class="muted" style="font-size:12.5px;margin-top:4px;line-height:1.45">+100 ${CFG.CURRENCY} тебе и другу сразу и 5% от его активности.</div>
        <div class="lnk">${esc(refLink())}</div>
        <div class="row"><button class="btn ghost sp sm" id="refCopy">Копировать</button><button class="btn vio sp sm" id="refShare">Пригласить</button></div>
        <div class="row" style="margin-top:12px;font-size:12.5px"><span class="muted">Приглашено: <b style="color:var(--ink)">${S.refs}</b></span><span class="sp"></span><span class="muted">Заработано: <b class="gold">${fmt(S.refs * 100, 0)}</b></span></div></div></div>`;
  }
  function taskHTML(t) {
    const done = S.tasks[t.id] === 'done';
    let sub = t.s, bar = '', btn = '';
    if (t.target) { const p = Math.min(t.target, t.get()); sub = `${fmt(p, 0)} / ${fmt(t.target, 0)}`; bar = `<div class="bar"><i style="width:${p / t.target * 100}%"></i></div>`; const ready = p >= t.target; btn = done ? '' : ready ? `<button class="btn gold sm" data-claim="${t.id}">Забрать</button>` : (t.go ? `<button class="btn ghost sm" data-goto="${t.go}">Перейти</button>` : `<button class="btn ghost sm" data-goto="share">Позвать</button>`); }
    else { btn = done ? '' : S.tasks[t.id] === 'ready' ? `<button class="btn gold sm" data-claim="${t.id}">Забрать</button>` : `<button class="btn ghost sm" data-link="${t.id}">Открыть</button>`; }
    return `<div class="task card"><div class="ic">${giftImg(t.ic)}</div><div class="tx"><b>${t.t}</b><span>${sub}</span>${bar}</div><div style="text-align:right;display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="rew">${COIN}${t.r}</span>${done ? '<span class="green" style="font-weight:800;font-size:12px">✓ Получено</span>' : btn}</div></div>`;
  }
  function bindEarn(v) {
    $('#farmClaim', v).onclick = () => { const a = accrued(); if (a < 1) return toast('Пока рано — копится…'); S.farm.t = Date.now(); addBal(Math.floor(a)); logH('farm', 'Берлога', Math.floor(a)); hap('success'); sfx.win(); toast('+' + fmt(Math.floor(a), 0) + ' ' + CFG.CURRENCY); renderTab(false); };
    $('#farmUp', v).onclick = () => { if (!canPay(upCost())) return; addBal(-upCost()); S.farm.lvl++; save(); hap('success'); toast('Берлога улучшена!'); renderTab(false); };
    $('#dailyB', v).onclick = () => {
      if (S.daily.last === dayKey()) return; const s = streakNow(); const r = DAILY[s];
      S.daily = { last: dayKey(), streak: s + 1 }; addBal(r); logH('daily', 'Ежедневная награда', r); if (s === 6) { giftItemFor(105); toast('7-й день: подарок «' + G[105].name + '»'); } hap('success'); sfx.win(); toast('+' + r + ' ' + CFG.CURRENCY); renderTab(false);
    };
    $('#tasks', v).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.claim) { const t = TASKS.find(x => x.id === b.dataset.claim); S.tasks[t.id] = 'done'; addBal(t.r); logH('task', t.t, t.r); hap('success'); sfx.win(); toast('+' + t.r + ' ' + CFG.CURRENCY); renderTab(false); }
      else if (b.dataset.link) { openTG(CFG.CHANNEL); toast('Проверяем подписку…'); setTimeout(() => { S.tasks.sub = 'ready'; save(); if (cur === 'earn') renderTab(false); }, 3500); }
      else if (b.dataset.goto) { if (b.dataset.goto === 'share') $('#refShare', v).click(); else go(b.dataset.goto); }
    });
    $('#refCopy', v).onclick = () => { copyText(refLink()); hap('success'); toast('Ссылка скопирована'); };
    $('#refShare', v).onclick = () => openTG(`https://t.me/share/url?url=${encodeURIComponent(refLink())}&text=${encodeURIComponent('Залетай в UpBaer — открывай кейсы с подарками и играй 🐻🎁')}`);
  }
  const giftItemFor = gi => { giveItem(gi); logH('gift', 'Подарок: «' + G[gi].name + '»', G[gi].price); return gi; };

  /* ---- Бонусы ---- */
  const PRIZES = [10, 25, 15, 50, 20, 100, 30, 250], PW = [22, 16, 20, 9, 18, 4, 10, 1];
  function wheelBG() { const cols = ['#3b2f8f', '#26205a']; let s = ''; PRIZES.forEach((_, i) => { s += `${i === 7 ? '#8a6a2b' : cols[i % 2]} ${i * 45}deg ${(i + 1) * 45}deg${i < 7 ? ',' : ''}`; }); return `conic-gradient(${s})`; }
  function bonusHTML() {
    const lv = vipLevel(), nx = VIP[lv + 1], cur = VIP[lv], pct = nx ? (S.xp - cur.xp) / (nx.xp - cur.xp) * 100 : 100;
    const pend = VIP.slice(S.vip + 1, lv + 1).reduce((a, v) => a + v.reward, 0), wl = DAY - (Date.now() - S.wheel);
    return `<div class="page">
      <div class="cgrid">${Cases.cardHTML(CASES[0], true)}</div>
      <div class="h2">Колесо бонусов <small>раз в сутки</small></div>
      <div class="card" style="padding:22px 16px 16px"><div class="wheelw"><div class="wheel-pt"></div><div class="wheel" id="wheel" style="background:${wheelBG()}">${PRIZES.map((p, i) => `<span style="position:absolute;left:50%;top:50%;width:0;height:0;transform:rotate(${i * 45 + 22.5}deg)"><b style="position:absolute;left:-30px;top:-118px;width:60px;text-align:center;font-family:var(--disp);font-size:${p >= 100 ? 15 : 14}px;color:${i === 7 ? '#ffe9b0' : '#e8e2ff'}">${p}</b></span>`).join('')}</div><div class="wheel-hub"><img src="${G[136].img}" alt=""></div></div>
        <button class="btn gold block" id="wheelB" style="margin-top:14px" ${wl > 0 ? 'disabled' : ''}>${wl > 0 ? 'Следующий спин через ' + timeLeft(wl) : 'Крутить колесо'}</button></div>

      <div class="h2">Уровень берлоги</div>
      <div class="card vip"><div class="vip-l"><div class="bd">${lv + 1}</div><div class="sp"><b style="font-size:16px">${cur.n}</b><div class="muted" style="font-size:12.5px;margin-top:2px">Кэшбэк-бонус ${cur.cb} · ${fmt(S.xp, 0)} XP${nx ? ' / ' + nx.xp : ''}</div></div></div>
        <div class="bar" style="height:7px;margin-top:14px"><i style="width:${pct}%"></i></div>
        <div class="vsteps">${VIP.map((v, i) => `<span class="${i <= lv ? 'on' : ''}">${v.n.split(' ')[0]}</span>`).join('')}</div>
        <div class="muted" style="font-size:12px;margin-top:10px">XP начисляется за открытие кейсов и игры.</div>
        ${pend ? `<button class="btn gold block" id="vipB" style="margin-top:12px">Забрать награду +${fmt(pend, 0)}</button>` : ''}</div>

      <div class="h2">Промокод</div>
      <div class="promo"><input id="promoI" placeholder="ВВЕДИ КОД" maxlength="16" autocomplete="off"><button class="btn vio" id="promoB">Ввести</button></div>
      <div class="muted" style="font-size:12px;margin:8px 4px 0">Попробуй: UPBAER</div></div>`;
  }
  function bindBonus(v) {
    const wb = $('#wheelB', v), wheel = $('#wheel', v);
    wb.onclick = async () => {
      if (Date.now() - S.wheel < DAY) return; wb.disabled = true; S.wheel = Date.now(); save();
      let r = Math.random() * PW.reduce((a, b) => a + b, 0), idx = 0; for (; idx < PW.length; idx++) { r -= PW[idx]; if (r < 0) break; } idx = Math.min(idx, 7);
      const rot = 360 * 6 + (360 - (idx * 45 + 22.5)) + rnd(-15, 15); wheel.style.transform = `rotate(${rot}deg)`;
      for (let i = 0; i < 28; i++) { setTimeout(() => sfx.tick(), i * i * 6.2); }
      await sleep(5200); addBal(PRIZES[idx]); logH('wheel', 'Колесо бонусов', PRIZES[idx]); hap('success'); sfx.big(); toast('+' + PRIZES[idx] + ' ' + CFG.CURRENCY); wb.textContent = 'Следующий спин через 24:00:00';
    };
    const vb = $('#vipB', v); if (vb) vb.onclick = () => { const lv = vipLevel(), p = VIP.slice(S.vip + 1, lv + 1).reduce((a, x) => a + x.reward, 0); S.vip = lv; addBal(p); logH('vip', 'Награда за уровень', p); hap('success'); sfx.big(); toast('+' + fmt(p, 0) + ' ' + CFG.CURRENCY); renderTab(false); };
    $('#promoB', v).onclick = () => {
      const code = $('#promoI', v).value.trim().toUpperCase(); if (!code) return;
      if (!PROMOS[code]) { hap('error'); sfx.err(); return toast('Такого кода нет'); }
      if (S.promo.includes(code)) { hap('error'); return toast('Код уже использован'); }
      S.promo.push(code); addBal(PROMOS[code]); logH('promo', 'Промокод ' + code, PROMOS[code]); hap('success'); sfx.win(); toast('+' + PROMOS[code] + ' ' + CFG.CURRENCY); $('#promoI', v).value = '';
    };
  }
  /* живое обновление таймеров */
  setInterval(() => {
    const c = $('#ringC'); if (c) { const cap = rate() * CAP_H, a = accrued(); c.style.strokeDashoffset = 276.5 * (1 - a / cap); const f = $('#farmAcc'); if (f) f.innerHTML = `${COIN} ${fmt(a)}`; }
    const wb = $('#wheelB'); if (wb && !wb.disabled && false) {} else if (wb && Date.now() - S.wheel < DAY && !wb.textContent.includes('24:00:00')) { wb.textContent = 'Следующий спин через ' + timeLeft(DAY - (Date.now() - S.wheel)); }
    $$('.ccard.big .tag').forEach(t => { const l = DAY - (Date.now() - S.free); if (l > 0) t.textContent = 'Через ' + timeLeft(l); });
  }, 1000);
  const share = () => openTG(`https://t.me/share/url?url=${encodeURIComponent(refLink())}&text=${encodeURIComponent('Залетай в UpBaer — кейсы, игры и подарки 🐻🎁')}`);
  return { earnHTML, bindEarn, bonusHTML, bindBonus, share };
})();
