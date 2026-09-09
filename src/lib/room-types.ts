import type { Game, PublicRound, ResultRecord, Team } from '@/game/types';
import type { Difficulty } from '@/game/cpu';
export type Member = { id: string; team: Team; nickname: string };
export type Room = {
  id: string;
  code: string;
  phase: 'waiting' | 'playing';
  hostEpoch: number;
  isOwner: boolean;
  member: Member | null;
  members: Member[];
  results: ResultRecord[];
};
export type LiveState = {
  hostEpoch: number;
  version: number;
  sentAt: number;
  round: PublicRound | null;
  members: (Member & { online: boolean; ready: boolean })[];
  cpuTeams: Team[];
  cpuDifficulty: Difficulty | null;
  results: ResultRecord[];
  saving: boolean;
  notice: string;
};
export type ControlAction =
  | { type: 'start'; game: Game; practice: boolean; cpu?: Difficulty }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'abort' };
export type Ack = { kind: 'ack'; seq: number; accepted: boolean; reason?: string };
export type Heartbeat = { kind: 'ping'; at: number; ready: boolean; memberId: string };
export type Pong = { kind: 'pong'; at: number; hostAt: number; lastSeq: number };
