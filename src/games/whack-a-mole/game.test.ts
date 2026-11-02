import { describe, expect, it } from 'vitest';
import {
  POINTS_PER_WHACK,
  ROUND_TIME,
  SPAWN_INTERVAL,
  UP_TIME,
  createState,
  popUp,
  spawnInterval,
  step,
  upTime,
  whack,
} from './game';

/** Where a mole in this hole is whacked: its head sits just above the hole. */
const headOf = (hole: { x: number; y: number }) => ({ x: hole.x, y: hole.y - 22 });

describe('whack-a-mole', () => {
  it('starts a full round with nine empty holes and no score', () => {
    const state = createState();
    expect(state.holes).toHaveLength(9);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
    expect(state.timeLeft).toBe(ROUND_TIME);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('pops a mole up after a short wait', () => {
    const state = createState();
    step(state, 0.6, () => 0);
    expect(state.holes[0].up).toBeGreaterThan(0);
    expect(state.holes.filter((h) => h.up > 0)).toHaveLength(1);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    popUp(state, () => 0);
    const up = state.holes[0].up;
    state.spawnIn = 99;
    step(state, up + 0.01);
    expect(state.holes[0].up).toBe(0);
  });

  it('scores a whack on a mole that is up and sends it down', () => {
    const state = createState();
    popUp(state, () => 0);
    const { x, y } = headOf(state.holes[0]);
    expect(whack(state, x, y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_WHACK);
    expect(state.holes[0].up).toBe(0);
  });

  it('scores nothing for a click on an empty hole or a miss', () => {
    const state = createState();
    popUp(state, () => 0);
    const empty = headOf(state.holes[4]);
    expect(whack(state, empty.x, empty.y)).toBe(false);
    expect(whack(state, 10, 10)).toBe(false);
    expect(state.score).toBe(0);
    expect(state.holes[0].up).toBeGreaterThan(0);
  });

  it('cannot whack the same mole twice', () => {
    const state = createState();
    popUp(state, () => 0);
    const { x, y } = headOf(state.holes[0]);
    whack(state, x, y);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_WHACK);
  });

  it('pops moles up faster, and for less time, as the round goes on', () => {
    const state = createState();
    expect(spawnInterval(state)).toBe(SPAWN_INTERVAL.start);
    expect(upTime(state)).toBe(UP_TIME.start);
    state.timeLeft = ROUND_TIME / 2;
    expect(spawnInterval(state)).toBeLessThan(SPAWN_INTERVAL.start);
    expect(upTime(state)).toBeLessThan(UP_TIME.start);
    state.timeLeft = 0;
    expect(spawnInterval(state)).toBeCloseTo(SPAWN_INTERVAL.end);
    expect(upTime(state)).toBeCloseTo(UP_TIME.end);
  });

  it('only pops up from an empty hole', () => {
    const state = createState();
    for (let i = 0; i < 9; i++) expect(popUp(state, () => 0)).toBe(true);
    expect(state.holes.every((h) => h.up > 0)).toBe(true);
    expect(popUp(state, () => 0)).toBe(false);
  });

  it('ends the round when the time runs out, with every mole down', () => {
    const state = createState();
    popUp(state, () => 0);
    state.timeLeft = 0.01;
    step(state, 0.05);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('cannot whack after the round is over', () => {
    const state = createState();
    popUp(state, () => 0);
    state.phase = 'over';
    const { x, y } = headOf(state.holes[0]);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
