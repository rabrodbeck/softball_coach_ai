import React, { useState, useEffect } from "react";
import { Plus, Users, Award, X, Trophy } from "lucide-react";

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
    onActiveTeamChanged: (teamname: string, ageGroup: string) => void;
}

export default function TeamManager({ coachId, onClose, onActiveTeamChanged }: TeamManagerProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // Form fields
    const [teamName, setTeamName] = useState("");
    const [season, setSeason] = useState("Spring 2026");
    const [ageGroup, setAgeGroup] = useState("12U Division");

    const API_BASE = import.meta.env.VIPE_API_URL || "http://localhost:8000";

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/teams/${coachId}`);
            if (response.ok) {
                const data = await response.json();
                setTeams(data);

                // Find the active team and update parent state
                const active = data.find((t: Team) => t.is_active);
                if (active) {
                    onActiveTeamChanged(active.team_name, active.age_group);
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
        if(!teamName.trim()) return;

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
                setTeamName("");
                setShowAddForm(false);
                fetchTeams();
            }
        } catch (err) {
            console.error("Error creating team:", err);
        }
    };

    const handleSetActive = async (teamId: number) => {
        try {
            const response = await fetch(`${API_BASE}/api/teams/${teamId}/active`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coach_id: coachId })
            });

            if (response.ok) {
                fetchTeams();
            }
        } catch (err) {
            console.error("Error setting active team:", err);
        }
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
                            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    <div className="teams-list-area">
                        <div className="list-subheader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text)' }}>Select or create a team below</span>
                            <button onClick={() => setShowAddForm(true)} className="btn-add-team">
                                <Plus size={16} /> Add Team
                            </button>
                        </div>
                        {loading && teams.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center' }}>Loading teams...</div>
                        ) : teams.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text)' }}>
                                📋 No teams registered yet. Click "Add Team" to get started!
                            </div>
                        ) : (
                            <div className="teams-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                                {teams.map((t) => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => handleSetActive(t.id)}
                                        className={`team-card ${t.is_active ? 'active' : ''}`}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '16px',
                                            borderRadius: '8px',
                                            border: t.is_active ? '2px solid var(--accent)' : '1px solid var(--border)',
                                            background: t.is_active ? 'var(--accent-bg)' : 'var(--bg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div className="team-card-info" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <Trophy style={{ color: t.is_active ? 'var(--accent)' : 'var(--text)' }} size={20} />
                                            <div>
                                                <h4 style={{ margin: 0, color: 'var(--text-h)', fontWeight: '600' }}>{t.team_name}</h4>
                                                <span style={{ fontSize: '12px', color: 'var(--text)' }}>{t.season} • {t.age_group}</span>
                                            </div>
                                        </div>
                                        <div className="team-stats" style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                            <span style={{ color: '#22c55e' }}>{t.wins}W</span>
                                            <span style={{ color: '#ef4444' }}>{t.losses}L</span>
                                            <span style={{ color: '#94a3b8' }}>{t.ties}T</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}