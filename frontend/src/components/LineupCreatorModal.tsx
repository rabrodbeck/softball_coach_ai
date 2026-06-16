import React, { useState, useEffect } from 'react';
import { X, Save, Shield, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface Player {
    id: number;
    player_name: string;
    player_number: number;
    innings_per_game?: number;
}

interface LineupCreatorModalProps {
    teamId: number;
    teamName: string;
    inningsPerGame: number;
    onClose: () => void;
}

// Map position keys to full display names
const FIELD_POSITIONS = [
    { key: 'P', label: 'PITCHER' },
    { key: 'C', label: 'CATCHER' },
    { key: '1B', label: '1ST BASE' },
    { key: '2B', label: '2ND BASE' },
    { key: '3B', label: '3RD BASE' },
    { key: 'SS', label: 'SHORT STOP' },
    { key: 'LF', label: 'LEFT FIELD' },
    { key: 'CF', label: 'CENTER FIELD' },
    { key: 'RF', label: 'RIGHT FIELD' }
];

export default function LineupCreatorModal({ teamId, teamName, inningsPerGame, onClose }: LineupCreatorModalProps) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // Config states
    const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
    const [opponent, setOpponent] = useState('');
    const [inningsCount, setInningsCount] = useState(inningsPerGame);
    
    // Attendance mapping: playerId -> isAttending (boolean)
    const [attendance, setAttendance] = useState<Record<number, boolean>>({});
    
    const [assignments, setAssignments] = useState<Record<number, Record<string, number | null>>>({});

    // Fetch team players on load
    useEffect(() => {
        const fetchRoster = async () => {
            try {
                const response = await apiFetch(`/api/players/${teamId}`);
                if (response.ok) {
                    const data = await response.json();
                    setPlayers(data);
                    
                    // Default all players to attending
                    const defaultAttendance: Record<number, boolean> = {};
                    data.forEach((p: Player) => {
                        defaultAttendance[p.id] = true;
                    });
                    setAttendance(defaultAttendance);

                    // Dynamically set innings count from the team's config returned with the roster
                    if (data.length > 0 && data[0].innings_per_game) {
                        setInningsCount(data[0].innings_per_game);
                    }
                 }
            } catch (err) {
                console.error("Error loading players:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRoster();
    }, [teamId]);

    const availablePlayers = players.filter(p => attendance[p.id] !== false);
    const benchCount = Math.max(0, availablePlayers.length - 9);

    // Dynamic list of bench slot keys
    const benchSlots = Array.from({ length: benchCount }, (_, i) => `bench_${i}`);

    const toggleAttendance = (playerId: number) => {
        setAttendance(prev => {
            const next = { ...prev, [playerId]: !prev[playerId] };
            
            // If marking player as absent, remove their assignments in all innings
            if (!next[playerId]) {
                setAssignments(current => {
                    const updated = { ...current };
                    Object.keys(updated).forEach(inning => {
                        const inningIdx = parseInt(inning);
                        Object.keys(updated[inningIdx]).forEach(key => {
                            if (updated[inningIdx][key] === playerId) {
                                updated[inningIdx][key] = null;
                            }
                        });
                    });
                    return updated;
                });
            }
            return next;
        });
    };

    // Helper to identify player details by ID
    const getPlayerById = (id: number | null) => {
        if (id === null) return null;
        return players.find(p => p.id === id) || null;
    };

    // Handle dropping a player onto a grid cell
    const handleDrop = (
        playerId: number,
        targetInning: number,
        targetKey: string,
        sourceInning: number | null,
        _sourceKey: string | null
    ) => {
        // Lineup grids are built per-inning; block dragging players between different innings
        if (sourceInning !== null && sourceInning !== targetInning) return;

        setAssignments(prev => {
            const next = { ...prev };
            if (!next[targetInning]) next[targetInning] = {};

            // 1. Remove player from any previous position they held in this inning
            const previousKey = Object.keys(next[targetInning]).find(
                key => next[targetInning][key] === playerId
            );
            if (previousKey) {
                next[targetInning][previousKey] = null;
            }

            // 2. Identify who currently occupies the target position
            const displacedPlayerId = next[targetInning][targetKey] || null;

            // 3. Place player in the target cell
            next[targetInning][targetKey] = playerId;

            // 4. If there was a displaced player and we dragged from another slot (swap), swap them
            if (displacedPlayerId && previousKey) {
                next[targetInning][previousKey] = displacedPlayerId;
            }

            return next;
        });
    };

    // Remove assignment and return player to pool
    const handleRemoveAssignment = (inning: number, key: string) => {
        setAssignments(prev => {
            const next = { ...prev };
            if (next[inning]) {
                next[inning][key] = null;
            }
            return next;
        });
    };

    // Get list of unassigned players for a specific inning
    const getUnassignedPlayers = (inningIdx: number) => {
        const inningAssignments = assignments[inningIdx] || {};
        const assignedIds = new Set(Object.values(inningAssignments).filter(Boolean));
        return availablePlayers.filter(p => !assignedIds.has(p.id));
    };

    const handleSaveLineup = async () => {
        if (!opponent.trim()) {
            alert("Please enter the Opponent's name.");
            return;
        }

        setSaveStatus('saving');
        try {
            const response = await apiFetch(`/api/teams/${teamId}/lineups`, {
                method: "POST",
                body: JSON.stringify({
                    game_date: gameDate,
                    opponent: opponent,
                    innings_count: inningsCount,
                    lineup_data: {
                        attendance: Object.keys(attendance).filter(id => attendance[parseInt(id)]),
                        assignments: assignments
                    }
                })
            });

            if (response.ok) {
                setSaveStatus('success');
                setTimeout(() => {
                    setSaveStatus('idle');
                    onClose();
                }, 1500);
            } else {
                setSaveStatus('error');
            }
        } catch (err) {
            console.error("Failed to save lineup:", err);
            setSaveStatus('error');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="team-manager-card" style={{ width: '98vw', maxWidth: '1600px', maxHeight: '98vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="team-manager-header" style={{ flexShrink: 0, marginBottom: '12px', paddingBottom: '8px' }}>
                    <div className="title-area">
                        <Shield className="icon-gold" />
                        <h2>Create Lineup & Rotations — {teamName}</h2>
                    </div>
                    <button onClick={onClose} className="btn-close-modal">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-d)' }}>Loading roster...</div>
                ) : (
                    <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        {/* Left Panel: Game Config & Attendance */}
                        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0, overflowY: 'auto', paddingRight: '4px' }}>
                            {/* Game Configuration Panel */}
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                gap: '8px', 
                                background: 'var(--code-bg)', 
                                padding: '12px', 
                                borderRadius: '10px',
                                border: '1px solid var(--border)'
                            }}>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-h)', fontWeight: 'bold' }}>GAME DETAILS</label>
                                <div className="input-group">
                                    <label style={{ fontSize: '11px', color: 'var(--text-d)', fontWeight: 'bold' }}>GAME DATE</label>
                                    <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} style={{ width: '100%' }} />
                                </div>
                                <div className="input-group">
                                    <label style={{ fontSize: '11px', color: 'var(--text-d)', fontWeight: 'bold' }}>OPPONENT</label>
                                    <input type="text" placeholder="e.g. Bartlett Tigers" value={opponent} onChange={(e) => setOpponent(e.target.value)} required style={{ width: '100%' }} />
                                </div>
                                <div className="input-group">
                                    <label style={{ fontSize: '11px', color: 'var(--text-d)', fontWeight: 'bold' }}>INNINGS</label>
                                    <select value={inningsCount} onChange={(e) => setInningsCount(parseInt(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }}>
                                        {[3, 4, 5, 6, 7].map(num => (
                                            <option key={num} value={num}>{num} Innings</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Roster & Attendance Checklist (Listed vertically & alphabetically in a compact two-column layout) */}
                            <div style={{ background: 'var(--code-bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-h)', fontWeight: 'bold', marginBottom: '8px' }}>
                                    ATTENDANCE ({availablePlayers.length} / {players.length} Available)
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
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
                        </div>

                        {/* Right Panel: Lineup Grid & Pool */}
                        <div style={{ flex: 1, minWidth: '0', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                            {/* Interactive Grid Scroll Container */}
                            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: `${150 + inningsCount * 180}px` }}>
                                <thead>
                                    <tr style={{ background: 'var(--code-bg)', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                                        <th style={{ 
                                            padding: '6px 10px', 
                                            color: 'var(--text-h)', 
                                            fontWeight: 'bold', 
                                            width: '150px', 
                                            borderRight: '1px solid var(--border)', 
                                            background: 'var(--code-bg)',
                                            position: 'sticky',
                                            top: 0,
                                            left: 0,
                                            zIndex: 20,
                                            fontSize: '11px'
                                        }}>POSITION</th>
                                        {Array.from({ length: inningsCount }).map((_, idx) => (
                                            <th key={idx} style={{ 
                                                padding: '6px 10px', 
                                                color: 'var(--text-h)', 
                                                fontWeight: 'bold', 
                                                textAlign: 'center', 
                                                minWidth: '180px', 
                                                background: 'var(--code-bg)',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 10,
                                                fontSize: '11px'
                                            }}>
                                                {idx + 1 === 1 ? '1ST' : idx + 1 === 2 ? '2ND' : idx + 1 === 3 ? '3RD' : `${idx + 1}TH`} INNING
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Field Position Rows */}
                                    {FIELD_POSITIONS.map(pos => (
                                        <tr key={pos.key} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ 
                                                padding: '6px 10px', 
                                                fontWeight: 'bold', 
                                                color: 'var(--text-h)', 
                                                background: 'var(--code-bg)', 
                                                borderRight: '1px solid var(--border)',
                                                position: 'sticky',
                                                left: 0,
                                                zIndex: 5,
                                                fontSize: '11px'
                                            }}>
                                                {pos.label}
                                            </td>
                                            {Array.from({ length: inningsCount }).map((_, inningIdx) => {
                                                const assignedPlayerId = assignments[inningIdx]?.[pos.key] || null;
                                                const assignedPlayer = getPlayerById(assignedPlayerId);
                                                return (
                                                    <td 
                                                        key={inningIdx} 
                                                        style={{ padding: '3px 6px', verticalAlign: 'middle' }}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => {
                                                            try {
                                                                const raw = e.dataTransfer.getData("text/plain");
                                                                const data = JSON.parse(raw);
                                                                handleDrop(data.playerId, inningIdx, pos.key, data.sourceInning, data.sourceKey);
                                                            } catch (err) {
                                                                console.error(err);
                                                            }
                                                        }}
                                                    >
                                                        <div style={{
                                                            minHeight: '26px',
                                                            borderRadius: '6px',
                                                            border: '1px dashed',
                                                            borderColor: assignedPlayer ? 'var(--accent)' : 'var(--border)',
                                                            background: assignedPlayer ? 'var(--accent-bg)' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: '2px',
                                                            position: 'relative',
                                                            transition: 'all 0.15s'
                                                        }}>
                                                            {assignedPlayer ? (
                                                                <div 
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, assignedPlayer.id, inningIdx, pos.key)}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '3px 6px',
                                                                        background: 'var(--bg)',
                                                                        border: '1px solid var(--accent)',
                                                                        borderRadius: '4px',
                                                                        fontSize: '11px',
                                                                        color: 'var(--accent)',
                                                                        fontWeight: 'bold',
                                                                        textAlign: 'center',
                                                                        cursor: 'grab',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                                        whiteSpace: 'nowrap',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <span>{assignedPlayer.player_name} #{assignedPlayer.player_number}</span>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveAssignment(inningIdx, pos.key);
                                                                        }}
                                                                        style={{
                                                                            border: 'none',
                                                                            background: 'transparent',
                                                                            color: 'var(--text-d)',
                                                                            cursor: 'pointer',
                                                                            fontSize: '12px',
                                                                            padding: '0 2px',
                                                                            lineHeight: 1,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', color: 'var(--text-d)' }}>Drag here</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}

                                    {/* Bench Rows */}
                                    {benchSlots.map((benchKey) => (
                                        <tr key={benchKey} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                                            <td style={{ 
                                                padding: '6px 10px', 
                                                fontWeight: 'bold', 
                                                color: '#000000', 
                                                background: '#f1f5f9', 
                                                borderRight: '1px solid var(--border)',
                                                position: 'sticky',
                                                left: 0,
                                                zIndex: 5,
                                                fontSize: '11px'
                                            }}>
                                                BENCH
                                            </td>
                                            {Array.from({ length: inningsCount }).map((_, inningIdx) => {
                                                const assignedPlayerId = assignments[inningIdx]?.[benchKey] || null;
                                                const assignedPlayer = getPlayerById(assignedPlayerId);
                                                return (
                                                    <td 
                                                        key={inningIdx} 
                                                        style={{ padding: '3px 6px', verticalAlign: 'middle' }}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => {
                                                            try {
                                                                const raw = e.dataTransfer.getData("text/plain");
                                                                const data = JSON.parse(raw);
                                                                handleDrop(data.playerId, inningIdx, benchKey, data.sourceInning, data.sourceKey);
                                                            } catch (err) {
                                                                    console.error(err);
                                                            }
                                                        }}
                                                     >
                                                        <div style={{
                                                            minHeight: '26px',
                                                            borderRadius: '6px',
                                                            border: '1px dashed var(--border)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: '2px',
                                                            position: 'relative'
                                                        }}>
                                                            {assignedPlayer ? (
                                                                <div 
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, assignedPlayer.id, inningIdx, benchKey)}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '3px 6px',
                                                                        background: '#f8fafc',
                                                                        border: '1px solid #94a3b8',
                                                                        borderRadius: '4px',
                                                                        fontSize: '11px',
                                                                        color: '#000000',
                                                                        fontWeight: 'bold',
                                                                        textAlign: 'center',
                                                                        cursor: 'grab',
                                                                        whiteSpace: 'nowrap',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <span>{assignedPlayer.player_name} #{assignedPlayer.player_number}</span>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveAssignment(inningIdx, benchKey);
                                                                        }}
                                                                        style={{
                                                                            border: 'none',
                                                                            background: 'transparent',
                                                                            color: '#000000',
                                                                            cursor: 'pointer',
                                                                            fontSize: '12px',
                                                                            padding: '0 2px',
                                                                            lineHeight: 1,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', color: 'var(--text-d)' }}>Drag here</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                    
                                    {/* Unassigned Players Pool Row (Sticky at the bottom of the table) */}
                                    <tr style={{ background: 'var(--code-bg)' }}>
                                        <td style={{ 
                                            padding: '8px 12px', 
                                            fontWeight: 'bold', 
                                            color: 'var(--text-h)', 
                                            borderRight: '1px solid var(--border)', 
                                            borderTop: '2px solid var(--border)',
                                            position: 'sticky',
                                            bottom: 0,
                                            left: 0,
                                            background: 'var(--code-bg)',
                                            zIndex: 20,
                                            fontSize: '11px'
                                        }}>
                                            UNASSIGNED POOL
                                        </td>
                                        {Array.from({ length: inningsCount }).map((_, inningIdx) => {
                                            const unassigned = getUnassignedPlayers(inningIdx);
                                            return (
                                                <td 
                                                    key={inningIdx} 
                                                    style={{ 
                                                        padding: '4px 6px', 
                                                        verticalAlign: 'top', 
                                                        borderTop: '2px solid var(--border)',
                                                        position: 'sticky',
                                                        bottom: 0,
                                                        background: 'var(--code-bg)',
                                                        zIndex: 10
                                                    }}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        try {
                                                            const raw = e.dataTransfer.getData("text/plain");
                                                            const data = JSON.parse(raw);
                                                            // If dragged from grid cell, return to unassigned pool
                                                            if (data.sourceInning === inningIdx && data.sourceKey) {
                                                                handleRemoveAssignment(inningIdx, data.sourceKey);
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                        }
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px', minHeight: '30px', justifyContent: 'center', alignItems: 'center' }}>
                                                        {unassigned.map(p => (
                                                            <div 
                                                                key={p.id}
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, p.id, inningIdx, null)}
                                                                style={{
                                                                    padding: '3px 6px',
                                                                    background: 'var(--accent-bg)',
                                                                    border: '1px solid var(--accent)',
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px',
                                                                    color: 'var(--accent)',
                                                                    fontWeight: 'bold',
                                                                    textAlign: 'center',
                                                                    cursor: 'grab',
                                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                                    transition: 'all 0.15s',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {p.player_name} #{p.player_number}
                                                            </div>
                                                        ))}
                                                        {unassigned.length === 0 && (
                                                            <div style={{ fontSize: '11px', color: 'var(--accent)', textAlign: 'center', padding: '4px 0' }}>All placed! 🎉</div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer Controls */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                            {saveStatus === 'success' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontSize: '14px', fontWeight: 'bold' }}>
                                    ✓ Lineup saved successfully!
                                </div>
                            )}
                            {saveStatus === 'error' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>
                                    <AlertCircle size={16} /> Error saving lineup. Please try again.
                                </div>
                            )}
                            <button 
                                onClick={onClose} 
                                className="btn-secondary"
                                style={{ padding: '10px 20px', borderRadius: '6px' }}
                            >
                                Close
                            </button>
                            <button 
                                onClick={handleSaveLineup} 
                                disabled={saveStatus === 'saving' || !opponent.trim()}
                                className="btn-primary"
                                style={{ 
                                    padding: '10px 24px', 
                                    borderRadius: '6px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    fontWeight: 'bold',
                                    cursor: opponent.trim() ? 'pointer' : 'not-allowed',
                                    opacity: opponent.trim() ? 1 : 0.6
                                }}
                            >
                                <Save size={16} />
                                {saveStatus === 'saving' ? 'Saving...' : 'Save Lineup'}
                            </button>
                        </div>
                    </div>

                </div>
                )}

            </div>
        </div>
    );
}

// Drag helper function
const handleDragStart = (e: React.DragEvent, playerId: number, inningIndex: number, sourceKey: string | null) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ playerId, sourceInning: inningIndex, sourceKey }));
};