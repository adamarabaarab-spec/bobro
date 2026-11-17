/* Чистая логика слота «Подарочный каскад» (без DOM) — можно гонять в node для проверки RTP */
(function (root) {
  const N = 5;
    const SYM = [
    { g: 136, base: 0.55, w: 27 },
    { g: 84,  base: 0.75, w: 24 },
    { g: 99,  base: 1.00, w: 19 },
    { g: 33,  base: 1.60, w: 14 },
    { g: 68,  base: 2.80, w: 10 },
    { g: 15,  base: 5.00, w: 6 },
  ];
  const SCATTER = 6;            // индекс символа-скаттера
  const SCATTER_G = 110;        // подарок для скаттера
  const SCATTER_P = 0.021;      // шанс скаттера на ячейку первичной доски
  const FACT = { 5: 1, 6: 1.5, 7: 2.2, 8: 3.2, 9: 4.6, 10: 6.5, 11: 9, 12: 13, 13: 18 };
  const factor = s => s >= 14 ? Math.min(150, 25 + (s - 13) * 9) : FACT[s];
  const totalW = SYM.reduce((a, s) => a + s.w, 0);

  function rs(rng) { let r = rng() * totalW; for (let i = 0; i < SYM.length; i++) { r -= SYM[i].w; if (r < 0) return i; } return 0; }
  function genBoard(rng, scat) {
    const b = [];
    for (let r = 0; r < N; r++) { b.push([]); for (let c = 0; c < N; c++) b[r].push(scat && rng() < SCATTER_P ? SCATTER : rs(rng)); }
    return b;
  }
  function clusters(b) {
    const seen = Array.from({ length: N }, () => Array(N).fill(false)), out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const s = b[r][c]; if (s === SCATTER || s == null || seen[r][c]) continue;
      const cells = [], st = [[r, c]]; seen[r][c] = true;
      while (st.length) {
        const [y, x] = st.pop(); cells.push([y, x]);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dy, dx]) => {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < N && nx >= 0 && nx < N && !seen[ny][nx] && b[ny][nx] === s) { seen[ny][nx] = true; st.push([ny, nx]); }
        });
      }
      if (cells.length >= 5) out.push({ sym: s, cells, mult: SYM[s].base * factor(cells.length) });
    }
    return out;
  }
  const countScat = b => b.flat().filter(x => x === SCATTER).length;

  /* Одна «прокрутка»: список шагов каскада. fsMult — накопительный множитель фриспинов (null = обычная игра). */
  function play(rng, opt = {}) {
    let board = opt.board || genBoard(rng, true);
    const first = board.map(r => r.slice());
    const scat = countScat(board);
    const steps = []; let total = 0, mult = opt.fsMult || 1, n = 0;
    while (true) {
      const cl = clusters(board); if (!cl.length) break; n++;
      const stepMult = opt.fs ? mult : n;                 // фриспин: растёт насквозь; база: x1,x2,x3 по цепочке
      const raw = cl.reduce((a, c) => a + c.mult, 0);
      const win = raw * stepMult; total += win;
      const gone = Array.from({ length: N }, () => Array(N).fill(false));
      cl.forEach(c => c.cells.forEach(([y, x]) => gone[y][x] = true));
      const moves = [], nb = Array.from({ length: N }, () => Array(N).fill(null));
      for (let x = 0; x < N; x++) {
        const keep = []; for (let y = N - 1; y >= 0; y--) if (!gone[y][x]) keep.push({ y, s: board[y][x] });
        let ty = N - 1; const col = [];
        keep.forEach(k => { nb[ty][x] = k.s; col.push({ from: k.y, to: ty, s: k.s, isNew: false }); ty--; });
        let nn = 0; while (ty >= 0) { const s = rs(rng); nb[ty][x] = s; col.push({ from: -(++nn), to: ty, s, isNew: true }); ty--; }
        moves.push(col);
      }
      steps.push({ board: board.map(r => r.slice()), clusters: cl, win, stepMult, moves, next: nb.map(r => r.slice()) });
      board = nb; if (opt.fs) mult++;
    }
    return { first, scat, steps, total, endMult: mult };
  }
  root.SlotEngine = { N, SYM, SCATTER, SCATTER_G, genBoard, clusters, play, countScat, factor };
  if (typeof module !== 'undefined') module.exports = root.SlotEngine;
})(typeof window !== 'undefined' ? window : globalThis);
