/* ============ Фон: пролетающие подарки (лёгкий, без blur-фильтров) ============ */
const Bg = (() => {
  const layer = $('#bg-gifts'); let queue = [], els = [], isLite = false;
  const next = () => { if (!queue.length) { queue = G.map(g => g.i); for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; } } return queue.pop(); };
  function fly(el, first) {
    const gi = next(), size = rnd(26, 52), depth = (size - 26) / 26;          // крупные — ближе и ярче
    const vh = window.innerHeight, dur = rnd(14000, 26000) * (1.2 - depth * .4);
    const x = rnd(-2, 94), sway = rnd(-30, 30), rot = rnd(-40, 40), op = .34 + depth * .34;
    el.src = G[gi].img; el.style.width = size + 'px'; el.style.left = x + 'vw';
    const a = el.animate([
      { transform: `translate3d(0,${vh + 60}px,0) rotate(${-rot}deg)`, opacity: 0 },
      { opacity: op, offset: .1 },
      { transform: `translate3d(${sway}px,${vh * .45}px,0) rotate(0deg)`, opacity: op, offset: .55 },
      { opacity: op, offset: .9 },
      { transform: `translate3d(${-sway * .6}px,-90px,0) rotate(${rot}deg)`, opacity: 0 }
    ], { duration: dur, easing: 'linear', fill: 'forwards' });
    if (first) a.currentTime = Math.random() * dur * .9;
    a.onfinish = () => fly(el, false);
  }
  function build(n) { layer.innerHTML = ''; els = []; for (let i = 0; i < n; i++) { const el = document.createElement('img'); el.className = 'bgg'; el.draggable = false; el.alt = ''; el.decoding = 'async'; layer.appendChild(el); els.push(el); fly(el, true); } }
  const init = (n = 16) => build(isLite ? 7 : n);
  const level = v => { layer.style.setProperty('--bgI', Math.max(.55, Math.min(1, .5 + v * .7))); };
  const pause = on => { layer.style.display = on ? 'none' : ''; };
  const lite = v => { isLite = v; if (els.length) build(v ? 7 : 16); };
  return { init, level, pause, lite };
})();
