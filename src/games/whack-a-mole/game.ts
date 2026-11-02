import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_TIME = 30;
export const POINTS_PER_WHACK = 10;
export const MOLE_RADIUS = 38;
/** Seconds between pop-ups, from the start of the round to the end. */
export const SPAWN_INTERVAL = { start: 0.9, end: 0.35 } as const;
/** Seconds a mole stays up, from the start of the round to the end. */
export const UP_TIME = { start: 1.1, end: 0.55 } as const;
const BONK_TIME = 0.3;
const COLUMNS = [200, 400, 600];
const ROWS = [160, 280, 400];

export interface Hole {
  x: number;
  y: number;
  /** Seconds left before the mole drops back down; 0 when it is down. */
  up: number;
  /** Seconds left on the whacked mole's bonk; 0 when there is none. */
  bonk: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  timeLeft: number;
  spawnIn: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes = ROWS.flatMap((y) => COLUMNS.map((x) => ({ x, y, up: 0, bonk: 0 })));
  return { holes, timeLeft: ROUND_TIME, spawnIn: 0.5, score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
function progress(state: WhackAMoleState): number {
  return Math.min(Math.max(1 - state.timeLeft / ROUND_TIME, 0), 1);
}

function lerp(range: { start: number; end: number }, t: number): number {
  return range.start + (range.end - range.start) * t;
}

/** Seconds until the next mole pops up. Shrinks as the round goes on. */
export function spawnInterval(state: WhackAMoleState): number {
  return lerp(SPAWN_INTERVAL, progress(state));
}

/** Seconds a new mole stays up. Shrinks as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return lerp(UP_TIME, progress(state));
}

/** Where the mole's head is drawn, and where a click whacks it. */
function moleCenter(hole: Hole) {
  return { x: hole.x, y: hole.y - 22 };
}

/** Pops a mole up from a random empty hole. Returns false if every hole is busy. */
export function popUp(state: WhackAMoleState, random: () => number = Math.random): boolean {
  const empty = state.holes.filter((h) => h.up === 0 && h.bonk === 0);
  if (empty.length === 0) return false;
  const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
  hole.up = upTime(state);
  return true;
}

/** Whacks the mole under the click, if one is up there. Returns true on a hit. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => {
    const center = moleCenter(h);
    return h.up > 0 && Math.hypot(x - center.x, y - center.y) <= MOLE_RADIUS;
  });
  if (!hole) return false;
  hole.up = 0;
  hole.bonk = BONK_TIME;
  state.score += POINTS_PER_WHACK;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  if (state.phase !== 'playing') return;

  for (const hole of state.holes) {
    hole.up = Math.max(hole.up - dt, 0);
    hole.bonk = Math.max(hole.bonk - dt, 0);
  }

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  if (state.timeLeft === 0) {
    state.phase = 'over';
    for (const hole of state.holes) hole.up = 0;
    return;
  }

  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    popUp(state, random);
    state.spawnIn = spawnInterval(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The board the holes sit in.
  ctx.fillStyle = colors.surface;
  ctx.fillRect(100, 80, WIDTH - 200, 370);

  for (const hole of state.holes) {
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, 56, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0) {
      const center = moleCenter(hole);
      // Clip at the hole's rim so the mole looks like it pokes out of it.
      ctx.save();
      ctx.beginPath();
      ctx.rect(hole.x - 60, center.y - MOLE_RADIUS - 4, 120, hole.y - center.y + MOLE_RADIUS + 4);
      ctx.clip();
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.arc(center.x, center.y, MOLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(center.x - 12, center.y - 8, 5, 0, Math.PI * 2);
      ctx.arc(center.x + 12, center.y - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.danger;
      ctx.beginPath();
      ctx.arc(center.x, center.y + 6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (hole.bonk > 0) {
      const center = moleCenter(hole);
      ctx.globalAlpha = hole.bonk / BONK_TIME;
      ctx.fillStyle = colors.accent;
      ctx.font = canvasFont('title', 'bold');
      ctx.textAlign = 'center';
      ctx.fillText(`+${POINTS_PER_WHACK}`, center.x, center.y - (BONK_TIME - hole.bonk) * 80);
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get faster as the clock runs.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
