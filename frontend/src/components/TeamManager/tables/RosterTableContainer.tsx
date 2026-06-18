import { Trash2 } from 'lucide-react';
import type { Player } from '../types';
import { useRosterSortFilter } from '../hooks/useRosterSortFilter';
import { RosterBattingTable } from './RosterBattingTable';
import { RosterPitchingTable } from './RosterPitchingTable';
import { RosterFieldingTable } from './RosterFieldingTable';
import { RosterCatchingTable } from './RosterCatchingTable';

interface RosterTableContainerProps {
  players: Player[];
  subView: 'batting' | 'pitching' | 'fielding' | 'catching';
  userRole: 'Head Coach' | 'Assistant Coach' | null;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer: (playerId: number) => void;
}

export function RosterTableContainer({
  players,
  subView,
  userRole,
  onEditPlayer,
  onDeletePlayer,
}: RosterTableContainerProps) {
  const {
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    handleSort,
    sortedPlayers,
  } = useRosterSortFilter(players);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search Input */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <input 
          type="text" 
          placeholder="Search roster by name or number..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-h)',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <table className="players-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)' }}>
              <th onClick={() => handleSort('player_number')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                # {sortField === 'player_number' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('player_name')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                Player Name {sortField === 'player_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('batting_hand')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                Bats {sortField === 'batting_hand' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('throwing_hand')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                Throws {sortField === 'throwing_hand' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              
              {subView === 'batting' && (
                <>
                  <th onClick={() => handleSort('games_played')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    GP {sortField === 'games_played' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('plate_appearances')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    PA {sortField === 'plate_appearances' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('at_bats')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    AB {sortField === 'at_bats' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('hits')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    H {sortField === 'hits' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('walks')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    BB {sortField === 'walks' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('strikeouts')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    K {sortField === 'strikeouts' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('runs_scored')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    R {sortField === 'runs_scored' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('runs_batted_in')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    RBI {sortField === 'runs_batted_in' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('stolen_bases')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    SB {sortField === 'stolen_bases' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('batting_average')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    AVG {sortField === 'batting_average' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('on_base_percentage')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    OBP {sortField === 'on_base_percentage' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </>
              )}
              {subView === 'pitching' && (
                <>
                  <th onClick={() => handleSort('games_pitched')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    GP {sortField === 'games_pitched' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('innings_pitched')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    IP {sortField === 'innings_pitched' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('games_started')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    GS {sortField === 'games_started' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('batters_faced')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    BF {sortField === 'batters_faced' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('number_of_pitches')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    #P {sortField === 'number_of_pitches' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('hits_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    H {sortField === 'hits_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('runs_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    R {sortField === 'runs_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('earned_runs')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    ER {sortField === 'earned_runs' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('walks_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    BB {sortField === 'walks_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('strikeouts_thrown')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    SO {sortField === 'strikeouts_thrown' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('hit_by_pitches_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    HBP {sortField === 'hit_by_pitches_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('era')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    ERA {sortField === 'era' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('whip')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    WHIP {sortField === 'whip' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('left_on_base')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    LOB {sortField === 'left_on_base' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </>
              )}
              {subView === 'fielding' && (
                <>
                  <th onClick={() => handleSort('games_played')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    GP {sortField === 'games_played' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('total_chances')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    TC {sortField === 'total_chances' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('putouts')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    PO {sortField === 'putouts' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('assists')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    A {sortField === 'assists' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('errors')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    E {sortField === 'errors' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('fielding_percentage')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    FPCT {sortField === 'fielding_percentage' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </>
              )}
              {subView === 'catching' && (
                <>
                  <th onClick={() => handleSort('innings_caught')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    IC {sortField === 'innings_caught' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('passed_balls_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    PB {sortField === 'passed_balls_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('runners_stolen_bases')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    SBA {sortField === 'runners_stolen_bases' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('runners_caught_stealing')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    CS {sortField === 'runners_caught_stealing' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('caught_stealing_percentage')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                    CS% {sortField === 'caught_stealing_percentage' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </>
              )}
              {userRole === 'Head Coach' && <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => onEditPlayer(p)}>
                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>#{p.player_number}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-h)', fontWeight: '600' }}>{p.player_name}</td>
                <td style={{ padding: '10px 12px' }}>{p.batting_hand}</td>
                <td style={{ padding: '10px 12px' }}>{p.throwing_hand}</td>
                
                {subView === 'batting' && <RosterBattingTable players={[p]} />}
                {subView === 'pitching' && <RosterPitchingTable players={[p]} />}
                {subView === 'fielding' && <RosterFieldingTable players={[p]} />}
                {subView === 'catching' && <RosterCatchingTable players={[p]} />}

                {userRole === 'Head Coach' && (
                  <td style={{ padding: '10px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => onDeletePlayer(p.id)} 
                      className="btn-delete-team" 
                      style={{ display: 'inline-flex', padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}