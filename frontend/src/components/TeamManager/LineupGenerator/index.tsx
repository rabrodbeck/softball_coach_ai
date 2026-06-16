import { useState, useEffect } from 'react';
import type { Player, Team } from '../types';
import { apiFetch } from '../../../utils/api';
import { PlayerEligibility } from './PlayerEligibility';
import { Play, Save, Trash2 } from 'lucide-react';

const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];

interface LineupGeneratorTabProps {
    team: Team;
    players: Player[];
    onRefreshPlayers: () => void;
}

export function LineupGeneratorTab({ team, players, onRefreshPlayers }: LineupGeneratorTabProps) {
    const [viewMode, setViewMode] = useState<'generate' | 'eligibility'>('generate');
    const [attendance, setAttendance] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        players.forEach(p => { initial[p.id] = true; }); // Default to present
        return initial;
    });

    const [gameDate, setGameDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [opponent, setOpponent] = useState('');
    const [loading, setLoading] = useState(false);
    const [lineup, setLineup] = useState<any[] | null>(null);
    const [savedLineups, setSavedLineups] = useState<any[]>([]);

    useEffect(() => {
        fetchSavedLineups();
    }, [team.id]);

    const fetchSavedLineups = async () => {
        try {
            const res = await apiFetch(`/api/teams/${team.id}/lineups`);
            if (res.ok) {
                const data = await res.json();
                setSavedLineups(data);
            }
        } catch (e) {
            console.error("Error fetching lineups:", e);
        }
    };

    const handleToggleAttendance = (playerId: number) => {
        setAttendance(prev => ({ ...prev, [playerId]: !prev[playerId] }));
    };

    const handleGenerate = async () => {
        const activePlayerIds = players.filter(p => attendance[p.id]).map(p => p.id);
        if (activePlayerIds.length < 9) {
            alert("You must select at least 9 players to field a lineup.");
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch(`/api/teams/${team.id}/generate-lineup`, {
                method: "POST",
                body: JSON.stringify({
                    player_ids: activePlayerIds,
                    innings_count: team.innings_per_game || 6
                })
            });
            const data = await res.json();
            if (res.ok) {
                setLineup(data.innings);
            } else {
                alert(data.detail || "Could not generate rotation.");
            }
        } catch (e) {
            console.error("Lineup error:", e);
        } finally {
            setLoading(false);
        }
    };

    // Swap players in a cell manually
    const handleSwapPlayer = (inningIdx: number, pos: string, targetPlayerId: number) => {
        if (!lineup) return;
        const nextLineup = [...lineup];
        const inning = nextLineup[inningIdx];
        
        const currentAssignee = inning.assignments[pos];
        // Find if targetPlayer is assigned elsewhere or on the bench
        let prevPos: string | null = null;
        for (const [pKey, val] of Object.entries(inning.assignments)) {
            if (val === targetPlayerId) {
                prevPos = pKey;
                break;
            }
        }

        if (prevPos) {
            // Swap positions
            inning.assignments[pos] = targetPlayerId;
            inning.assignments[prevPos] = currentAssignee;
        } else if (inning.bench.includes(targetPlayerId)) {
            // Swap with bench
            inning.assignments[pos] = targetPlayerId;
            inning.bench = inning.bench.filter((id: number) => id !== targetPlayerId);
            if (currentAssignee) {
                inning.bench.push(currentAssignee);
            }
        }
        setLineup(nextLineup);
    };

    const handleSaveLineup = async () => {
        if (!lineup || !opponent) {
            alert("Please specify the opponent name before saving.");
            return;
        }
        try {
            const res = await apiFetch(`/api/teams/${team.id}/lineups`, {
                method: "POST",
                body: JSON.stringify({
                    game_date: gameDate,
                    opponent: opponent,
                    innings_count: team.innings_per_game || 6,
                    lineup_data: { innings: lineup }
                })
            });
            if (res.ok) {
                alert("Lineup saved successfully!");
                fetchSavedLineups();
            }
        } catch (e) {
            console.error("Failed to save lineup:", e);
        }
    };

    const handleDeleteLineup = async (lineupId: number) => {
        if (!confirm("Are you sure you want to delete this saved lineup?")) return;
        try {
            const res = await apiFetch(`/api/lineups/${lineupId}`, { method: "DELETE" });
            if (res.ok) {
                fetchSavedLineups();
            }
        } catch (e) {
            console.error("Delete failed:", e);
        }
    };

    return (
        <div style={{ color: 'var(--text)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-h)' }}>Defensive Lineup Generator</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => setViewMode('generate')} 
                        className={viewMode === 'generate' ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                        Rotations
                    </button>
                    <button 
                        onClick={() => setViewMode('eligibility')} 
                        className={viewMode === 'eligibility' ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                        Eligibilities
                    </button>
                </div>
            </div>

            {viewMode === 'eligibility' ? (
                <PlayerEligibility players={players} onSaveSuccess={onRefreshPlayers} />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Setup / Attendance grid */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ flex: 1, minWidth: '250px', textAlign: 'left' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-h)' }}>Attendance</h4>
                            <p style={{ fontSize: '11px', margin: '0 0 12px 0' }}>Uncheck players not attending today.</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {players.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => handleToggleAttendance(p.id)}
                                        style={{ 
                                            padding: '6px 10px', 
                                            borderRadius: '20px', 
                                            border: '1px solid var(--border)', 
                                            background: attendance[p.id] ? 'var(--accent)' : 'transparent',
                                            color: attendance[p.id] ? 'var(--accent-text)' : 'var(--text)',
                                            fontWeight: 'bold', 
                                            fontSize: '11px', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        {p.player_name} #{p.player_number}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '220px', textAlign: 'left' }}>
                            <h4 style={{ margin: 0, color: 'var(--text-h)' }}>Config</h4>
                            <div className="input-group">
                                <label style={{ fontSize: '11px' }}>Game Date</label>
                                <input 
                                    type="date" 
                                    value={gameDate} 
                                    onChange={(e) => setGameDate(e.target.value)}
                                    style={{ padding: '6px', fontSize: '12px' }}
                                />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: '11px' }}>Opponent</label>
                                <input 
                                    type="text" 
                                    value={opponent} 
                                    onChange={(e) => setOpponent(e.target.value)}
                                    placeholder="Stingers"
                                    required
                                    style={{ padding: '6px', fontSize: '12px' }}
                                />
                            </div>
                            <button 
                                onClick={handleGenerate} 
                                disabled={loading}
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold' }}
                            >
                                <Play size={14} />
                                {loading ? "Computing..." : "Generate Lineup"}
                            </button>
                        </div>
                    </div>

                    {/* Saved Lineups List */}
                    {savedLineups.length > 0 && !lineup && (
                        <div style={{ textAlign: 'left', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-h)' }}>Saved Lineups</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {savedLineups.map(l => (
                                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--border)' }}>
                                        <div>
                                            <strong style={{ color: 'var(--text-h)' }}>vs {l.opponent}</strong>
                                            <span style={{ fontSize: '12px', marginLeft: '8px', color: 'var(--text)' }}>({l.game_date})</span>
                                            <span style={{ fontSize: '11px', marginLeft: '12px', color: 'var(--text)', opacity: 0.8 }}>({l.innings_count} Innings)</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                onClick={() => {
                                                    setLineup(l.lineup_data.innings);
                                                    setGameDate(l.game_date.split('T')[0]);
                                                    setOpponent(l.opponent);
                                                }} 
                                                className="btn-secondary" 
                                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                            >
                                                Load
                                            </button>
                                            <button onClick={() => handleDeleteLineup(l.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }}><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rotation Grid Editor */}
                    {lineup && (
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ margin: 0, color: 'var(--text-h)' }}>Field Rotation: vs {opponent || '...'} ({gameDate})</h4>
                                <button 
                                    onClick={handleSaveLineup}
                                    className="btn-primary" 
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}
                                >
                                    <Save size={14} /> Save Lineup
                                </button>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                            <th style={{ textAlign: 'left', padding: '10px' }}>Position</th>
                                            {lineup.map((x, idx) => (
                                                <th key={idx} style={{ padding: '10px', fontSize: '12px' }}>Inning {x.inning}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {POSITIONS.map(pos => (
                                            <tr key={pos} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ textAlign: 'left', padding: '10px', fontWeight: 'bold', color: 'var(--text-h)' }}>{pos}</td>
                                                {lineup.map((x, inningIdx) => {
                                                    const currentId = x.assignments[pos];
                                                    
                                                    // Filter for dropdown candidates
                                                    const presentPlayers = players.filter(p => attendance[p.id]);

                                                    return (
                                                        <td key={inningIdx} style={{ padding: '6px' }}>
                                                            <select
                                                                value={currentId || ''}
                                                                onChange={(e) => handleSwapPlayer(inningIdx, pos, Number(e.target.value))}
                                                                style={{ 
                                                                    width: '100%', 
                                                                    padding: '4px', 
                                                                    background: 'var(--code-bg)', 
                                                                    color: 'var(--text-h)', 
                                                                    border: '1px solid var(--border)', 
                                                                    borderRadius: '4px',
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                <option value="">-- Empty --</option>
                                                                {presentPlayers.map(p => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.player_name} #{p.player_number}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        
                                        {/* Bench list */}
                                        <tr style={{ borderTop: '2px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                                            <td style={{ textAlign: 'left', padding: '10px', fontWeight: 'bold', color: '#f59e0b' }}>Benched</td>
                                            {lineup.map((x, inningIdx) => {
                                                const benchedPlayers = players.filter(p => x.bench.includes(p.id));
                                                return (
                                                    <td key={inningIdx} style={{ padding: '10px', verticalAlign: 'top' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {benchedPlayers.map(bp => (
                                                                <span key={bp.id} style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                    {bp.player_name} #{bp.player_number}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}