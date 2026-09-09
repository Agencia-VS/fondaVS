'use client';
import {
  Action,
  MEMORY_ICONS,
  MEMORY_SIDE,
  PublicRound,
  Team,
  ZONES,
  ZONE_NAMES,
} from '@/game/types';
function PadButton({
  label,
  children,
  disabled,
  onAction,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  disabled: boolean;
  onAction: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`pad-button ${className}`}
      disabled={disabled}
      aria-label={label}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        onAction();
      }}
      onClick={(e) => {
        if (e.detail === 0) onAction();
      }}
    >
      {children}
    </button>
  );
}

export function GamePad({
  round,
  team,
  canPlay,
  onAction,
  sameScreen = false,
}: {
  round: PublicRound;
  team: Team;
  canPlay: boolean;
  onAction: (action: Action) => void;
  sameScreen?: boolean;
}) {
  const d = round.data;
  return (
    <div className="controller-pad">
      {d?.kind === 'sack-race' && (
        <>
          <div className="race-progress">
            <span>
              {d.steps[team]}
              <small>/30 pasos</small>
            </span>
          </div>
          <div className="race-buttons">
            <PadButton
              disabled={!canPlay}
              label="Izquierda"
              onAction={() => onAction({ type: 'tap', side: 'left' })}
            >
              <span>←</span>IZQ
            </PadButton>
            <PadButton
              disabled={!canPlay}
              label="Derecha"
              onAction={() => onAction({ type: 'tap', side: 'right' })}
            >
              <span>→</span>DER
            </PadButton>
          </div>
        </>
      )}
      {d?.kind === 'penalties' && (
        <>
          <div className="goal-pad">
            {ZONES.map((z, i) => (
              <PadButton
                key={z}
                className={`zone-${z}`}
                label={ZONE_NAMES[z]}
                disabled={!canPlay}
                onAction={() => onAction({ type: 'shoot', zone: z })}
              >
                <span>{['↖', '↗', '●', '↙', '↘'][i]}</span>
                <small>{i + 1}</small>
              </PadButton>
            ))}
          </div>
          {d.selected.includes(team) && (
            <p className="choice-confirmed">
              Elección confirmada. {sameScreen ? 'Espera la jugada' : 'Mira el proyector'} ✓
            </p>
          )}
        </>
      )}
      {d?.kind === 'rayuela' && (
        <PadButton
          className="throw-button"
          label="Lanzar"
          disabled={!canPlay}
          onAction={() => onAction({ type: 'throw' })}
        >
          <span>◎</span>LANZAR
          <small>{sameScreen ? 'APUNTA A LA CUERDA' : 'MIRA LA CUERDA EN EL PROYECTOR'}</small>
        </PadButton>
      )}
      {d?.kind === 'memory' && (
        <>
          <div className="memory-selection">
            CARTA {String(d.cursor + 1).padStart(2, '0')}{' '}
            <span>
              {d.cards[d.cursor] !== null
                ? MEMORY_ICONS[d.cards[d.cursor]!]
                : `${Math.floor(d.cursor / MEMORY_SIDE) + 1}ª FILA · ${(d.cursor % MEMORY_SIDE) + 1}ª COLUMNA`}
            </span>
          </div>
          <div className="dpad">
            <PadButton
              className="dpad-up"
              label="Arriba"
              disabled={!canPlay}
              onAction={() => onAction({ type: 'move', direction: 'up' })}
            >
              ↑
            </PadButton>
            <PadButton
              className="dpad-left"
              label="Izquierda"
              disabled={!canPlay}
              onAction={() => onAction({ type: 'move', direction: 'left' })}
            >
              ←
            </PadButton>
            <PadButton
              className="dpad-right"
              label="Derecha"
              disabled={!canPlay}
              onAction={() => onAction({ type: 'move', direction: 'right' })}
            >
              →
            </PadButton>
            <PadButton
              className="dpad-down"
              label="Abajo"
              disabled={!canPlay}
              onAction={() => onAction({ type: 'move', direction: 'down' })}
            >
              ↓
            </PadButton>
          </div>
          <PadButton
            className="flip-button"
            label="Voltear"
            disabled={!canPlay}
            onAction={() => onAction({ type: 'flip' })}
          >
            VOLTEAR ↻
          </PadButton>
        </>
      )}
    </div>
  );
}
