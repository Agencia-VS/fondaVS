import { describe, it, expect } from 'vitest';
import {
  advanceRound,
  applyAction,
  createRound,
  matchWinner,
  pauseRound,
  publicRound,
  rankScores,
  rayuelaPoints,
  resumeRound,
} from '@/game/engine';
import { CommandGate, commandSchema } from '@/game/protocol';
import {
  MEMORY_CARD_COUNT,
  MEMORY_PAIR_COUNT,
  MEMORY_COLUMNS,
  MEMORY_ICONS,
  Round,
  TEAMS,
  zeroScores,
} from '@/game/types';

describe('sack race', () => {
  it('requires a complete alternating pair, applies a one-second stumble and ignores cooldown input', () => {
    let r = createRound('sack-race', 0, 'race');
    expect(applyAction(r, 'creative', { type: 'tap', side: 'left' }, 2000).accepted).toBe(false);
    r = applyAction(r, 'creative', { type: 'tap', side: 'left' }, 3000).round;
    r = applyAction(r, 'creative', { type: 'tap', side: 'right' }, 3100).round;
    expect(r.data.kind === 'sack-race' && r.data.steps.creative).toBe(1);
    r = applyAction(r, 'creative', { type: 'tap', side: 'right' }, 3200).round;
    expect(applyAction(r, 'creative', { type: 'tap', side: 'left' }, 4199).accepted).toBe(false);
    expect(applyAction(r, 'creative', { type: 'tap', side: 'left' }, 4200).accepted).toBe(true);
  });
  it('finishes with all four teams and cannot score beyond the finish line', () => {
    let r = createRound('sack-race', 0, 'race');
    let now = 3000;
    for (const t of TEAMS) {
      for (let j = 0; j < 30; j++) {
        r = applyAction(r, t, { type: 'tap', side: 'left' }, (now += 100)).round;
        r = applyAction(r, t, { type: 'tap', side: 'right' }, (now += 100)).round;
      }
    }
    expect(r.phase).toBe('finished');
    expect(r.placements.map((p) => p.team)).toEqual(TEAMS);
    expect(applyAction(r, 'creative', { type: 'tap', side: 'left' }, now + 500).accepted).toBe(
      false,
    );
  });
  it('ranks unfinished racers by completed steps at timeout', () => {
    let r = createRound('sack-race', 0, 'race');
    r = applyAction(r, 'media', { type: 'tap', side: 'left' }, 3000).round;
    r = applyAction(r, 'media', { type: 'tap', side: 'right' }, 3100).round;
    r = advanceRound(r, 93000);
    expect(r.phase).toBe('finished');
    expect(r.placements[0].team).toBe('media');
  });
});
describe('rayuela', () => {
  it('scores bands at exact boundaries', () => {
    expect([0, 0.1, 0.25, 0.5, 0.9].map(rayuelaPoints)).toEqual([100, 100, 60, 30, 10]);
    expect(rayuelaPoints(-0.1)).toBe(100);
  });
  it('accepts only the active team once, then moves to the next team', () => {
    let r = createRound('rayuela', 0, 'ray');
    expect(applyAction(r, 'lab', { type: 'throw' }, 3100).accepted).toBe(false);
    r = applyAction(r, 'creative', { type: 'throw' }, 3000).round;
    expect(r.data.kind === 'rayuela' && r.data.scores.creative).toBe(100);
    expect(applyAction(r, 'creative', { type: 'throw' }, 3001).accepted).toBe(false);
    r = advanceRound(r, 5000);
    expect(r.data.kind === 'rayuela' && r.data.turn).toBe(1);
  });
  it('advances all twelve timed-out throws and finishes', () => {
    let r = createRound('rayuela', 0, 'ray');
    for (let i = 0; i < 12; i++) {
      if (r.data.kind !== 'rayuela') throw Error();
      r = advanceRound(r, r.data.phaseEndsAt);
      if (r.data.kind !== 'rayuela') throw Error();
      r = advanceRound(r, r.data.phaseEndsAt);
    }
    expect(r.phase).toBe('finished');
    expect(r.placements.every((p) => p.points === 2.5)).toBe(true);
  });
});
describe('penalties', () => {
  it('keeps choices secret and locks the first choice', () => {
    let r = createRound('penalties', 0, 'pen');
    r = applyAction(r, 'creative', { type: 'shoot', zone: 'top-left' }, 3001).round;
    const view = publicRound(r);
    expect(view.data).not.toHaveProperty('choices');
    expect(view.data).not.toHaveProperty('seed');
    expect(JSON.stringify(view)).not.toContain('top-left');
    expect(applyAction(r, 'creative', { type: 'shoot', zone: 'center' }, 3002).accepted).toBe(
      false,
    );
    r = applyAction(r, 'lab', { type: 'shoot', zone: 'center' }, 3003).round;
    expect(r.data.kind === 'penalties' && r.data.lastShot?.goal).toBe(true);
  });
  it('defaults both missing choices to center exactly at the deadline', () => {
    let r = createRound('penalties', 0, 'pen');
    const res = applyAction(r, 'creative', { type: 'shoot', zone: 'top-left' }, 8000);
    expect(res.accepted).toBe(false);
    r = res.round;
    expect(r.data.kind === 'penalties' && r.data.lastShot).toMatchObject({
      kick: 'center',
      save: 'center',
      goal: false,
    });
  });
  it('does not end sudden death before equal numbers of kicks', () => {
    const r = createRound('penalties', 0, 'p');
    if (r.data.kind !== 'penalties') throw Error();
    r.data.taken = [4, 3];
    r.data.goals = [4, 3];
    expect(matchWinner(r.data)).toBeNull();
    r.data.taken = [4, 4];
    expect(matchWinner(r.data)).toEqual({ index: 0, lottery: false });
  });
  it('completes the whole playoff even when nobody touches their phone', () => {
    let r = createRound('penalties', 0, 'pen', 42);
    for (let i = 0; i < 110 && r.phase !== 'finished'; i++) {
      if (r.data.kind !== 'penalties') throw Error();
      r = advanceRound(r, r.data.phaseEndsAt);
    }
    expect(r.phase).toBe('finished');
    if (r.data.kind !== 'penalties') throw Error();
    expect(r.data.matches).toHaveLength(4);
    expect(r.data.matches.every((m) => m.lottery)).toBe(true);
    expect(new Set(r.placements.map((p) => p.team)).size).toBe(4);
    for (const t of TEAMS)
      expect(r.data.matches.filter((m) => m.teams.includes(t))).toHaveLength(2);
  });
});
function moveTo(r: Round, index: number, now: number): Round {
  if (r.data.kind !== 'memory') throw Error();
  const team = TEAMS[r.data.teamIndex];
  while (r.data.kind === 'memory' && r.data.cursor !== index) {
    const cursor = r.data.cursor;
    const direction =
      Math.floor(cursor / MEMORY_COLUMNS) < Math.floor(index / MEMORY_COLUMNS)
        ? 'down'
        : Math.floor(cursor / MEMORY_COLUMNS) > Math.floor(index / MEMORY_COLUMNS)
          ? 'up'
          : cursor % MEMORY_COLUMNS < index % MEMORY_COLUMNS
            ? 'right'
            : 'left';
    r = applyAction(r, team, { type: 'move', direction }, now).round;
  }
  return r;
}
describe('memorice', () => {
  it('shuffles fifteen illustrated pairs on a 6x5 board and never publishes hidden cards', () => {
    const r = createRound('memory', 0, 'm', 17);
    if (r.data.kind !== 'memory') throw Error();
    for (let i = 0; i < MEMORY_PAIR_COUNT; i++)
      expect(r.data.cards.filter((x) => x === i)).toHaveLength(2);
    expect(r.data.cards).toHaveLength(30);
    expect(MEMORY_ICONS).toHaveLength(15);
    expect(r.data.cards.every((id) => Boolean(MEMORY_ICONS[id]))).toBe(true);
    expect(publicRound(r).data).toMatchObject({ cards: Array(MEMORY_CARD_COUNT).fill(null) });
  });
  it('rejects a double flip of the same card and expires a one-card turn', () => {
    let r = createRound('memory', 0, 'm');
    r = applyAction(r, 'creative', { type: 'flip' }, 3000).round;
    expect(applyAction(r, 'creative', { type: 'flip' }, 3001).accepted).toBe(false);
    expect(applyAction(r, 'lab', { type: 'move', direction: 'right' }, 3001).accepted).toBe(false);
    r = advanceRound(r, 18000);
    expect(r.data).toMatchObject({ teamIndex: 1, open: [], phase: 'pick' });
  });
  it('reaches all 30 cells and clamps movement to six columns and five rows', () => {
    let r = createRound('memory', 0, 'edges');
    for (let index = 0; index < 30; index++) {
      r = moveTo(r, index, 3100);
      expect(r.data).toMatchObject({ cursor: index });
    }
    for (const [cursor, direction] of [
      [0, 'up'],
      [0, 'left'],
      [5, 'right'],
      [5, 'up'],
      [24, 'left'],
      [24, 'down'],
      [29, 'right'],
      [29, 'down'],
    ] as const) {
      r = moveTo(r, cursor, 3100);
      r = applyAction(r, 'creative', { type: 'move', direction }, 3100).round;
      expect(r.data).toMatchObject({ cursor });
    }
    r = applyAction(r, 'creative', { type: 'flip' }, 3100).round;
    expect(r.data).toMatchObject({ open: [29] });
    expect(publicRound(r).data).toMatchObject({
      cards: expect.arrayContaining([expect.any(Number)]),
    });
  });
  it('shows a mismatch, blocks movement during reveal, then passes the turn', () => {
    let r = createRound('memory', 0, 'm');
    if (r.data.kind !== 'memory') throw Error();
    const cards = r.data.cards;
    const mismatch = cards.findIndex((x) => x !== cards[0]);
    r = applyAction(r, 'creative', { type: 'flip' }, 3000).round;
    r = moveTo(r, mismatch, 3100);
    r = applyAction(r, 'creative', { type: 'flip' }, 3200).round;
    expect(applyAction(r, 'creative', { type: 'move', direction: 'left' }, 3300).accepted).toBe(
      false,
    );
    r = advanceRound(r, 4700);
    expect(r.data).toMatchObject({ teamIndex: 1, open: [] });
  });
  it('awards a match, repeats the team turn and ends after all pairs', () => {
    let r = createRound('memory', 0, 'm', 9);
    let now = 3100;
    if (r.data.kind !== 'memory') throw Error();
    const cards = [...r.data.cards];
    for (let icon = 0; icon < MEMORY_PAIR_COUNT; icon++) {
      const pair = cards.flatMap((v, i) => (v === icon ? [i] : []));
      r = moveTo(r, pair[0], now);
      r = applyAction(r, 'creative', { type: 'flip' }, now).round;
      r = moveTo(r, pair[1], now + 1);
      r = applyAction(r, 'creative', { type: 'flip' }, now + 2).round;
      now += 1600;
      r = advanceRound(r, now);
    }
    expect(r.phase).toBe('finished');
    expect(r.placements[0].team).toBe('creative');
    expect(r.data.kind === 'memory' && r.data.scores.creative).toBe(MEMORY_PAIR_COUNT);
  });
});
describe('shared safeguards', () => {
  it('freezes countdown and turn timers while paused', () => {
    let r = createRound('penalties', 0, 'p');
    r = pauseRound(r, 4000);
    expect(applyAction(r, 'creative', { type: 'shoot', zone: 'center' }, 10000).accepted).toBe(
      false,
    );
    r = advanceRound(r, 10000);
    expect(r.data.kind === 'penalties' && r.data.phase).toBe('select');
    r = resumeRound(r, 14000);
    expect(r.data.kind === 'penalties' && r.data.phaseEndsAt).toBe(18000);
  });
  it('distributes exactly ten championship points even with ties', () => {
    const p = rankScores({ ...zeroScores(), creative: 100, lab: 50, sports: 50, media: 0 });
    expect(p.map((x) => x.points)).toEqual([4, 2.5, 2.5, 1]);
    expect(p.reduce((n, x) => n + x.points, 0)).toBe(10);
  });
  it('acknowledges duplicates without executing and waits for gaps', () => {
    const gate = new CommandGate();
    expect(gate.check('m', 1, 0)).toBe('ok');
    expect(gate.check('m', 1, 1)).toBe('duplicate');
    expect(gate.check('m', 3, 2)).toBe('gap');
    expect(gate.check('m', 2, 3)).toBe('ok');
    expect(gate.check('m', 3, 4)).toBe('ok');
  });
  it('rate limits inputs while consuming their sequence', () => {
    const gate = new CommandGate();
    for (let i = 1; i <= 12; i++) expect(gate.check('m', i, i)).toBe('ok');
    expect(gate.check('m', 13, 20)).toBe('rate');
    expect(gate.check('m', 14, 1001)).toBe('ok');
  });
  it('rejects forged directions and scores in the input protocol', () => {
    expect(
      commandSchema.safeParse({
        version: 1,
        memberId: 'm',
        hostEpoch: 1,
        roundId: 'r',
        turnId: 'x',
        seq: 1,
        action: { type: 'shoot', zone: 'impossible' },
      }).success,
    ).toBe(false);
    expect(commandSchema.safeParse({ action: { type: 'add-points', points: 999 } }).success).toBe(
      false,
    );
  });
});
