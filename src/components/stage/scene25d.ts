import { TEAM_INFO } from '@/game/types';

type C = CanvasRenderingContext2D;

const WIDTH = 960;
const HEIGHT = 540;
const HORIZON = 350;
const VANISHING_X = 480;

function rect(c: C, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function polygon(c: C, points: number[][], color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => c.lineTo(x, y));
  c.closePath();
  c.fill();
}

function line(c: C, x: number, y: number, x2: number, y2: number, color: string, width = 2) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.stroke();
}

function booth(c: C, x: number, y: number, scale: number, color: string) {
  const w = 94 * scale;
  const h = 56 * scale;
  rect(c, x, y, w, h, '#21464b');
  polygon(c, [[x - 8 * scale, y], [x + w / 2, y - 20 * scale], [x + w + 8 * scale, y]], '#d8b36f');
  rect(c, x + 12 * scale, y + 18 * scale, w - 24 * scale, h - 18 * scale, color);
  rect(c, x + 22 * scale, y + 28 * scale, 20 * scale, 28 * scale, '#14373c');
  rect(c, x + 51 * scale, y + 28 * scale, 20 * scale, 28 * scale, '#14373c');
  rect(c, x + 5 * scale, y + h - 5 * scale, w - 10 * scale, 5 * scale, '#112d32');
}

function bunting(c: C, now: number) {
  line(c, 0, 29, WIDTH, 29, '#c8ceb4', 2);
  const drift = Math.floor((now / 130) % 42);
  for (let i = -1; i < 25; i++) {
    const x = i * 42 + 6 - drift;
    const color = [TEAM_INFO.creative.color, '#f4e9cd', TEAM_INFO.media.color][i % 3 < 0 ? 0 : i % 3];
    polygon(c, [[x, 31], [x + 28, 31], [x + 14, 58]], color);
  }
}

function sky(c: C) {
  const bands = ['#173e45', '#19464d', '#1d5055', '#23595b', '#2a625f'];
  bands.forEach((color, index) => rect(c, 0, index * 66, WIDTH, 67, color));
  polygon(c, [[0, 286], [120, 245], [235, 286], [370, 220], [510, 286], [665, 235], [810, 286], [960, 218], [960, HORIZON], [0, HORIZON]], '#27565a');
  polygon(c, [[0, 325], [130, 293], [270, 322], [405, 276], [560, 325], [720, 286], [860, 321], [960, 273], [960, HORIZON], [0, HORIZON]], '#35635e');
}

function floor(c: C) {
  rect(c, 0, HORIZON, WIDTH, HEIGHT - HORIZON, '#405d4d');
  for (let i = 0; i < 7; i++) {
    const y = HORIZON + Math.pow(i / 7, 1.45) * (HEIGHT - HORIZON);
    const nextY = HORIZON + Math.pow((i + 1) / 7, 1.45) * (HEIGHT - HORIZON);
    rect(c, 0, y, WIDTH, Math.max(2, nextY - y), i % 2 ? '#3a5749' : '#466750');
  }
  for (let i = -6; i <= 6; i++) {
    const bottomX = VANISHING_X + i * 148;
    line(c, VANISHING_X, HORIZON, bottomX, HEIGHT, '#55725a', i % 2 ? 2 : 3);
  }
  line(c, 0, HORIZON, WIDTH, HORIZON, '#1e4443', 4);
}

function foreground(c: C) {
  rect(c, 0, HEIGHT - 13, WIDTH, 13, '#173a3d');
  for (let i = 0; i < 12; i++) {
    const x = i * 92 - 12;
    rect(c, x, HEIGHT - 32, 18, 19, '#274c48');
    rect(c, x + 5, HEIGHT - 43, 8, 13, '#b38452');
  }
}

/**
 * Lightweight 2.5D stage: a fixed-camera depth composition, not a 3D runtime.
 * Keeping it in its own module lets future Blender-baked sprites replace a layer
 * without touching the game engine, network protocol, or controls.
 */
export function drawScene25d(c: C, now: number) {
  c.save();
  c.imageSmoothingEnabled = false;
  sky(c);
  booth(c, 96, 278, 0.82, '#b8754e');
  booth(c, 760, 267, 0.92, '#7e9c68');
  booth(c, 410, 300, 0.58, '#b86b59');
  bunting(c, now);
  floor(c);
  foreground(c);
  c.restore();
}

/** A pixel-friendly contact shadow that grounds sprites in the perspective floor. */
export function drawDepthShadow(c: C, x: number, y: number, width: number, height = 8) {
  c.save();
  c.globalAlpha = 0.38;
  rect(c, x - width / 2, y, width, height, '#102f34');
  rect(c, x - width * 0.36, y - 3, width * 0.72, 3, '#1a3d3d');
  c.restore();
}

/** Extruded panel for boards and game surfaces, with a stable screen-space depth. */
export function drawDepthPanel(c: C, x: number, y: number, width: number, height: number, color: string) {
  rect(c, x + 10, y + 12, width, height, '#122f35');
  rect(c, x + 5, y + 6, width, height, '#2b4d4c');
  rect(c, x, y, width, height, color);
}
