export const TEAMS = ['creative', 'lab', 'sports', 'media'] as const;
export type Team = (typeof TEAMS)[number];
export const TEAM_INFO: Record<Team, { name: string; color: string; short: string }> = {
  creative: { name: 'Creative', color: '#fa735f', short: 'CR' },
  lab: { name: 'Lab', color: '#ab91ed', short: 'LA' },
  sports: { name: 'Sports', color: '#b4d965', short: 'SP' },
  media: { name: 'Media', color: '#6ccedb', short: 'ME' },
};
export const GAMES = ['penalties', 'sack-race', 'memory', 'rayuela'] as const;
export type Game = (typeof GAMES)[number];
export const GAME_INFO: Record<
  Game,
  { name: string; subtitle: string; how: string; number: string }
> = {
  'sack-race': {
    name: 'Carrera de sacos',
    subtitle: 'Ritmo, equilibrio y un poco de suerte.',
    how: 'Alterna IZQ → DER. Cada pareja avanza un paso. Repetir lado te hace tropezar durante 1 segundo. ¡Llega a 30 pasos!',
    number: '01',
  },
  rayuela: {
    name: 'Rayuela',
    subtitle: 'La precisión se lleva los aplausos.',
    how: 'Mira el cursor en la pantalla y toca LANZAR cerca de la cuerda. Tienes 10 segundos y 3 intentos. Cuanto más cerca, más puntos.',
    number: '02',
  },
  penalties: {
    name: 'Penales dieciocheros',
    subtitle: 'Cinco zonas. Una gran decisión.',
    how: 'Tirador y arquero eligen en secreto. Misma zona: atajada. Zonas diferentes: gol. Tienes 5 segundos; sin elección se usa el centro.',
    number: '03',
  },
  memory: {
    name: 'Memorice',
    subtitle: 'Buena memoria, mejor equipo.',
    how: 'Mueve el cursor por la matriz 6×6 y voltea dos cartas en 15 segundos. Si son pareja, sumas y repites turno. Si fallas, le toca al siguiente equipo.',
    number: '04',
  },
};
export const ZONES = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as const;
export type Zone = (typeof ZONES)[number];
export const ZONE_NAMES: Record<Zone, string> = {
  'top-left': 'Arriba izquierda',
  'top-right': 'Arriba derecha',
  center: 'Centro',
  'bottom-left': 'Abajo izquierda',
  'bottom-right': 'Abajo derecha',
};
export type Action =
  | { type: 'tap'; side: 'left' | 'right' }
  | { type: 'shoot'; zone: Zone }
  | { type: 'throw' }
  | { type: 'move'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'flip' };
export type Scores = Record<Team, number>;
export const zeroScores = (): Scores => ({ creative: 0, lab: 0, sports: 0, media: 0 });
export type Placement = { team: Team; rank: number; points: number; value: number };
export type RaceData = {
  kind: 'sack-race';
  steps: Scores;
  expected: Record<Team, 'left' | 'right'>;
  cooldowns: Scores;
  finishedAt: Scores;
};
export type ThrowResult = { team: Team; x: number; points: number; timedOut: boolean };
export type RayuelaData = {
  kind: 'rayuela';
  turn: number;
  phase: 'aim' | 'reveal';
  phaseEndsAt: number;
  aimStartedAt: number;
  scores: Scores;
  throws: ThrowResult[];
};
export const MEMORY_ICONS = [
  'Empanada',
  'Trompo',
  'Chicha',
  'Bandera',
  'Guitarra',
  'Volantín',
  'Sombrero',
  'Copihue',
] as const;
export const MEMORY_SIDE = 6;
export const MEMORY_CARD_COUNT = MEMORY_SIDE * MEMORY_SIDE;
export const MEMORY_PAIR_COUNT = MEMORY_CARD_COUNT / 2;
export type MemoryData = {
  kind: 'memory';
  cards: number[];
  matched: number[];
  open: number[];
  cursor: number;
  teamIndex: number;
  phase: 'pick' | 'reveal';
  phaseEndsAt: number;
  scores: Scores;
};
export type ShotResult = { kicker: Team; keeper: Team; kick: Zone; save: Zone; goal: boolean };
export type MatchResult = {
  teams: [Team, Team];
  goals: [number, number];
  winner: Team;
  loser: Team;
  lottery: boolean;
};
export type PenaltiesData = {
  kind: 'penalties';
  match: number;
  teams: [Team, Team];
  goals: [number, number];
  taken: [number, number];
  kicker: 0 | 1;
  choices: Partial<Record<Team, Zone>>;
  phase: 'select' | 'reveal' | 'between';
  phaseEndsAt: number;
  shotId: number;
  lastShot: ShotResult | null;
  matches: MatchResult[];
  seed: number;
};
export type GameData = RaceData | RayuelaData | MemoryData | PenaltiesData;
export type Round = {
  id: string;
  game: Game;
  practice: boolean;
  phase: 'countdown' | 'playing' | 'finished';
  startsAt: number;
  endsAt: number;
  pausedAt: number | null;
  data: GameData;
  placements: Placement[];
};
export type PublicPenalties = Omit<PenaltiesData, 'choices' | 'seed'> & { selected: Team[] };
export type PublicMemory = Omit<MemoryData, 'cards'> & { cards: (number | null)[] };
export type PublicRound = Omit<Round, 'data'> & {
  data: RaceData | RayuelaData | PublicMemory | PublicPenalties;
};
export type ResultRecord = { id: string; game: Game; placements: Placement[]; createdAt: string };
