import { MEMORY_SIDE, PublicRound, TEAM_INFO, TEAMS } from '@/game/types';
import { rayuelaX } from '@/game/engine';
import { drawDepthPanel, drawDepthShadow, drawScene25d } from './scene25d';
type C = CanvasRenderingContext2D;
const INK = '#142f38',
  PAPER = '#f4e9cd',
  WHITE = '#fff8e6';
function rect(c: C, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}
function text(
  c: C,
  s: string,
  x: number,
  y: number,
  size = 16,
  color = PAPER,
  align: CanvasTextAlign = 'left',
) {
  c.fillStyle = color;
  c.font = `bold ${size}px monospace`;
  c.textAlign = align;
  c.fillText(s, x, y);
}
function line(c: C, x: number, y: number, x2: number, y2: number, color: string, width = 3) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.stroke();
}
const HUASO = [
  '.....HHHHHH.....',
  '....HHHHHHHH....',
  '..HHHHHHHHHHHH..',
  '.....SSSSSS.....',
  '.....SISISS.....',
  '.....SSSSSS.....',
  '......SSSS......',
  '....CCCCCCCC....',
  '...CCWCCCCWCC...',
  '..SCCWCCCCWCCS..',
  '..S..CCCCCC..S..',
  '.....CCCCCC.....',
  '.....DDDDDD.....',
  '.....DDDDDD.....',
  '.....DD..DD.....',
  '....III..III....',
];
function huaso(c: C, x: number, y: number, color: string, scale = 3, sack = false) {
  const colors: Record<string, string> = {
    H: '#e9bc70',
    S: '#e6a16c',
    I: INK,
    C: color,
    W: WHITE,
    D: '#33586a',
  };
  HUASO.forEach((row, ry) =>
    [...row].forEach((p, rx) => {
      if (p !== '.') rect(c, x + rx * scale, y + ry * scale, scale, scale, colors[p]);
    }),
  );
  if (sack) {
    rect(c, x + 3 * scale, y + 10 * scale, 10 * scale, 8 * scale, '#b28554');
    rect(c, x + 4 * scale, y + 11 * scale, 8 * scale, 6 * scale, '#d6b37b');
    rect(c, x + 5 * scale, y + 12 * scale, 1 * scale, 4 * scale, '#bd9966');
  }
}
function ball(c: C, x: number, y: number) {
  rect(c, x - 9, y - 12, 18, 24, WHITE);
  rect(c, x - 12, y - 9, 24, 18, WHITE);
  rect(c, x - 4, y - 4, 8, 8, INK);
  rect(c, x - 8, y - 9, 4, 4, INK);
  rect(c, x + 6, y + 4, 4, 5, INK);
}
export function icon(c: C, index: number, x: number, y: number, s = 3) {
  const r = (a: number, b: number, w: number, h: number, color: string) =>
    rect(c, x + a * s, y + b * s, w * s, h * s, color);
  if (index === 0) {
    r(1, 8, 14, 6, '#bf8143');
    r(2, 6, 12, 7, '#f4c36f');
    r(4, 4, 8, 2, '#f4c36f');
    for (let i = 0; i < 4; i++) r(2 + i * 3, 12, 2, 2, '#fff0b5');
  }
  if (index === 1) {
    r(6, 1, 4, 3, '#e8ba74');
    r(3, 4, 10, 3, '#f57964');
    r(2, 7, 12, 3, '#f2cb7e');
    r(4, 10, 8, 3, '#64bac1');
    r(7, 13, 2, 3, INK);
  }
  if (index === 2) {
    r(4, 2, 8, 13, '#f9e3b3');
    r(5, 6, 6, 8, '#b05a39');
    r(12, 5, 3, 7, '#e2bf87');
    r(13, 6, 2, 4, INK);
  }
  if (index === 3) {
    r(2, 1, 1, 15, '#ead4a7');
    r(3, 2, 12, 5, '#fff7e3');
    r(3, 7, 12, 5, '#f17362');
    r(3, 2, 5, 5, '#598eb1');
    r(5, 3, 1, 3, WHITE);
    r(4, 4, 3, 1, WHITE);
  }
  if (index === 4) {
    r(7, 0, 3, 9, '#d69961');
    r(5, 8, 6, 3, '#dca26a');
    r(3, 11, 10, 5, '#eca75b');
    r(6, 10, 4, 4, INK);
    r(8, 0, 1, 14, '#f4e9cd');
  }
  if (index === 5) {
    for (let i = 0; i < 7; i++) r(7 - i, i + 1, 2 + i * 2, 1, i < 4 ? '#f17362' : '#6ccecd');
    for (let i = 0; i < 6; i++) r(i + 2, i + 8, 12 - i * 2, 1, i < 2 ? '#6ccecd' : '#f4cb78');
    r(7, 1, 1, 14, WHITE);
    r(8, 15, 1, 1, WHITE);
  }
  if (index === 6) {
    r(5, 4, 7, 5, '#e9bb72');
    r(3, 8, 11, 2, '#372d2c');
    r(1, 10, 15, 3, '#e9bb72');
    r(2, 13, 13, 1, '#c59550');
  }
  if (index === 7) {
    r(7, 0, 2, 8, '#9abf73');
    r(4, 5, 8, 3, '#c8d387');
    r(3, 8, 10, 5, '#ed6d65');
    r(4, 13, 8, 2, '#f6926b');
    r(6, 9, 1, 6, '#ffd8a2');
    r(9, 9, 1, 6, '#ffd8a2');
  }
}
const zonePos = {
  'top-left': [365, 155],
  'top-right': [595, 155],
  center: [480, 232],
  'bottom-left': [365, 307],
  'bottom-right': [595, 307],
} as const;
export function drawStage(c: C, r: PublicRound | null, now: number, positions: number[]) {
  c.imageSmoothingEnabled = false;
  drawScene25d(c, now);
  if (!r) {
    text(c, 'LA FONDA ESTÁ ABIERTA', 480, 145, 30, PAPER, 'center');
    text(c, 'Cuatro equipos. Una misma cancha.', 480, 181, 16, '#a9c2b4', 'center');
    TEAMS.forEach((t, i) => {
      const x = 195 + i * 170;
      huaso(c, x, 255, TEAM_INFO[t].color, 5, true);
      text(c, TEAM_INFO[t].name.toUpperCase(), x + 40, 395, 18, TEAM_INFO[t].color, 'center');
    });
    return;
  }
  const d = r.data;
  const clock = r.pausedAt ?? now;
  if (d.kind === 'sack-race') {
    text(c, 'META: 30 PASOS', 865, 75, 15, PAPER, 'right');
    TEAMS.forEach((team, i) => {
      const y = 130 + i * 91;
      rect(c, 60, y, 840, 76, i % 2 ? '#c3aa77' : '#d3b988');
      rect(c, 60, y + 71, 840, 5, '#9c845a');
      for (let q = 0; q < 8; q++)
        rect(c, 858 + (q % 2) * 12, y + Math.floor(q / 2) * 18, 12, 18, q % 3 ? INK : PAPER);
      text(c, TEAM_INFO[team].short, 78, y + 42, 22, INK);
      const target = 130 + (d.steps[team] / 30) * 660;
      positions[i] = (positions[i] ?? 130) + (target - (positions[i] ?? 130)) * 0.18;
      const moving = Math.abs(positions[i] - target) > 1;
      const jump = moving ? Math.abs(Math.sin(clock / 90)) * 12 : 0;
      drawDepthShadow(c, positions[i] + 24, y + 70, 58, 7);
      huaso(c, positions[i], y + 2 - jump, TEAM_INFO[team].color, 3, true);
      text(c, `${d.steps[team]}/30`, 800, y + 43, 15, INK, 'right');
      if (clock < d.cooldowns[team])
        text(c, '¡UPS!', positions[i] + 24, y - 6, 14, TEAM_INFO[team].color, 'center');
    });
  } else if (d.kind === 'penalties') {
    rect(c, 265, 96, 430, 252, '#254c48');
    for (let x = 270; x <= 690; x += 30) line(c, x, 100, x, 345, '#739188', 1);
    for (let y = 100; y <= 345; y += 30) line(c, 265, y, 695, y, '#739188', 1);
    line(c, 260, 350, 260, 90, PAPER, 8);
    line(c, 260, 90, 700, 90, PAPER, 8);
    line(c, 700, 90, 700, 350, PAPER, 8);
    Object.values(zonePos).forEach(([x, y], i) => {
      rect(c, x - 23, y - 20, 46, 40, '#42695e');
      text(c, String(i + 1), x, y + 7, 22, '#b9c8ab', 'center');
    });
    const reveal = d.phase === 'reveal' && d.lastShot;
    const keeper = d.teams[1 - d.kicker];
    const keeperPos = reveal ? zonePos[d.lastShot!.save] : zonePos.center;
    drawDepthShadow(c, keeperPos[0], keeperPos[1] + 36, 62, 7);
    drawDepthShadow(c, 480, 473, 70, 7);
    huaso(c, keeperPos[0] - 24, keeperPos[1] - 20, TEAM_INFO[keeper].color, 3);
    huaso(c, 453, 425, TEAM_INFO[d.teams[d.kicker]].color, 3);
    if (reveal) {
      const progress = Math.min(1, (clock - (d.phaseEndsAt - 2500)) / 650);
      const [tx, ty] = zonePos[d.lastShot!.kick];
      ball(c, 480 + (tx - 480) * progress, 430 + (ty - 430) * progress);
      text(
        c,
        d.lastShot!.goal ? '¡GOOOOL!' : '¡ATAJADÓN!',
        480,
        398,
        32,
        d.lastShot!.goal ? '#b4d965' : '#fa735f',
        'center',
      );
    } else ball(c, 480, 430);
    text(c, TEAM_INFO[d.teams[0]].name.toUpperCase(), 40, 99, 19, TEAM_INFO[d.teams[0]].color);
    text(c, String(d.goals[0]), 85, 159, 44);
    text(
      c,
      TEAM_INFO[d.teams[1]].name.toUpperCase(),
      920,
      99,
      19,
      TEAM_INFO[d.teams[1]].color,
      'right',
    );
    text(c, String(d.goals[1]), 875, 159, 44, PAPER, 'right');
    text(
      c,
      ['SEMIFINAL 1', 'SEMIFINAL 2', 'TERCER LUGAR', 'LA GRAN FINAL'][d.match],
      480,
      65,
      18,
      PAPER,
      'center',
    );
    for (let i = 0; i < 3; i++) {
      rect(c, 44 + i * 22, 188, 12, 12, i < d.taken[0] ? TEAM_INFO[d.teams[0]].color : '#42695e');
      rect(c, 850 + i * 22, 188, 12, 12, i < d.taken[1] ? TEAM_INFO[d.teams[1]].color : '#42695e');
    }
    if (d.phase === 'between') {
      const result = d.matches.at(-1)!;
      rect(c, 275, 190, 410, 130, INK);
      text(
        c,
        result.lottery ? 'DESEMPATE POR SORTEO' : 'PARTIDO TERMINADO',
        480,
        226,
        17,
        PAPER,
        'center',
      );
      text(
        c,
        `GANA ${TEAM_INFO[result.winner].name.toUpperCase()}`,
        480,
        273,
        27,
        TEAM_INFO[result.winner].color,
        'center',
      );
    }
  } else if (d.kind === 'rayuela') {
    drawDepthPanel(c, 130, 162, 700, 250, '#89684d');
    rect(c, 140, 172, 680, 230, '#be9470');
    rect(c, 145, 177, 670, 220, '#c99d75');
    rect(c, 446, 177, 68, 220, '#d7b482');
    rect(c, 477, 162, 6, 250, WHITE);
    for (let i = 0; i < 70; i++)
      rect(c, 151 + ((i * 91) % 654), 187 + ((i * 53) % 200), 4, 3, '#b88d65');
    const last = d.throws.at(-1);
    const x = d.phase === 'reveal' && last ? last.x : rayuelaX(clock - d.aimStartedAt);
    const px = 480 + x * 320;
    if (d.phase === 'aim') {
      rect(c, px - 5, 138, 10, 276, TEAM_INFO[TEAMS[d.turn % 4]].color);
      rect(c, px - 12, 127, 24, 11, WHITE);
    } else {
      rect(c, px - 13, 272, 26, 10, '#50656a');
      rect(c, px - 9, 268, 18, 5, '#b9c7c2');
      text(
        c,
        last?.timedOut ? 'TIEMPO AGOTADO' : `+${last?.points ?? 0} PUNTOS`,
        480,
        465,
        30,
        PAPER,
        'center',
      );
    }
    text(c, `LANZAMIENTO ${Math.floor(d.turn / 4) + 1} / 3`, 480, 93, 19, PAPER, 'center');
    text(
      c,
      TEAM_INFO[TEAMS[d.turn % 4]].name.toUpperCase(),
      480,
      500,
      20,
      TEAM_INFO[TEAMS[d.turn % 4]].color,
      'center',
    );
  } else {
    const cardW = 67,
      cardH = 57,
      gap = 8,
      startX = 257,
      startY = 68;
    drawDepthPanel(c, 245, 56, 492, 432, '#23464a');
    d.cards.forEach((v, i) => {
      const x = startX + (i % MEMORY_SIDE) * (cardW + gap),
        y = startY + Math.floor(i / MEMORY_SIDE) * (cardH + gap);
      const matched = d.matched.includes(i);
      const selected = d.cursor === i;
      if (selected) {
        rect(c, x - 5, y - 5, cardW + 10, cardH + 10, TEAM_INFO[TEAMS[d.teamIndex]].color);
      }
      rect(c, x, y + 5, cardW, cardH, '#0d2e32');
      rect(c, x, y, cardW, cardH, v === null ? '#315a5d' : matched ? '#c6d2a0' : PAPER);
      if (v === null) {
        rect(c, x + 9, y + 9, cardW - 18, cardH - 18, '#3e6666');
        text(c, 'VS', x + cardW / 2, y + cardH / 2 + 7, 18, '#73918a', 'center');
      } else icon(c, v, x + 8, y + 5, 2);
      text(c, String(i + 1).padStart(2, '0'), x + 9, y + 19, 11, v === null ? '#a2b9a9' : INK);
    });
    text(c, 'PAREJAS', 122, 135, 18);
    TEAMS.forEach((t, i) => {
      text(c, TEAM_INFO[t].short, 95, 191 + i * 57, 18, TEAM_INFO[t].color);
      text(c, String(d.scores[t]), 176, 191 + i * 57, 24, PAPER, 'right');
    });
  }
  if (r.phase === 'countdown') {
    rect(c, 345, 188, 270, 165, INK);
    text(c, '¡PREPÁRENSE!', 480, 229, 21, PAPER, 'center');
    text(
      c,
      String(Math.max(1, Math.ceil((r.startsAt - clock) / 1000))),
      480,
      315,
      78,
      PAPER,
      'center',
    );
  }
}
