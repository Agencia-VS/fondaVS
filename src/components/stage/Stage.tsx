'use client';
import { useEffect, useRef } from 'react';
import type { PublicRound } from '@/game/types';
import { drawStage } from './draw';
export default function Stage({
  round = null,
  clockOffset = 0,
}: {
  round?: PublicRound | null;
  clockOffset?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef(round);
  const positions = useRef<number[]>([]);
  const offset = useRef(clockOffset);
  useEffect(() => {
    offset.current = clockOffset;
  }, [clockOffset]);
  useEffect(() => {
    if (state.current?.id !== round?.id) positions.current = [];
    state.current = round;
  }, [round]);
  useEffect(() => {
    const c = canvas.current?.getContext('2d');
    if (!c) return;
    let frame = 0;
    const draw = () => {
      drawStage(c, state.current, Date.now() + offset.current, positions.current);
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <canvas
      ref={canvas}
      width={960}
      height={540}
      className="stage-canvas"
      role="img"
      aria-label={round ? `Escenario de ${round.game}` : 'Los cuatro equipos esperan en la fonda'}
    />
  );
}
