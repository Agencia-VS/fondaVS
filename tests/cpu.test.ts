import { describe, expect, it } from 'vitest';
import { CpuPlayer, DIFFICULTIES } from '@/game/cpu';
import { controlState, keyboardAction } from '@/game/controls';
import {
  advanceRound,
  applyAction,
  createRound,
  pauseRound,
  publicRound,
  resumeRound,
} from '@/game/engine';
import { SoloSession } from '@/game/solo';
import { GAMES, MEMORY_CARD_COUNT, TEAMS, ZONES } from '@/game/types';

describe('solo sessions', () => {
  for (const game of GAMES) {
    for (const team of TEAMS) {
      it(`${game} finishes with ${team} as the only human, even if the human is idle`, () => {
        const session = new SoloSession(
          team,
          game,
          'normal',
          0,
          `${game}-${team}`,
          [17, 31, 47, 53],
        );
        let view = session.view;
        for (let now = 0; now <= 600000 && view.phase !== 'finished'; now += 100) {
          view = session.tick(now);
        }
        expect(view.phase).toBe('finished');
        expect(new Set(view.placements.map((p) => p.team)).size).toBe(4);
        expect(view.placements.reduce((sum, p) => sum + p.points, 0)).toBe(10);
        expect(view.practice).toBe(true);
        if (view.data.kind === 'sack-race') {
          expect(view.data.steps[team]).toBe(0);
          for (const cpu of TEAMS.filter((t) => t !== team)) expect(view.data.steps[cpu]).toBe(30);
        } else if (view.data.kind === 'memory') {
          expect(view.data.matched).toHaveLength(MEMORY_CARD_COUNT);
          expect(view.data.scores[team]).toBe(0);
        } else if (view.data.kind === 'rayuela') {
          expect(view.data.throws).toHaveLength(12);
          expect(view.data.throws.filter((t) => t.timedOut).map((t) => t.team)).toEqual([
            team,
            team,
            team,
          ]);
        } else {
          expect(view.data.matches).toHaveLength(4);
          expect(view.data.matches.filter((m) => m.teams.includes(team))).toHaveLength(2);
        }
      });
    }
  }

  it('accepts human input, freezes all players while paused and resumes without a burst', () => {
    const session = new SoloSession('media', 'sack-race', 'normal', 0, 'pause', [1, 2, 3, 4]);
    session.tick(3100);
    session.action({ type: 'tap', side: 'left' }, 3200);
    expect(session.action({ type: 'tap', side: 'right' }, 3300).data).toMatchObject({
      steps: { media: 1 },
    });
    const before = session.pause(3400);
    expect(session.tick(103400)).toEqual(before);
    expect(session.action({ type: 'tap', side: 'left' }, 103400)).toEqual(before);
    const resumed = session.resume(103400);
    expect(resumed.startsAt).toBe(103000);
    expect(session.tick(103400).data).toEqual(resumed.data);
    session.tick(104400);
    expect(session.tick(104900).data).not.toEqual(resumed.data);
  });
});

describe('CPU fair play', () => {
  it('makes the same blind penalty choice regardless of the human secret, including on hard', () => {
    const choices = ZONES.map((zone) => {
      const round = applyAction(
        createRound('penalties', 0, 'p'),
        'creative',
        { type: 'shoot', zone },
        3100,
      ).round;
      const cpu = new CpuPlayer('lab', 'hard', 73);
      expect(cpu.next(publicRound(round), 3200)).toBeNull();
      const action = cpu.next(publicRound(round), 4300);
      expect(action?.type).toBe('shoot');
      expect(cpu.next(publicRound(round), 4400)).toBeNull();
      return action;
    });
    expect(choices.every((action) => JSON.stringify(action) === JSON.stringify(choices[0]))).toBe(
      true,
    );
  });

  it('cannot distinguish unseen memory boards', () => {
    const plans = [12, 27, 42].map((seed) => {
      let round = advanceRound(createRound('memory', 0, 'same-public-board', seed), 3000);
      const cpu = new CpuPlayer('creative', 'hard', 51);
      const actions = [];
      for (let now = 3000; now < 15000; now += 100) {
        const action = cpu.next(publicRound(round), now);
        if (!action) continue;
        actions.push(action);
        if (action.type === 'flip') break;
        round = applyAction(round, 'creative', action, now).round;
      }
      expect(actions.at(-1)?.type).toBe('flip');
      return actions;
    });
    expect(plans[0]).toEqual(plans[1]);
    expect(plans[1]).toEqual(plans[2]);
  });

  it('remembers a pair revealed on other teams turns, then walks to and flips both cards', () => {
    let round = advanceRound(createRound('memory', 0, 'remember', 17), 3000);
    if (round.data.kind !== 'memory') throw Error();
    const cards = round.data.cards;
    const first = 0;
    const second = cards.findIndex((v, i) => i !== first && v === cards[first]);
    const cpu = new CpuPlayer('creative', 'normal', 3);
    round.data.teamIndex = 1;
    round.data.open = [first];
    cpu.next(publicRound(round), 3100);
    round.data.open = [second];
    cpu.next(publicRound(round), 3200);
    round.data.open = [];
    round.data.teamIndex = 0;
    const flipped = [];
    for (let now = 3300; now < 15000 && flipped.length < 2; now += 100) {
      const action = cpu.next(publicRound(round), now);
      if (!action) continue;
      if (action.type === 'flip' && round.data.kind === 'memory') flipped.push(round.data.cursor);
      round = applyAction(round, 'creative', action, now).round;
    }
    expect(flipped).toEqual([first, second]);
    expect(round.data).toMatchObject({ scores: { creative: 1 } });
  });

  it('never acts during countdown, pause, results or another teams turn', () => {
    for (const difficulty of DIFFICULTIES) {
      const cpu = new CpuPlayer('sports', difficulty, 13);
      const countdown = createRound('rayuela', 0, difficulty);
      expect(cpu.next(publicRound(countdown), 500)).toBeNull();
      const playing = advanceRound(countdown, 3000);
      expect(cpu.next(publicRound(playing), 3100)).toBeNull();
      expect(cpu.next(publicRound(playing), 7000)).toBeNull();
      expect(cpu.next(publicRound(pauseRound(playing, 7100)), 30000)).toBeNull();
      const finished = { ...resumeRound(playing, 31000), phase: 'finished' as const };
      expect(cpu.next(publicRound(finished), 40000)).toBeNull();
    }
  });

  it('gives easy and hard opponents different race pace and rayuela accuracy', () => {
    const raceTimes = DIFFICULTIES.map((difficulty) => {
      const session = new SoloSession(
        'creative',
        'sack-race',
        difficulty,
        0,
        difficulty,
        [1, 21, 31, 41],
      );
      let view = session.view;
      for (let now = 0; now <= 93000; now += 50) view = session.tick(now);
      if (view.data.kind !== 'sack-race') throw Error();
      return view.data.finishedAt.lab;
    });
    expect(raceTimes[0]).toBeGreaterThan(raceTimes[1]);
    expect(raceTimes[1]).toBeGreaterThan(raceTimes[2]);
    const scores = DIFFICULTIES.map((difficulty) => {
      let total = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const session = new SoloSession('creative', 'rayuela', difficulty, 0, `${seed}`, [
          seed,
          seed + 20,
          seed + 40,
          seed + 60,
        ]);
        let view = session.view;
        for (let now = 0; now <= 180000 && view.phase !== 'finished'; now += 50)
          view = session.tick(now);
        if (view.data.kind !== 'rayuela') throw Error();
        total += view.data.scores.lab + view.data.scores.sports + view.data.scores.media;
      }
      return total;
    });
    expect(scores[0]).toBeLessThan(scores[1]);
    expect(scores[1]).toBeLessThan(scores[2]);
  });
});

describe('shared controls', () => {
  it('maps keyboard input to the same actions as the mobile pad', () => {
    expect(keyboardAction('sack-race', 'a')).toEqual({ type: 'tap', side: 'left' });
    expect(keyboardAction('sack-race', 'ArrowRight')).toEqual({ type: 'tap', side: 'right' });
    expect(keyboardAction('sack-race', 'ArrowUp')).toBeNull();
    expect(keyboardAction('penalties', '2')).toEqual({ type: 'shoot', zone: 'top-right' });
    expect(keyboardAction('penalties', '6')).toBeNull();
    expect(keyboardAction('memory', 'ArrowUp')).toEqual({ type: 'move', direction: 'up' });
    expect(keyboardAction('memory', ' ')).toEqual({ type: 'flip' });
    expect(keyboardAction('rayuela', ' ')).toEqual({ type: 'throw' });
  });

  it('locks controls after a penalty choice and preserves the timer during a pause', () => {
    let round = applyAction(
      createRound('penalties', 0, 'controls'),
      'creative',
      { type: 'shoot', zone: 'center' },
      3100,
    ).round;
    expect(controlState(publicRound(round), 'creative', 3200).canPlay).toBe(false);
    expect(controlState(publicRound(round), 'lab', 3200).canPlay).toBe(true);
    round = pauseRound(round, 3500);
    expect(controlState(publicRound(round), 'lab', 50000)).toMatchObject({
      canPlay: false,
      seconds: 5,
    });
  });
});
