import { random, turnKey } from './engine';
import { Action, MEMORY_COLUMNS, PublicMemory, PublicRound, Team, TEAMS, ZONES } from './types';

export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_INFO: Record<Difficulty, { name: string; description: string }> = {
  easy: { name: 'Suave', description: 'Para aprender los controles y tomar ritmo.' },
  normal: { name: 'Al medio', description: 'Una competencia pareja, con margen para equivocarse.' },
  hard: { name: 'Brava', description: 'Más ritmo, mejor puntería y más memoria.' },
};
const SKILL = {
  easy: { tap: 330, mistake: 0.045, aimError: 340, memory: 8, move: 360 },
  normal: { tap: 235, mistake: 0.025, aimError: 210, memory: 12, move: 230 },
  hard: { tap: 165, mistake: 0.01, aimError: 100, memory: 18, move: 150 },
};

/** A CPU can only receive the same redacted view as a human controller. */
export class CpuPlayer {
  private readonly rng: () => number;
  private readonly skill;
  private roundId = '';
  private context = '';
  private nextAt = 0;
  private target: number | null = null;
  private memory = new Map<number, number>();
  private visible = new Set<number>();

  constructor(
    readonly team: Team,
    difficulty: Difficulty,
    seed: number,
  ) {
    this.rng = random(seed);
    this.skill = SKILL[difficulty];
  }

  private between(min: number, max: number) {
    return min + this.rng() * (max - min);
  }

  private observe(data: PublicMemory) {
    // Observe new reveals, including other teams' turns. Repeated snapshots do
    // not refresh the whole memory; older observations really can be forgotten.
    const visible = new Set<number>();
    for (let i = 0; i < data.cards.length; i++) {
      if (data.matched.includes(i)) {
        this.memory.delete(i);
        continue;
      }
      const card = data.cards[i];
      if (card === null) continue;
      visible.add(i);
      if (!this.visible.has(i)) {
        this.memory.delete(i);
        this.memory.set(i, card);
        while (this.memory.size > this.skill.memory) {
          this.memory.delete(this.memory.keys().next().value!);
        }
      }
    }
    this.visible = visible;
  }

  private chooseCard(data: PublicMemory): number | null {
    const available = data.cards
      .map((_, i) => i)
      .filter((i) => !data.matched.includes(i) && !data.open.includes(i));
    if (!available.length) return null;
    if (data.open.length === 1) {
      const value = data.cards[data.open[0]];
      const partner = available.find((i) => this.memory.get(i) === value);
      if (partner !== undefined) return partner;
    } else {
      const pair = available.find((i) => {
        const value = this.memory.get(i);
        return (
          value !== undefined && available.some((j) => i !== j && this.memory.get(j) === value)
        );
      });
      if (pair !== undefined) return pair;
    }
    const unseen = available.filter((i) => !this.memory.has(i));
    const options = unseen.length ? unseen : available;
    return options[Math.floor(this.rng() * options.length)];
  }

  next(round: PublicRound, now: number): Action | null {
    if (round.id !== this.roundId) {
      this.roundId = round.id;
      this.context = '';
      this.memory.clear();
      this.visible.clear();
    }
    const d = round.data;
    if (d.kind === 'memory') this.observe(d);
    if (round.phase !== 'playing' || round.pausedAt !== null) return null;

    // startsAt changes on resume: give the CPU a fresh reaction delay rather
    // than executing an overdue move as soon as the player unpauses.
    const context = `${round.startsAt}:${turnKey(round)}:${'phase' in d ? d.phase : ''}:${d.kind === 'memory' ? d.open.join(',') : ''}`;
    if (context !== this.context) {
      this.context = context;
      this.target = null;
      this.nextAt = now + this.between(450, 950);
      if (d.kind === 'rayuela' && d.phase === 'aim') {
        // Aim for a visible center crossing, with imperfect reaction timing.
        const crossing = Math.ceil((now - d.aimStartedAt + 900) / 1500) * 1500;
        this.nextAt =
          d.aimStartedAt + crossing + this.between(-this.skill.aimError, this.skill.aimError);
      }
    }
    if (now < this.nextAt) return null;

    if (d.kind === 'sack-race') {
      if (d.finishedAt[this.team] || now < d.cooldowns[this.team]) return null;
      this.nextAt = now + this.skill.tap * this.between(0.8, 1.2);
      const expected = d.expected[this.team];
      const side =
        this.rng() < this.skill.mistake ? (expected === 'left' ? 'right' : 'left') : expected;
      return { type: 'tap', side };
    }
    if (d.kind === 'penalties') {
      if (d.phase !== 'select' || !d.teams.includes(this.team) || d.selected.includes(this.team))
        return null;
      this.nextAt = Infinity;
      // No input about the opponent's secret selection, even on hard.
      return { type: 'shoot', zone: ZONES[Math.floor(this.rng() * ZONES.length)] };
    }
    if (d.kind === 'rayuela') {
      if (d.phase !== 'aim' || TEAMS[d.turn % 4] !== this.team) return null;
      this.nextAt = Infinity;
      return { type: 'throw' };
    }
    if (TEAMS[d.teamIndex] !== this.team || d.phase !== 'pick') return null;
    this.target ??= this.chooseCard(d);
    if (this.target === null) return null;
    this.nextAt = now + this.skill.move * this.between(0.9, 1.3);
    if (d.cursor === this.target) {
      this.target = null;
      return { type: 'flip' };
    }
    const row = Math.floor(d.cursor / MEMORY_COLUMNS);
    const targetRow = Math.floor(this.target / MEMORY_COLUMNS);
    const direction =
      row < targetRow
        ? 'down'
        : row > targetRow
          ? 'up'
          : d.cursor % MEMORY_COLUMNS < this.target % MEMORY_COLUMNS
            ? 'right'
            : 'left';
    return { type: 'move', direction };
  }
}
