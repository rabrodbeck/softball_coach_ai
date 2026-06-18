import React from 'react';
import type { Player } from '../types';

interface RosterFieldingTableProps {
  players: Player[];
}

export function RosterFieldingTable({ players }: RosterFieldingTableProps) {
  return (
    <>
      {players.map((p) => {
        const fpct = p.total_chances > 0 ? (p.putouts + p.assists) / p.total_chances : 1.000;

        return (
          <React.Fragment key={p.id}>
            <td style={{ padding: '10px 12px' }}>{p.games_played}</td>
            <td style={{ padding: '10px 12px' }}>{p.total_chances}</td>
            <td style={{ padding: '10px 12px' }}>{p.putouts}</td>
            <td style={{ padding: '10px 12px' }}>{p.assists}</td>
            <td style={{ padding: '10px 12px' }}>{p.errors}</td>
            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--accent)' }}>
              {p.total_chances > 0 ? fpct.toFixed(3) : 'N/A'}
            </td>
          </React.Fragment>
        );
      })}
    </>
  );
}