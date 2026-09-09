import { CpuPlayer, Difficulty } from './cpu';
import {
  advanceRound,
  applyAction,
  createRound,
  pauseRound,
  publicRound,
  resumeRound,
} from './engine';
import { Action, Game, Round, Team, TEAMS } from './types';

/** Local authority for one human and three CPUs; no room, auth or transport. */
export class SoloSession {
  private round: Round;
  private cpus: CpuPlayer[];

  constructor(
    readonly team: Team,
    game: Game,
    difficulty: Difficulty,
    now: number,
    id: string,
    seeds: readonly [number, number, number, number],
  ) {
    this.round = createRound(game, now, id, seeds[0], true);
    this.cpus = TEAMS.filter((t) => t !== team).map(
      (t, i) => new CpuPlayer(t, difficulty, seeds[i + 1]),
    );
  }

  get view() {
    return publicRound(this.round);
  }

  tick(now: number) {
    this.round = advanceRound(this.round, now);
    for (const cpu of this.cpus) {
      const action = cpu.next(this.view, now);
      if (action) this.round = applyAction(this.round, cpu.team, action, now).round;
    }
    return this.view;
  }

  action(action: Action, now: number) {
    this.round = applyAction(this.round, this.team, action, now).round;
    return this.view;
  }

  pause(now: number) {
    this.round = pauseRound(this.round, now);
    return this.view;
  }

  resume(now: number) {
    this.round = resumeRound(this.round, now);
    return this.view;
  }
}
