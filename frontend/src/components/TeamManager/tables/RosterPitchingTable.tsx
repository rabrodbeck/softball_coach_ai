import React from 'react';
import type { Player } from '../types';

interface RosterPitchingTableProps {
  players: Player[];
}

export function RosterPitchingTable({ players }: RosterPitchingTableProps) {
  return (
    <>
      {players.map((p) => {
        const era = p.era ?? 0.00;
        const whip = p.whip ?? 0.00;

        return (
          <React.Fragment key={p.id}>
            <td style={{ padding: '10px 12px' }}>{p.games_pitched}</td>
            <td style={{ padding: '10px 12px' }}>{p.innings_pitched.toFixed(1)}</td>
            <td style={{ padding: '10px 12px' }}>{p.games_started}</td>
            <td style={{ padding: '10px 12px' }}>{p.batters_faced}</td>
            <td style={{ padding: '10px 12px' }}>{p.number_of_pitches}</td>
            <td style={{ padding: '10px 12px' }}>{p.hits_allowed}</td>
            <td style={{ padding: '10px 12px' }}>{p.runs_allowed}</td>
            <td style={{ padding: '10px 12px' }}>{p.earned_runs}</td>
            <td style={{ padding: '10px 12px' }}>{p.walks_allowed}</td>
            <td style={{ padding: '10px 12px' }}>{p.strikeouts_thrown}</td>
            <td style={{ padding: '10px 12px' }}>{p.hit_by_pitches_allowed}</td>
            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--accent)' }}>{era.toFixed(2)}</td>
            <td style={{ padding: '10px 12px' }}>{whip.toFixed(2)}</td>
            <td style={{ padding: '10px 12px' }}>{p.left_on_base}</td>
          </React.Fragment>
        );
      })}
    </>
  );
}