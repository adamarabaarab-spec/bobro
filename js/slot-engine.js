/* Чистая логика слота (без DOM) — гоняется в node для проверки RTP.
   Поле 6×5. Выплата за 8+ одинаковых подарков В ЛЮБОМ месте, выигравшие исчезают, сверху падают новые (каскады).
   3+ «Бонус»-символа → 10 суперспинов; в них выпадают кристаллы-иксы, множитель копится и не сбрасывается. */
(function (root) {
  const COLS = 6, ROWS = 5;
  /* g — подарок; w — вес на ячейку; pay — множители ставки за 8, 9, 10, 12, 14+ штук */
  const SYM = [
    { g: 15,  w: 5, pay: [3.5, 4.5, 7, 17.5, 25] },
    { g: 68,  w: 6, pay: [1.75, 2.25, 3.5, 8.5, 13] },
    { g: 33,  w: 8, pay: [1, 1.25, 2.5, 5, 8.5] },
    { g: 99,  w: 10, pay: [.7, .85, 1.75, 3.5, 5] },
    { g: 84,  w: 12, pay: [.5, .7, 1.25, 2.5, 3.5] },
    { g: 136, w: 14, pay: [.45, .5, .85, 1.75, 2.5] },
    { g: 41,  w: 16, pay: [.35, .45, .7, 1.5, 2.2] },
    { g: 57,  w: 19, pay: [.3, .4, .6, 1.25, 1.75] },
    { g: 22,  w: 22, pay: [.25, .3, .5, 1, 1.4] }
  ];
  const SCATTER = 9, SCATTER_G = 110;
  const CRYS = [{ v: 2, w: 35 }, { v: 3, w: 30 }, { v: 5, w: 19 }, { v: 10, w: 10 }, { v: 15, w: 4 }, { v: 25, w: 2 }];   // кристаллы-иксы (только в бонусе)
  const CR0 = 20;                                    // id кристалла = 20 + индекс в CRYS
  const P = { ps: 0.0094, psDC: 0.0124, pc: 0.0105, k: 2.66, CAP: 5000, FS: 10, RETRIG: 5, MIN: 8, BUY: 48, DC: 1.25 };
  const totalW = SYM.reduce((a, s) => a + s.w, 0), crW = CRYS.reduce((a, c) => a + c.w, 0);
  const A = [8, 9, 10, 12, 14];                      // опорные количества
  function payFor(s, n) {                            // множитель ставки за n штук символа s (между опорными — среднее геометрическое)
    if (n < P.MIN) return 0; const p = SYM[s].pay; if (n >= A[4]) return p[4] * P.k;
    const i = A.indexOf(n); if (i >= 0) return p[i] * P.k;
    const j = A.findIndex(x => x > n); return Math.sqrt(p[j - 1] * p[j]) * P.k;
  }
  const rs = rng => { let r = rng() * totalW; for (let i = 0; i < SYM.length; i++) { r -= SYM[i].w; if (r < 0) return i; } return 0; };
  const rc = rng => { let r = rng() * crW; for (let i = 0; i < CRYS.length; i++) { r -= CRYS[i].w; if (r < 0) return CR0 + i; } return CR0; };
  const isSym = c => c >= 0 && c < SCATTER, isCr = c => c >= CR0;
  function cell(rng, o) { if (rng() < (o.dc ? P.psDC : P.ps)) return SCATTER; if (o.fs && rng() < P.pc) return rc(rng); return rs(rng); }
  function genBoard(rng, o = {}) {
    const b = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => cell(rng, o)));
    if (o.buy) { let n = b.flat().filter(x => x === SCATTER).length; while (n < 3) { const r = Math.floor(rng() * ROWS), c = Math.floor(rng() * COLS); if (b[r][c] !== SCATTER) { b[r][c] = SCATTER; n++; } } }
    return b;
  }
  const count = (b, f) => b.flat().filter(f).length;
  /* Один спин (все каскады). o: {fs, mult (накопленный множитель бонуса), dc, buy}. Ставка = 1. */
  function play(rng, o = {}) {
    let board = o.board || genBoard(rng, o); const first = board.map(r => r.slice()), steps = []; let raw = 0;
    while (true) {
      const cnt = Array(SCATTER).fill(0); board.forEach(r => r.forEach(c => { if (isSym(c)) cnt[c]++; }));
      const win = []; let stepRaw = 0; cnt.forEach((n, s) => { if (n >= P.MIN) { win.push({ sym: s, n, pay: payFor(s, n) }); stepRaw += payFor(s, n); } });
      if (!win.length) break;
      raw += stepRaw; const gone = board.map(r => r.map(c => isSym(c) && cnt[c] >= P.MIN));
      /* падение: оставшиеся уходят вниз, сверху — новые */
      const nb = Array.from({ length: ROWS }, () => Array(COLS).fill(null)), moves = [];
      for (let x = 0; x < COLS; x++) {
        const keep = []; for (let y = ROWS - 1; y >= 0; y--) if (!gone[y][x]) keep.push({ y, s: board[y][x] });
        let ty = ROWS - 1; const col = [];
        keep.forEach(k => { nb[ty][x] = k.s; col.push({ from: k.y, to: ty, s: k.s, isNew: false }); ty--; });
        let nn = 0; while (ty >= 0) { const s = cell(rng, o); nb[ty][x] = s; col.push({ from: -(++nn), to: ty, s, isNew: true }); ty--; }
        moves.push(col);
      }
      steps.push({ board: board.map(r => r.slice()), win, stepRaw, gone, moves, next: nb.map(r => r.slice()) });
      board = nb;
    }
    const scat = count(board, c => c === SCATTER), crys = board.flat().filter(isCr).map(c => CRYS[c - CR0].v);
    let mult = o.mult || 1, add = 0;
    if (o.fs && raw > 0) { add = crys.reduce((a, b) => a + b, 0); mult += add; }
    const total = o.fs ? raw * (raw > 0 ? mult : 1) : raw;
    return { first, steps, raw, total, scat, crys, mult, add, final: board };
  }
  /* целиком бонус: возвращает суммарный выигрыш (в ставках) и число спинов */
  function playBonus(rng, left = P.FS) { let mult = 1, tot = 0, n = 0; while (left-- > 0) { const r = play(rng, { fs: true, mult }); mult = r.mult; tot += r.total; n++; if (r.scat >= 3) left += P.RETRIG; if (n > 400) break; } return { total: tot, spins: n, mult }; }
  root.SlotEngine = { COLS, ROWS, SYM, SCATTER, SCATTER_G, CRYS, CR0, P, payFor, genBoard, play, playBonus, isSym, isCr };
  if (typeof module !== 'undefined') module.exports = root.SlotEngine;
})(typeof window !== 'undefined' ? window : globalThis);
