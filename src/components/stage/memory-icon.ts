import { MEMORY_SYMBOLS } from '@/game/memory-icons';

// Compute bounds once, rather than on every animation frame. Different silhouettes
// (a wide empanada or a narrow guitar) are centered by their visible pixels.
const icons = MEMORY_SYMBOLS.map(({ pixels }) => {
  const left = Math.min(...pixels.map(([x]) => x));
  const top = Math.min(...pixels.map(([, y]) => y));
  const right = Math.max(...pixels.map(([x, , width]) => x + width));
  const bottom = Math.max(...pixels.map(([, y, , height]) => y + height));
  return { pixels, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
});

export function drawMemoryIcon(
  c: CanvasRenderingContext2D,
  index: number,
  centerX: number,
  centerY: number,
  scale = 3,
) {
  const icon = icons[index];
  if (!icon) {
    // An unexpected value must be visible, never an apparently empty card.
    c.save();
    c.fillStyle = '#142f38';
    c.font = 'bold 24px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('?', centerX, centerY);
    c.restore();
    return;
  }
  const x = Math.round(centerX - icon.centerX * scale);
  const y = Math.round(centerY - icon.centerY * scale);
  for (const [px, py, width, height, color] of icon.pixels) {
    c.fillStyle = color;
    c.fillRect(x + px * scale, y + py * scale, width * scale, height * scale);
  }
}
