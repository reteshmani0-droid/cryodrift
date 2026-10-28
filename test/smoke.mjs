// Headless smoke test: builds each level and runs updates.
import { Save } from '../js/save.js';

const completed = [];
const g = {
  keys: {},
  once: {},
  save: Save,
  complete: (n) => { completed.push(n); },
  restartLevel: () => { throw new Error('restartLevel called in smoke'); },
  dialogue: (lines, cb) => { g.dialogueLines = lines; g.dialogueCb = cb; },
  consumeKeys() { const o = g.once; g.once = {}; return o; },
};

Save.load();

const { stealthLevel, mazeLevel, towerLevel } = await import('../js/worlds.js');
const { transitLevel } = await import('../js/transit.js');

function run(name, s, seconds) {
  let t = 0;
  while (t < seconds) {
    s.update(1 / 60);
    t += 1 / 60;
  }
  console.log(`${name}: updated ${seconds}s ok, completed=[${completed.length}]`);
}

run('stealth', stealthLevel(g), 3);
run('transit1', transitLevel(g, 1), 3);
run('maze', mazeLevel(g), 3);
run('tower', towerLevel(g), 5);

// ---- map integrity for the stealth level ----
const MAPROWS = [
  '##############################',
  '#............#..........b....#',
  '#....b....b..#...######b..b..#',
  '#..c.#####..b#.........b..c..#',
  '#....#...#....b..###..b#####.#',
  '#..f.#...b......#...b.....b..#',
  '#....#####..###.#.###.####...#',
  '#.......b.....#.....#.....b..#',
  '#..###.####...#..f..######...#',
  '#..#.....#....#####......#c..#',
  '#..#..f..#..........b....#...#',
  '#..#####.....####..b..####...#',
  '#.....b....E.#..b..f.#f......#',
  '#..f......P..#.....b......b..#',
  '##############################',
];
const W = 30, H = 15;
let problems = [];
if (MAPROWS.length !== H) problems.push(`rows ${MAPROWS.length} != ${H}`);
for (let y = 0; y < MAPROWS.length; y++) {
  if (MAPROWS[y].length !== W) problems.push(`row ${y} length ${MAPROWS[y].length}`);
  if (MAPROWS[y][0] !== '#' || MAPROWS[y][W - 1] !== '#') problems.push(`row ${y} side not solid`);
}
// counts
const counts = {};
MAPROWS.join('').split('').forEach((c) => counts[c] = (counts[c] || 0) + 1);
console.log('tile counts:', JSON.stringify(counts));
if (counts['c'] !== 3) problems.push('cells != 3');
if (counts['P'] !== 1) problems.push('starts != 1');
if (counts['E'] !== 1) problems.push('exit != 1');
// reachability BFS between key points
const grid = MAPROWS.map((r) => r.split(''));
const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y][x] !== '#' && grid[y][x] !== 'b';
const key = (x, y) => x + ',' + y;
let bfs = new Map([[key(2, 2), 0]]);  // start tile from P? find P
let P = null, E = null;
const cs = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (grid[y][x] === 'P') P = [x, y];
  if (grid[y][x] === 'E') E = [x, y];
  if (grid[y][x] === 'c') cs.push([x, y]);
}
bfs = new Map([[key(...P), 0]]);
const qq = [P];
while (qq.length) {
  const [x, y] = qq.shift();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (walk(nx, ny) && !bfs.has(key(nx, ny))) {
      bfs.set(key(nx, ny), bfs.get(key(x, y)) + 1);
      qq.push([nx, ny]);
    }
  }
}
for (const c of cs) if (!bfs.has(key(...c))) problems.push(`cell at ${c} unreachable`);
if (!bfs.has(key(...E))) problems.push(`exit at ${E} unreachable`);
console.log(problems.length ? 'MAP PROBLEMS: ' + problems.join('; ') : 'MAP OK: start->all cells+exit reachable');
if (problems.length) process.exit(1);
console.log('SMOKE PASS');
