import React from 'react';
import type { Player } from '../types';

interface RosterCatchingTableProps {
  players: Player[];
}

export function RosterCatchingTable({ players }: RosterCatchingTableProps) {
  return (
    <>
      {players.map((p) => {
        const cs_pct = (p.runners_stolen_bases + p.runners_caught_stealing) > 0 
            ? p.runners_caught_stealing / (p.runners_stolen_bases + p.runners_caught_stealing)
            : 0.000;

        return (
          <React.Fragment key={p.id}>
            <td style={{ padding: '10px 12px' }}>{p.innings_caught.toFixed(1)}</td>
            <td style={{ padding: '10px 12px' }}>{p.passed_balls_allowed}</td>
            <td style={{ padding: '10px 12px' }}>{p.runners_stolen_bases}</td>
            <td style={{ padding: '10px 12px' }}>{p.runners_caught_stealing}</td>
            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--accent)' }}>
              {(p.runners_stolen_bases + p.runners_caught_stealing) > 0 ? (cs_pct * 100).toFixed(1) + '%' : '0.0%'}
            </td>
          </React.Fragment>
        );
      })}
    </>
  );
}