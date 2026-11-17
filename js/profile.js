/* ============ ПРОФИЛЬ + ИНВЕНТАРЬ ============ */
const Profile = (() => {
  function open() {
    let tab = 'inv', filter = 'all';
    const lv = vipLevel();
    const nx = VIP[lv + 1], cu = VIP[lv], pct = nx ? Math.min(100, (S.xp - cu.xp) / (nx.xp - cu.xp) * 100) : 100;
    const w = pop(`<div class="pf-top"><button class="pf-x" data-close aria-label="Закрыть">✕</button>
        <div class="pf-ava"><span class="ava">${avatarHTML()}</span><span class="lv">Ур. ${lv + 1}</span></div>
        <div class="pf-n">${esc(USER.name)}</div><div class="pf-u">${esc(USER.username)} · ID ${USER.id}</div>
        <div class="pf-lvl"><div class="pf-lr"><b>${cu.n}</b><span>${fmt(S.xp, 0)}${nx ? ' / ' + nx.xp : ''} XP</span></div><div class="bar"><i style="width:${pct}%"></i></div></div></div>
      <div class="pf-bal"><div><small>Баланс</small><b>${COIN}<span class="balV">${fmt(S.bal)}</span><em>USD</em></b></div><button class="btn gold sm" data-act="topup">Пополнить</button></div>
      <div class="pf-stats">
        <div class="stat card"><b>${fmt(S.stats.cases, 0)}</b><span>Кейсов</span></div>
        <div class="stat card"><b>${fmt(S.stats.rounds, 0)}</b><span>Игр</span></div>
        <div class="stat card"><b>${COIN}${fmt(S.stats.best, 0)}</b><span>Лучший дроп</span></div></div>
      <div class="pf-tabs"><div class="seg"><button data-t="inv" class="on">Инвентарь</button><button data-t="hist">История</button><button data-t="set">Настройки</button></div></div>
      <div class="pf-body" id="pfb"></div>`, { type: 'full' });
    const pb = $('#pfb', w);
    function inv() {
      const list = S.inv.slice().reverse().filter(it => filter === 'all' || G[it.g].rar === filter);
      const total = invValue();
      pb.innerHTML = `<div class="inv-h"><div class="v">Стоимость<b>${COIN}${fmt(total, 0)}</b></div><button class="btn ghost sm" id="sellCm">Продать обычные</button></div>
        <div class="fl">${[['all', 'Все'], ['common', 'Обычные'], ['rare', 'Редкие'], ['epic', 'Эпические'], ['legend', 'Легендарные']].map(([k, n]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        ${list.length ? `<div class="dgrid">${list.map(it => { const g = G[it.g]; return `<button class="dcard r-${g.rar} press" data-u="${it.u}"><div class="gi">${giftImg(g.i)}</div><div class="dn">${esc(g.name)}</div><div class="dp">${COIN}${fmt(g.price, 0)}</div></button>`; }).join('')}</div>`
          : `<div class="empty">${giftImg(105)}${S.inv.length ? 'Нет предметов такой редкости' : 'Инвентарь пуст.<br>Открой кейс — подарки появятся здесь.'}</div>`}`;
      $$('[data-f]', pb).forEach(b => b.onclick = () => { filter = b.dataset.f; hap('select'); inv(); });
      $('#sellCm', pb).onclick = () => { const cs = S.inv.filter(i => G[i.g].rar === 'common'); if (!cs.length) return toast('Обычных предметов нет'); const sum = cs.reduce((a, i) => a + G[i.g].price, 0); cs.forEach(i => sellItem(i.u)); hap('success'); toast(`Продано ${cs.length} шт. за ${fmt(sum, 0)}`); inv(); };
      $$('[data-u]', pb).forEach(b => b.onclick = () => item(+b.dataset.u));
    }
    function item(u) {
      const it = S.inv.find(x => x.u === u); if (!it) return; const g = G[it.g];
      const p = pop(`<div class="res r-${g.rar}"><div class="res-t">${RAR[g.rar].n}</div><div class="res-g" style="width:140px;height:140px">${giftImg(g.i)}</div><h3 style="font-size:18px">${esc(g.name)}</h3><div class="pr">${COIN}${fmt(g.price, 0)}</div>
        <div class="btns"><button class="btn gold block" id="sl">Продать за ${COIN}${fmt(g.price, 0)}</button><button class="btn ghost block" data-close>Оставить</button></div></div>`, { type: 'modal' });
      $('#sl', p).onclick = () => { sellItem(u); hap('success'); sfx.win(); p.close(); inv(); };
    }
    const ICONS = { case: '🎁', sell: '💰', slot: '🎰', rocket: '📈', arena: '⚔️', upgrade: '⬆️', mines: '💎', daily: '📅', task: '✅', farm: '🍯', wheel: '🎡', vip: '👑', promo: '🏷️', plus: '➕', gift: '🎀' };
    function hist() {
      pb.innerHTML = S.hist.length ? S.hist.map(h => `<div class="hrow"><div class="hi">${ICONS[h.icon] || '•'}</div><div class="ht"><b>${esc(h.text)}</b><span>${new Date(h.t).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div><div class="ha ${h.amt < 0 ? 'red' : 'green'}">${h.amt ? (h.amt > 0 ? '+' : '') + fmt(h.amt, 0) : ''}</div></div>`).join('') : `<div class="empty">${giftImg(136)}Пока пусто. Сыграй или открой кейс.</div>`;
    }
    function set() {
      pb.innerHTML = `<div class="setrow card"><span>Звук</span><span class="switch ${S.sound ? 'on' : ''}" id="sS"></span></div>
        <div class="setrow card"><span>Вибрация</span><span class="switch ${S.haptic ? 'on' : ''}" id="sH"></span></div>
        <div class="setrow card"><span>Сбросить демо-данные</span><button class="btn ghost sm" id="sR">Сбросить</button></div>
        `;
      $('#sS', pb).onclick = e => { S.sound = !S.sound; e.currentTarget.classList.toggle('on', S.sound); save(); };
      $('#sH', pb).onclick = e => { S.haptic = !S.haptic; e.currentTarget.classList.toggle('on', S.haptic); save(); };
      $('#sR', pb).onclick = () => { const c = pop(`<h3 class="pt">Сбросить всё?</h3><p class="ps">Баланс, инвентарь и прогресс вернутся к начальным.</p><div class="row"><button class="btn ghost sp" data-close>Отмена</button><button class="btn vio sp" id="rr">Сбросить</button></div>`, { type: 'modal' }); $('#rr', c).onclick = resetAll; };
    }
    $$('.seg button', w).forEach(b => b.onclick = () => { $$('.seg button', w).forEach(x => x.classList.toggle('on', x === b)); tab = b.dataset.t; hap('select'); ({ inv, hist, set })[tab](); });
    inv();
  }
  return { open };
})();
