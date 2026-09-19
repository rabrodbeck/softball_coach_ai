import type { Player } from '../TeamManager/types';

interface AttendanceChecklistProps {
    players: Player[];
    availablePlayers: Player[];
    attendance: Record<number, boolean>;
    toggleAttendance: (playerId: number) => void;
}

export function AttendanceChecklist({
    players,
    availablePlayers,
    attendance,
    toggleAttendance
}: AttendanceChecklistProps) {
    return (
        <div style={{ background: 'var(--code-bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-h)', fontWeight: 'bold', marginBottom: '8px' }}>
                ATTENDANCE ({availablePlayers.length} / {players.length} Available)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[...players].sort((a, b) => a.player_name.localeCompare(b.player_name)).map(p => {
                    const isAttending = attendance[p.id] !== false;
                    return (
                        <button 
                            key={p.id}
                            onClick={() => toggleAttendance(p.id)}
                            style={{
                                padding: '6px 8px',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: isAttending ? 'var(--accent)' : 'var(--border)',
                                background: isAttending ? 'var(--accent-bg)' : 'transparent',
                                color: isAttending ? 'var(--accent)' : 'var(--text-d)',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.15s',
                                minWidth: 0
                            }}
                        >
                            <span style={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap', 
                                marginRight: '4px' 
                            }} title={`${p.player_name} (#${p.player_number})`}>
                                {p.player_name} #{p.player_number}
                            </span>
                            <span style={{ fontSize: '11px', flexShrink: 0 }}>
                                {isAttending ? '✓' : '✗'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
