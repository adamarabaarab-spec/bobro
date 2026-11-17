/* ============ ПРОФИЛЬ + ИНВЕНТАРЬ ============ */
const Profile = (() => {
  const IC = {
    box: '<svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 8l9 5 9-5M12 13v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    game: '<svg viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="11" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10v5M5.5 12.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="15.5" cy="11.5" r="1.2" fill="currentColor"/><circle cx="18" cy="13.8" r="1.2" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.8 20c.4-3.6 3-5.6 6.2-5.6s5.8 2 6.2 5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="17.2" cy="9.5" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M17.5 14.6c2.2.3 3.6 1.9 3.9 4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" fill="currentColor"/></svg>'
  };
  function open() {
    let tab = 'inv', filter = 'all';
    Verify.tick();
    const lv = vipLevel();
    const nx = VIP[lv + 1], cu = VIP[lv], pct = nx ? Math.min(100, (S.xp - cu.xp) / (nx.xp - cu.xp) * 100) : 100, vs = Verify.stats();
    const w = pop(`<div class="pf-top"><button class="pf-x" data-close aria-label="Закрыть">✕</button>
        <div class="pf-ava"><span class="ava">${avatarHTML()}</span><span class="lv">Ур. ${lv + 1}</span></div>
        <div class="pf-n">${esc(USER.name)}</div><div class="pf-u">${esc(USER.username)} · ID ${USER.id}</div>
        <div class="pf-rank">${IC.crown}${cu.n}</div>
        <div class="pf-lvl"><div class="pf-lr"><span>Уровень ${lv + 1}</span><span>${fmt(S.xp, 0)}${nx ? ' / ' + nx.xp : ''} XP</span></div><div class="bar"><i style="width:${pct}%"></i></div></div></div>
      <div class="pf-bal"><div><small>Баланс</small><b>${COIN}<span class="balV">${fmt(S.bal)}</span><em>USD</em></b></div><button class="btn gold sm" data-act="topup">Пополнить</button></div>
      <div class="pf-stats">
        <div class="stat"><i>${IC.box}</i><b>${fmt(S.stats.cases, 0)}</b><span>Кейсов</span></div>
        <div class="stat"><i>${IC.game}</i><b>${fmt(S.stats.rounds, 0)}</b><span>Игр</span></div>
        <div class="stat"><i>${IC.star}</i><b>${COIN}${fmt(S.stats.best, 0)}</b><span>Лучший дроп</span></div>
        <div class="stat" id="stFr"><i>${IC.users}</i><b>${vs.passed}<small>/${vs.invited}</small></b><span>Друзья проверены</span></div></div>
      <div class="pf-tabs"><div class="seg"><button data-t="inv" class="on">Инвентарь</button><button data-t="hist">История</button><button data-t="set">Настройки</button></div></div>
      <div class="pf-body" id="pfb"></div>`, { type: 'full' });
    const pb = $('#pfb', w);
    $('#stFr', w).onclick = () => Verify.rules();

    function inv() {
      const list = S.inv.slice().reverse().filter(it => filter === 'all' || G[it.g].rar === filter);
      const total = invValue(), s = Verify.stats();
      pb.innerHTML = `<div class="inv-h"><div class="v">Стоимость<b>${COIN}${fmt(total, 0)}</b></div><button class="inv-fr press" id="ifr"><span>Для бесплатных</span><b>${Math.min(s.free, Verify.NEED)}/${Verify.NEED}</b></button></div>
        <div class="fl">${[['all', 'Все'], ['common', 'Обычные'], ['rare', 'Редкие'], ['epic', 'Эпические'], ['legend', 'Легендарные']].map(([k, n]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        ${list.length ? `<div class="dgrid">${list.map(it => { const g = G[it.g]; return `<button class="dcard r-${g.rar} press" data-u="${it.u}">${it.st === 'review' ? '<span class="dch rv">Вывод</span>' : it.free ? '<span class="dch rv">Бесплатный</span>' : ''}<div class="gi">${giftImg(g.i)}</div><div class="dn">${esc(g.name)}</div><div class="dp">${COIN}${fmt(g.price, 0)}</div></button>`; }).join('')}</div>`
          : `<div class="empty">${giftImg(105)}${S.inv.length ? 'Нет предметов такой редкости' : 'Инвентарь пуст.<br>Открой кейс — подарки появятся здесь.'}</div>`}`;
      $$('[data-f]', pb).forEach(b => b.onclick = () => { filter = b.dataset.f; hap('select'); inv(); });
      $('#ifr', pb).onclick = () => Verify.rules();
      $$('[data-u]', pb).forEach(b => b.onclick = () => item(+b.dataset.u));
    }
    function item(u) {
      const it = S.inv.find(x => x.u === u); if (!it) return; const g = G[it.g], s = Verify.stats();
      const review = it.st === 'review';
      const p = pop(`<div class="res r-${g.rar}"><div class="res-t">${RAR[g.rar].n}</div><div class="res-g" style="width:140px;height:140px">${giftImg(g.i)}</div><h3 style="font-size:18px">${esc(g.name)}</h3><div class="pr">${COIN}${fmt(g.price, 0)}</div>
        ${review ? `<div class="vf-wait"><b>Вывод на проверке</b><span id="rvT">${timeLeft(it.at - Date.now())}</span><small>Подарок придёт в Telegram через 24 часа после заявки</small></div><div class="btns"><button class="btn ghost block" data-close>Закрыть</button></div>`
          : `<div class="btns"><button class="btn gold block" id="sl">Продать за ${COIN}${fmt(g.price, 0)}</button><button class="btn vio block" id="wd">Вывести в Telegram</button><button class="btn ghost block" data-close>Оставить</button></div>
        ${it.free ? `<div class="vf-sub" style="margin-top:10px">Подарок из бесплатного кейса: для продажи и вывода нужно 5 проверенных друзей: <b>${Math.min(s.free, Verify.NEED)} / ${Verify.NEED}</b></div>` : ''}`}</div>`, { type: 'modal' });
      if (review) { const t = setInterval(() => { const e = $('#rvT', p); if (!e) return clearInterval(t); e.textContent = timeLeft(it.at - Date.now()); }, 1000); return; }
      $('#sl', p).onclick = () => { p.close(); Verify.sell(u, inv); };
      $('#wd', p).onclick = () => { p.close(); Verify.withdraw(u, inv); };
    }
    const ICONS = { case: '🎁', sell: '💰', slot: '🎰', rocket: '📈', arena: '⚔️', upgrade: '⬆️', mines: '💎', daily: '📅', task: '✅', farm: '🍯', wheel: '🎡', vip: '👑', promo: '🏷️', plus: '➕', gift: '🎀' };
    function hist() {
      pb.innerHTML = S.hist.length ? S.hist.map(h => `<div class="hrow"><div class="hi">${ICONS[h.icon] || '•'}</div><div class="ht"><b>${esc(h.text)}</b><span>${new Date(h.t).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div><div class="ha ${h.amt < 0 ? 'red' : 'green'}">${h.amt ? (h.amt > 0 ? '+' : '') + fmt(h.amt, 0) : ''}</div></div>`).join('') : `<div class="empty">${giftImg(136)}Пока пусто. Сыграй или открой кейс.</div>`;
    }
    function set() {
      pb.innerHTML = `<div class="setrow card"><span>Звук</span><span class="switch ${S.sound ? 'on' : ''}" id="sS"></span></div>
        <div class="setrow card"><span>Вибрация</span><span class="switch ${S.haptic ? 'on' : ''}" id="sH"></span></div>
        <div class="setrow card"><span>Правила вывода и продажи</span><button class="btn ghost sm" id="sRu">Открыть</button></div>
        <div class="h2" style="margin:18px 0 8px">Тест проверки <small>демо</small></div>
        <div class="muted" style="font-size:12px;margin-bottom:8px;line-height:1.4">Без сервера друзей нет. Добавь тестовых, чтобы проверить вывод. С сервером бота (BACKEND.md) данные приходят сами.</div>
        <div class="vf-demo"><button class="btn ghost sm" data-d="ok">+ Проверен</button><button class="btn ghost sm" data-d="wait">+ На проверке</button><button class="btn ghost sm" data-d="nopremium">+ Без Premium</button><button class="btn ghost sm" data-d="nogift">+ Без подарков</button></div>
        <div class="setrow card" style="margin-top:14px"><span>Сбросить демо-данные</span><button class="btn ghost sm" id="sR">Сбросить</button></div>`;
      $('#sS', pb).onclick = e => { S.sound = !S.sound; e.currentTarget.classList.toggle('on', S.sound); save(); };
      $('#sH', pb).onclick = e => { S.haptic = !S.haptic; e.currentTarget.classList.toggle('on', S.haptic); save(); };
      $('#sRu', pb).onclick = () => Verify.rules();
      $$('[data-d]', pb).forEach(b => b.onclick = () => { Verify.demoAdd(b.dataset.d); hap('success'); toast('Друг добавлен'); });
      $('#sR', pb).onclick = () => { const c = pop(`<h3 class="pt">Сбросить всё?</h3><p class="ps">Баланс, инвентарь и прогресс вернутся к начальным.</p><div class="row"><button class="btn ghost sp" data-close>Отмена</button><button class="btn vio sp" id="rr">Сбросить</button></div>`, { type: 'modal' }); $('#rr', c).onclick = resetAll; };
    }
    $$('.seg button', w).forEach(b => b.onclick = () => { $$('.seg button', w).forEach(x => x.classList.toggle('on', x === b)); tab = b.dataset.t; hap('select'); ({ inv, hist, set })[tab](); });
    inv();
  }
  return { open };
})();
