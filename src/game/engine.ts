import {
  Action,
  Game,
  MemoryData,
  PenaltiesData,
  Placement,
  PublicRound,
  Round,
  Scores,
  Team,
  TEAMS,
  MEMORY_CARD_COUNT,
  MEMORY_PAIR_COUNT,
  MEMORY_SIDE,
  zeroScores,
} from './types';

export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function rankScores(scores: Scores, lowerWins = false): Placement[] {
  const teams = [...TEAMS].sort((a, b) =>
    lowerWins ? scores[a] - scores[b] : scores[b] - scores[a],
  );
  return teams.map((team) => {
    const i = teams.findIndex((t) => scores[t] === scores[team]);
    const count = teams.filter((t) => scores[t] === scores[team]).length;
    return { team, rank: i + 1, points: 4 - i - (count - 1) / 2, value: scores[team] };
  });
}
function ordered(teams: Team[]): Placement[] {
  return teams.map((team, i) => ({ team, rank: i + 1, points: 4 - i, value: 4 - i }));
}
export function rayuelaX(elapsed: number): number {
  return Math.sin((elapsed / 3000) * Math.PI * 2);
}
export function rayuelaPoints(x: number): number {
  const d = Math.abs(x);
  return d <= 0.1 ? 100 : d <= 0.25 ? 60 : d <= 0.5 ? 30 : 10;
}
function newMatch(
  match: number,
  matches: PenaltiesData['matches'],
  now: number,
  seed: number,
  shotId = 1,
): PenaltiesData {
  const teams: [Team, Team] =
    match === 0
      ? ['creative', 'lab']
      : match === 1
        ? ['sports', 'media']
        : match === 2
          ? [matches[0].loser, matches[1].loser]
          : [matches[0].winner, matches[1].winner];
  return {
    kind: 'penalties',
    match,
    teams,
    goals: [0, 0],
    taken: [0, 0],
    kicker: 0,
    choices: {},
    phase: 'select',
    phaseEndsAt: now + 5000,
    shotId,
    lastShot: null,
    matches,
    seed,
  };
}
export function createRound(
  game: Game,
  now: number,
  id: string,
  seed = 1,
  practice = false,
): Round {
  const startsAt = now + 3000;
  const data =
    game === 'sack-race'
      ? {
          kind: game,
          steps: zeroScores(),
          expected: { creative: 'left', lab: 'left', sports: 'left', media: 'left' } as Record<
            Team,
            'left' | 'right'
          >,
          cooldowns: zeroScores(),
          finishedAt: zeroScores(),
        }
      : game === 'rayuela'
        ? {
            kind: game,
            turn: 0,
            phase: 'aim' as const,
            phaseEndsAt: startsAt + 10000,
            aimStartedAt: startsAt,
            scores: zeroScores(),
            throws: [],
          }
        : game === 'memory'
          ? {
              kind: game,
              cards: shuffle(
                [...Array(MEMORY_CARD_COUNT)].map((_, i) => i % MEMORY_PAIR_COUNT),
                seed,
              ),
              matched: [],
              open: [],
              cursor: 0,
              teamIndex: 0,
              phase: 'pick' as const,
              phaseEndsAt: startsAt + 15000,
              scores: zeroScores(),
            }
          : newMatch(0, [], startsAt, seed);
  return {
    id,
    game,
    practice,
    phase: 'countdown',
    startsAt,
    endsAt:
      startsAt +
      (game === 'sack-race'
        ? 90000
        : game === 'memory'
          ? 420000
          : game === 'rayuela'
            ? 180000
            : 900000),
    pausedAt: null,
    data,
    placements: [],
  };
}
function shuffle(a: number[], seed: number): number[] {
  const rng = random(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function finish(r: Round, placements: Placement[]) {
  r.phase = 'finished';
  r.placements = placements;
}
function nextMemory(d: MemoryData, now: number, same = false) {
  if (!same) d.teamIndex = (d.teamIndex + 1) % 4;
  d.open = [];
  d.phase = 'pick';
  d.phaseEndsAt = now + 15000;
  d.cursor = d.cards.findIndex((_, i) => !d.matched.includes(i));
}
export function matchWinner(d: PenaltiesData): { index: 0 | 1; lottery: boolean } | null {
  const [a, b] = d.goals;
  const [ta, tb] = d.taken;
  if (ta <= 3 && tb <= 3) {
    if (a > b + Math.max(0, 3 - tb)) return { index: 0, lottery: false };
    if (b > a + Math.max(0, 3 - ta)) return { index: 1, lottery: false };
  }
  if (ta === tb && ta >= 3 && a !== b) return { index: a > b ? 0 : 1, lottery: false };
  if (ta === tb && ta >= 6)
    return { index: random(d.seed + d.match)() < 0.5 ? 0 : 1, lottery: true };
  return null;
}
function revealShot(d: PenaltiesData, now: number) {
  const kicker = d.teams[d.kicker];
  const keeper = d.teams[1 - d.kicker];
  const kick = d.choices[kicker] ?? 'center';
  const save = d.choices[keeper] ?? 'center';
  const goal = kick !== save;
  d.taken[d.kicker]++;
  if (goal) d.goals[d.kicker]++;
  d.lastShot = { kicker, keeper, kick, save, goal };
  d.phase = 'reveal';
  d.phaseEndsAt = now + 2500;
}
function tick(r: Round, now: number) {
  if (r.pausedAt !== null || r.phase === 'finished') return;
  if (now < r.startsAt) return;
  r.phase = 'playing';
  const d = r.data;
  if (d.kind === 'sack-race') {
    if (now >= r.endsAt || TEAMS.every((t) => d.finishedAt[t] > 0)) {
      const values = zeroScores();
      for (const t of TEAMS)
        values[t] =
          d.finishedAt[t] > 0 ? 1_000_000 - (d.finishedAt[t] - r.startsAt) / 1000 : d.steps[t];
      finish(r, rankScores(values));
    }
    return;
  }
  if (d.kind === 'memory') {
    if (now >= r.endsAt || d.matched.length === MEMORY_CARD_COUNT) {
      finish(r, rankScores(d.scores));
      return;
    }
    if (now >= d.phaseEndsAt) {
      const match =
        d.phase === 'reveal' && d.open.length === 2 && d.cards[d.open[0]] === d.cards[d.open[1]];
      nextMemory(d, now, match);
    }
    return;
  }
  if (d.kind === 'rayuela') {
    if (now >= d.phaseEndsAt) {
      if (d.phase === 'aim') {
        d.throws.push({ team: TEAMS[d.turn % 4], x: 0, points: 0, timedOut: true });
        d.phase = 'reveal';
        d.phaseEndsAt = now + 2000;
      } else if (d.turn === 11) finish(r, rankScores(d.scores));
      else {
        d.turn++;
        d.phase = 'aim';
        d.aimStartedAt = now;
        d.phaseEndsAt = now + 10000;
      }
    }
    return;
  }
  if (now >= d.phaseEndsAt) {
    if (d.phase === 'select') revealShot(d, now);
    else if (d.phase === 'between') {
      if (d.match === 3) {
        finish(
          r,
          ordered([
            d.matches[3].winner,
            d.matches[3].loser,
            d.matches[2].winner,
            d.matches[2].loser,
          ]),
        );
      } else r.data = newMatch(d.match + 1, d.matches, now, d.seed, d.shotId + 1);
    } else {
      const winner = matchWinner(d);
      if (winner) {
        const i = winner.index;
        d.matches.push({
          teams: d.teams,
          goals: d.goals,
          winner: d.teams[i],
          loser: d.teams[1 - i],
          lottery: winner.lottery,
        });
        d.phase = 'between';
        d.phaseEndsAt = now + 4000;
      } else {
        d.kicker = d.kicker === 0 ? 1 : 0;
        d.choices = {};
        d.phase = 'select';
        d.phaseEndsAt = now + 5000;
        d.shotId++;
      }
    }
  }
}
export function advanceRound(round: Round, now: number): Round {
  const r = structuredClone(round);
  tick(r, now);
  return r;
}
export function applyAction(
  round: Round,
  team: Team,
  action: Action,
  now: number,
): { round: Round; accepted: boolean } {
  const r = advanceRound(round, now);
  if (r.phase !== 'playing' || r.pausedAt !== null) return { round: r, accepted: false };
  const d = r.data;
  let accepted = false;
  if (
    d.kind === 'sack-race' &&
    action.type === 'tap' &&
    !d.finishedAt[team] &&
    now >= d.cooldowns[team]
  ) {
    accepted = true;
    if (d.expected[team] !== action.side) {
      d.cooldowns[team] = now + 1000;
      d.expected[team] = 'left';
    } else if (action.side === 'left') d.expected[team] = 'right';
    else {
      d.expected[team] = 'left';
      d.steps[team]++;
      if (d.steps[team] >= 30) d.finishedAt[team] = now;
    }
    tick(r, now);
  } else if (
    d.kind === 'rayuela' &&
    action.type === 'throw' &&
    d.phase === 'aim' &&
    TEAMS[d.turn % 4] === team
  ) {
    const x = rayuelaX(now - d.aimStartedAt);
    const points = rayuelaPoints(x);
    d.scores[team] += points;
    d.throws.push({ team, x, points, timedOut: false });
    d.phase = 'reveal';
    d.phaseEndsAt = now + 2000;
    accepted = true;
  } else if (
    d.kind === 'penalties' &&
    action.type === 'shoot' &&
    d.phase === 'select' &&
    d.teams.includes(team) &&
    d.choices[team] === undefined
  ) {
    d.choices[team] = action.zone;
    accepted = true;
    if (d.teams.every((t) => d.choices[t] !== undefined)) revealShot(d, now);
  } else if (d.kind === 'memory' && TEAMS[d.teamIndex] === team && d.phase === 'pick') {
    if (action.type === 'move') {
      const c = d.cursor;
      const row = Math.floor(c / MEMORY_SIDE);
      const col = c % MEMORY_SIDE;
      d.cursor =
        action.direction === 'up'
          ? Math.max(0, row - 1) * MEMORY_SIDE + col
          : action.direction === 'down'
            ? Math.min(MEMORY_SIDE - 1, row + 1) * MEMORY_SIDE + col
            : action.direction === 'left'
              ? row * MEMORY_SIDE + Math.max(0, col - 1)
              : row * MEMORY_SIDE + Math.min(MEMORY_SIDE - 1, col + 1);
      accepted = true;
    } else if (
      action.type === 'flip' &&
      !d.matched.includes(d.cursor) &&
      !d.open.includes(d.cursor)
    ) {
      d.open.push(d.cursor);
      accepted = true;
      if (d.open.length === 2) {
        if (d.cards[d.open[0]] === d.cards[d.open[1]]) {
          d.matched.push(...d.open);
          d.scores[team]++;
        }
        d.phase = 'reveal';
        d.phaseEndsAt = now + 1500;
      }
    }
  }
  return { round: r, accepted };
}
export function pauseRound(round: Round, now: number): Round {
  return { ...round, pausedAt: round.phase === 'finished' ? null : (round.pausedAt ?? now) };
}
export function resumeRound(round: Round, now: number): Round {
  const r = structuredClone(round);
  if (r.pausedAt === null) return r;
  const delta = now - r.pausedAt;
  r.startsAt += delta;
  r.endsAt += delta;
  r.pausedAt = null;
  const d = r.data;
  if (d.kind === 'sack-race') {
    for (const t of TEAMS) {
      if (d.cooldowns[t]) d.cooldowns[t] += delta;
      if (d.finishedAt[t]) d.finishedAt[t] += delta;
    }
  } else {
    d.phaseEndsAt += delta;
    if (d.kind === 'rayuela') d.aimStartedAt += delta;
  }
  return r;
}
export function publicRound(round: Round): PublicRound {
  const r = structuredClone(round);
  if (r.data.kind === 'penalties') {
    const { choices, seed: _, ...data } = r.data;
    void _;
    return { ...r, data: { ...data, selected: Object.keys(choices) as Team[] } };
  }
  if (r.data.kind === 'memory') {
    const d = r.data;
    return {
      ...r,
      data: {
        ...d,
        cards: d.cards.map((v, i) => (d.open.includes(i) || d.matched.includes(i) ? v : null)),
      },
    };
  }
  return r as PublicRound;
}
export function turnKey(round: Round | PublicRound): string {
  const d = round.data;
  return d.kind === 'penalties'
    ? `shot-${d.shotId}`
    : d.kind === 'rayuela'
      ? `throw-${d.turn}`
      : d.kind === 'memory'
        ? `memory-${d.teamIndex}-${d.phaseEndsAt}`
        : 'race';
}
