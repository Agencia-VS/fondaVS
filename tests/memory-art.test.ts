import { describe, expect, it, vi } from 'vitest';
import { createRound } from '@/game/engine';
import { MEMORY_ICONS, MEMORY_PAIR_COUNT } from '@/game/types';
import { drawMemoryIcon } from '@/components/stage/memory-icon';

describe('Memorice artwork regression', () => {
  it('draws a distinct, centered object for every dealt pair, clear of the corner number', () => {
    const round = createRound('memory', 0, 'art', 31);
    if (round.data.kind !== 'memory') throw Error();
    const signatures = new Set<string>();
    for (const id of new Set(round.data.cards)) {
      const painted: { x: number; y: number; w: number; h: number; color: string }[] = [];
      const context = {
        fillStyle: '',
        fillRect(x: number, y: number, w: number, h: number) {
          painted.push({ x, y, w, h, color: this.fillStyle });
        },
      };
      drawMemoryIcon(context as CanvasRenderingContext2D, id, 44, 37);
      expect(MEMORY_ICONS[id]).toBeTruthy();
      expect(painted.length, `Missing artwork for ${MEMORY_ICONS[id]}`).toBeGreaterThan(0);
      const left = Math.min(...painted.map((p) => p.x));
      const right = Math.max(...painted.map((p) => p.x + p.w));
      const top = Math.min(...painted.map((p) => p.y));
      const bottom = Math.max(...painted.map((p) => p.y + p.h));
      expect(Math.abs((left + right) / 2 - 44)).toBeLessThanOrEqual(0.5);
      expect(Math.abs((top + bottom) / 2 - 37)).toBeLessThanOrEqual(0.5);
      expect(left).toBeGreaterThan(0);
      expect(right).toBeLessThan(88);
      expect(top).toBeGreaterThan(12);
      expect(bottom).toBeLessThan(74);
      signatures.add(JSON.stringify(painted));
    }
    expect(signatures.size).toBe(MEMORY_PAIR_COUNT);
  });

  it('renders a visible placeholder for an unexpected icon instead of a blank card', () => {
    const context = { save: vi.fn(), restore: vi.fn(), fillText: vi.fn() };
    drawMemoryIcon(context as unknown as CanvasRenderingContext2D, 99, 44, 37);
    expect(context.fillText).toHaveBeenCalledWith('?', 44, 37);
  });
});
