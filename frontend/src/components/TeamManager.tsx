import React, { useState, useEffect } from 'react';
import { Plus, Users, X, Trophy, Pencil } from 'lucide-react';

interface Team {
    id: number;
    team_name: string;
    season: string;
    wins: number;
    losses: number;
    ties: number;
    is_active: boolean;
    age_group: string;
}

interface TeamManagerProps {
    coachId: number;
    onClose: () => void;
    selectedTeamId: number | null;
    onSelectTeam: (team: Team) => void;
}

export default function TeamManager({ coachId, onClose, selectedTeamId, onSelectTeam }: TeamManagerProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    
    // Form fields
    const [teamName, setTeamName] = useState('');
    const [season, setSeason] = useState('Spring 2026');
    const [ageGroup, setAgeGroup] = useState('12U Division');
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [ties, setTies] = useState(0);
    const [isActive, setIsActive] = useState(false);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/teams/${coachId}`);
            if (response.ok) {
                const data = await response.json();
                setTeams(data);
                
                // If there is a selected team, update its values from the database load
                if (selectedTeamId) {
                    const currentSelected = data.find((t: Team) => t.id === selectedTeamId);
                    if (currentSelected) {
                        onSelectTeam(currentSelected);
                    }
                } else {
                    // Default to the first active team found if none is selected yet
                    const defaultActive = data.find((t: Team) => t.is_active);
                    if (defaultActive) {
                        onSelectTeam(defaultActive);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching teams:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, [coachId]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim()) return;

        try {
            const response = await fetch(`${API_BASE}/api/teams`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    coach_id: coachId,
                    team_name: teamName,
                    season: season,
                    age_group: ageGroup
                })
            });

            if (response.ok) {
                setTeamName('');
                setShowAddForm(false);
                fetchTeams();
            }
        } catch (err) {
            console.error("Error creating team:", err);
        }
    };

    const startEditing = (team: Team, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents selection trigger
        setEditingTeam(team);
        setTeamName(team.team_name);
        setSeason(team.season);
        setAgeGroup(team.age_group);
        setWins(team.wins);
        setLosses(team.losses);
        setTies(team.ties);
        setIsActive(team.is_active);
    };

    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeam || !teamName.trim()) return;

        try {
            const response = await fetch(`${API_BASE}/api/teams/${editingTeam.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    coach_id: coachId,
                    team_name: teamName,
                    season: season,
                    wins: wins,
                    losses: losses,
                    ties: ties,
                    age_group: ageGroup,
                    is_active: isActive
                })
            });

            if (response.ok) {
                setEditingTeam(null);
                setTeamName('');
                fetchTeams();
            }
        } catch (err) {
            console.error("Error updating team:", err);
        }
    };

    const cancelForms = () => {
        setShowAddForm(false);
        setEditingTeam(null);
        setTeamName('');
    };

    return (
        <div className="modal-overlay">
            <div className="team-manager-card">
                <div className="team-manager-header">
                    <div className="title-area">
                        <Users className="icon-sidebar" />
                        <h2>Roster & Team Manager</h2>
                    </div>
                    <button onClick={onClose} className="btn-close-modal"><X size={20} /></button>
                </div>

                {showAddForm ? (
                    <form onSubmit={handleCreateTeam} className="add-team-form">
                        <h3>Create New Team</h3>
                        <div className="input-group">
                            <label>Team Name</label>
                            <input 
                                type="text" 
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="Lady Hawks"
                                required
                            />
                        </div>
                        <div className="form-row-double" style={{ display: 'flex', gap: '12px' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Season</label>
                                <input 
                                    type="text" 
                                    value={season}
                                    onChange={(e) => setSeason(e.target.value)}
                                    placeholder="Spring 2026"
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Age Group</label>
                                <select 
                                    value={ageGroup} 
                                    onChange={(e) => setAgeGroup(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}
                                >
                                    <option value="8U Division">8U Division</option>
                                    <option value="10U Division">10U Division</option>
                                    <option value="12U Division">12U Division</option>
                                    <option value="14U Division">14U Division</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Team</button>
                            <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </form>
                ) : editingTeam ? (
                    <form onSubmit={handleUpdateTeam} className="add-team-form">
                        <h3>Edit Team Details</h3>
                        <div className="input-group">
                            <label>Team Name</label>
                            <input 
                                type="text" 
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-row-double" style={{ display: 'flex', gap: '12px' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Season</label>
                                <input 
                                    type="text" 
                                    value={season}
                                    onChange={(e) => setSeason(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Age Group</label>
                                <select 
                                    value={ageGroup} 
                                    onChange={(e) => setAgeGroup(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}
                                >
                                    <option value="8U Division">8U Division</option>
                                    <option value="10U Division">10U Division</option>
                                    <option value="12U Division">12U Division</option>
                                    <option value="14U Division">14U Division</option>
                                </select>
                            </div>
                        </div>

                        {/* W-L-T Record Stats Fields */}
                        <div className="stats-row" style={{ display: 'flex', gap: '12px' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label style={{ color: '#22c55e' }}>Wins</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={wins}
                                    onChange={(e) => setWins(parseInt(e.target.value) || 0)}
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label style={{ color: '#ef4444' }}>Losses</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={losses}
                                    onChange={(e) => setLosses(parseInt(e.target.value) || 0)}
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label style={{ color: '#94a3b8' }}>Ties</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={ties}
                                    onChange={(e) => setTies(parseInt(e.target.value) || 0)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Active Checkbox */}
                        <div className="active-checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                            <input 
                                type="checkbox" 
                                id="active-checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="active-checkbox" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Active Team this Season
                            </label>
                        </div>

                        <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Changes</button>
                            <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    <div className="teams-list-area">
                        <div className="list-subheader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text)' }}>Select or edit a team below</span>
                            <button onClick={() => setShowAddForm(true)} className="btn-add-team">
                                <Plus size={16} /> Add Team
                            </button>
                        </div>

                        {loading && teams.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center' }}>Loading teams...</div>
                        ) : teams.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text)' }}>
                                📋 No teams registered yet. Click \"Add Team\" to get started!
                            </div>
                        ) : (
                            <div className="teams-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                                {teams.filter(t => t.is_active).map((t) => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => onSelectTeam(t)}
                                        className={`team-card ${t.id === selectedTeamId ? 'active' : ''}`}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '16px',
                                            borderRadius: '8px',
                                            border: t.id === selectedTeamId ? '2px solid var(--accent)' : '1px solid var(--border)',
                                            background: t.id === selectedTeamId ? 'var(--accent-bg)' : 'var(--bg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div className="team-card-info" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <Trophy style={{ color: t.id === selectedTeamId ? 'var(--accent)' : 'var(--text)' }} size={20} />
                                            <div>
                                                <h4 style={{ margin: 0, color: 'var(--text-h)', fontWeight: '600' }}>{t.team_name}</h4>
                                                <span style={{ fontSize: '12px', color: 'var(--text)' }}>{t.season} • {t.age_group}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            <div className="team-stats" style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                                <span style={{ color: '#22c55e' }}>{t.wins}W</span>
                                                <span style={{ color: '#ef4444' }}>{t.losses}L</span>
                                                <span style={{ color: '#94a3b8' }}>{t.ties}T</span>
                                            </div>
                                            <button 
                                                onClick={(e) => startEditing(t, e)}
                                                className="btn-edit-team-pencil"
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text)',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Edit Team Details"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                
                                                                {/* Section for archived/inactive teams */}
                                {teams.some(t => !t.is_active) && (
                                    <>
                                        <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '8px 0' }} />
                                        <span style={{ fontSize: '12px', color: 'var(--text)', textAlign: 'left', fontWeight: 'bold' }}>Archived / Inactive Teams</span>
                                        {teams.filter(t => !t.is_active).map((t) => (
                                            <div 
                                                key={t.id} 
                                                onClick={() => onSelectTeam(t)}
                                                className={`team-card inactive ${t.id === selectedTeamId ? 'active' : ''}`}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '12px 16px',
                                                    borderRadius: '8px',
                                                    border: t.id === selectedTeamId ? '2px solid var(--accent)' : '1px solid var(--border)',
                                                    background: t.id === selectedTeamId ? 'var(--accent-bg)' : 'rgba(0,0,0,0.1)',
                                                    opacity: t.id === selectedTeamId ? 1 : 0.6,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div className="team-card-info" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <Users style={{ color: t.id === selectedTeamId ? 'var(--accent)' : 'var(--text)' }} size={20} />
                                                    <div>
                                                        <h4 style={{ margin: 0, color: 'var(--text-h)', fontWeight: t.id === selectedTeamId ? '600' : '500' }}>{t.team_name}</h4>
                                                        <span style={{ fontSize: '11px', color: 'var(--text)' }}>{t.season} • {t.age_group}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                    <div className="team-stats" style={{ display: 'flex', gap: '8px', fontSize: '12px', fontWeight: t.id === selectedTeamId ? 'bold' : 'normal' }}>
                                                        <span style={{ color: t.id === selectedTeamId ? '#22c55e' : 'inherit' }}>{t.wins}W</span>
                                                        <span style={{ color: t.id === selectedTeamId ? '#ef4444' : 'inherit' }}>{t.losses}L</span>
                                                        <span style={{ color: t.id === selectedTeamId ? '#94a3b8' : 'inherit' }}>{t.ties}T</span>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => startEditing(t, e)}
                                                        className="btn-edit-team-pencil"
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}