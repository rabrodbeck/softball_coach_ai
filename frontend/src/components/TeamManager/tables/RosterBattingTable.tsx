import React from 'react';
import type { Player } from '../types';

interface RosterBattingTableProps {
  players: Player[];
}

export function RosterBattingTable({ players }: RosterBattingTableProps) {
  return (
    <>
      {players.map((p) => {
        const hits = p.singles + p.doubles + p.triples + p.home_runs;
        const reachedOnError = p.reached_on_error || 0;
        const battingAvg = p.at_bats > 0 ? hits / p.at_bats : 0.000;
        const obpDenom = p.at_bats + p.walks + p.hit_by_pitches;
        const onBasePct = obpDenom > 0 ? (hits + p.walks + p.hit_by_pitches) / obpDenom : 0.000;

        return (
          <React.Fragment key={p.id}>
            <td style={{ padding: '10px 12px' }}>{p.games_played}</td>
            <td style={{ padding: '10px 12px' }}>{p.plate_appearances}</td>
            <td style={{ padding: '10px 12px' }}>{p.at_bats}</td>
            <td style={{ padding: '10px 12px' }}>{hits}</td>
            <td style={{ padding: '10px 12px' }}>{p.walks}</td>
            <td style={{ padding: '10px 12px' }}>{p.strikeouts}</td>
            <td style={{ padding: '10px 12px' }}>{p.runs_scored}</td>
            <td style={{ padding: '10px 12px' }}>{p.runs_batted_in}</td>
            <td style={{ padding: '10px 12px' }}>{p.stolen_bases}</td>
            <td style={{ padding: '10px 12px' }}>{reachedOnError}</td>
            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--accent)' }}>{battingAvg.toFixed(3)}</td>
            <td style={{ padding: '10px 12px' }}>{onBasePct.toFixed(3)}</td>
          </React.Fragment>
        );
      })}
    </>
  );
}