import { Action, Game, PublicRound, Team, TEAM_INFO, TEAMS, ZONES } from './types';

export function controlState(
  round: PublicRound | null | undefined,
  team: Team,
  now: number,
  online = true,
) {
  const d = round?.data;
  let canPlay = !!round && online && round.phase === 'playing' && round.pausedAt === null;
  let role = '';
  if (d?.kind === 'penalties') {
    role =
      team === d.teams[d.kicker]
        ? 'Te toca chutar'
        : team === d.teams[1 - d.kicker]
          ? 'Te toca atajar'
          : 'Tu equipo espera el próximo partido';
    canPlay &&= d.phase === 'select' && d.teams.includes(team) && !d.selected.includes(team);
  } else if (d?.kind === 'rayuela') {
    role =
      TEAMS[d.turn % 4] === team
        ? 'Apunta a la cuerda'
        : `Lanza ${TEAM_INFO[TEAMS[d.turn % 4]].name}`;
    canPlay &&= TEAMS[d.turn % 4] === team && d.phase === 'aim';
  } else if (d?.kind === 'memory') {
    role =
      TEAMS[d.teamIndex] === team
        ? 'Encuentra la pareja'
        : `Juega ${TEAM_INFO[TEAMS[d.teamIndex]].name}`;
    canPlay &&= TEAMS[d.teamIndex] === team && d.phase === 'pick';
  } else if (d?.kind === 'sack-race') {
    const stumbled = (round?.pausedAt ?? now) < d.cooldowns[team];
    role = stumbled
      ? '¡Tropiezo! Respira un segundo.'
      : d.finishedAt[team]
        ? '¡Llegaste a la meta!'
        : `Sigue con ${d.expected[team] === 'left' ? 'IZQ' : 'DER'}`;
    canPlay &&= !stumbled && !d.finishedAt[team];
  }
  const deadline =
    round?.phase === 'countdown'
      ? round.startsAt
      : d && 'phaseEndsAt' in d
        ? d.phaseEndsAt
        : round?.endsAt;
  const seconds = deadline
    ? Math.max(0, Math.ceil((deadline - (round?.pausedAt ?? now)) / 1000))
    : 0;
  return { canPlay, role, seconds };
}

export const KEYBOARD_HINT: Record<Game, string> = {
  'sack-race': 'Teclado: ← → o A / D, alternadamente.',
  penalties: 'Teclado: 1 ↖ · 2 ↗ · 3 centro · 4 ↙ · 5 ↘.',
  rayuela: 'Teclado: espacio para lanzar.',
  memory: 'Teclado: flechas para moverte; espacio para voltear.',
};

export function keyboardAction(game: Game, key: string): Action | null {
  if (game === 'penalties' && /^[1-5]$/.test(key))
    return { type: 'shoot', zone: ZONES[Number(key) - 1] };
  if (game === 'rayuela' && key === ' ') return { type: 'throw' };
  if (game === 'memory' && key === ' ') return { type: 'flip' };
  const direction =
    key === 'ArrowLeft' || (game === 'sack-race' && key.toLowerCase() === 'a')
      ? 'left'
      : key === 'ArrowRight' || (game === 'sack-race' && key.toLowerCase() === 'd')
        ? 'right'
        : key === 'ArrowUp'
          ? 'up'
          : key === 'ArrowDown'
            ? 'down'
            : null;
  if (game === 'memory' && direction) return { type: 'move', direction };
  if (game === 'sack-race' && (direction === 'left' || direction === 'right'))
    return { type: 'tap', side: direction };
  return null;
}
