import { describe, expect, it } from 'vitest';
import { jumpSpeed, stepHorizontal, targetSpeed, wishDirection, type MoveIntent } from './locomotion';
import { PLAYER } from '../config/game';

const none: MoveIntent = { forward: false, back: false, left: false, right: false, sprint: false };

describe('locomotion', () => {
  it('forward at yaw 0 heads north (-z)', () => {
    const d = wishDirection({ ...none, forward: true }, 0);
    expect(d.x).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(-1);
  });

  it('right strafe at yaw 0 heads east (+x)', () => {
    const d = wishDirection({ ...none, right: true }, 0);
    expect(d.x).toBeCloseTo(1);
    expect(d.z).toBeCloseTo(0);
  });

  it('walk is 1.3 m/s and sprint 3.5 m/s, sprint only forwards', () => {
    expect(targetSpeed({ ...none, forward: true }, PLAYER)).toBe(1.3);
    expect(targetSpeed({ ...none, forward: true, sprint: true }, PLAYER)).toBe(3.5);
    expect(targetSpeed({ ...none, back: true, sprint: true }, PLAYER)).toBe(1.3);
    expect(targetSpeed(none, PLAYER)).toBe(0);
  });

  it('reaches walking speed and never overshoots', () => {
    let v = { x: 0, z: 0 };
    for (let i = 0; i < 120; i++) v = stepHorizontal(v, { ...none, forward: true }, 0, true, 1 / 60, PLAYER);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(1.3, 5);
  });

  it('diagonal speed is not faster than straight', () => {
    let v = { x: 0, z: 0 };
    for (let i = 0; i < 120; i++) v = stepHorizontal(v, { ...none, forward: true, right: true }, 0.7, true, 1 / 60, PLAYER);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(1.3, 5);
  });

  it('jump clears about 0.45 m', () => {
    const v0 = jumpSpeed(PLAYER);
    expect((v0 * v0) / (2 * PLAYER.gravity)).toBeCloseTo(0.45, 6);
  });
});
