import { ResultRecord, TEAM_INFO, TEAMS, zeroScores } from '@/game/types';
export function Scoreboard({
  results,
  compact = false,
}: {
  results: ResultRecord[];
  compact?: boolean;
}) {
  const totals = zeroScores();
  for (const r of results) for (const p of r.placements) totals[p.team] += p.points;
  const sorted = [...TEAMS].sort((a, b) => totals[b] - totals[a]);
  return (
    <div className={`scoreboard ${compact ? 'compact' : ''}`}>
      {sorted.map((t, i) => (
        <div
          key={t}
          className="score-team"
          style={{ '--team': TEAM_INFO[t].color } as React.CSSProperties}
        >
          <span className="score-position">{String(i + 1).padStart(2, '0')}</span>
          <span className="team-dot" />
          <strong>{TEAM_INFO[t].name}</strong>
          <span className="score-number">
            {totals[t].toLocaleString('es-CL')}
            <small>PTS</small>
          </span>
        </div>
      ))}
    </div>
  );
}
