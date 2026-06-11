import React from 'react';
import type { Team } from '../types';
import { InviteCoachForm } from './InviteCoachForm';

interface TeamFormProps {
    coachId: number;
    editingTeam: Team | null;
    showAddForm: boolean;
    cancelForms: () => void;
    
    // States and handlers for form inputs
    teamName: string;
    setTeamName: (val: string) => void;
    season: string;
    setSeason: (val: string) => void;
    ageGroup: string;
    setAgeGroup: (val: string) => void;
    wins: number;
    setWins: (val: number) => void;
    losses: number;
    setLosses: (val: number) => void;
    ties: number;
    setTies: (val: number) => void;
    isActive: boolean;
    setIsActive: (val: boolean) => void;
    inningsPerGame: number;
    setInningsPerGame: (val: number) => void;
    
    // Form action triggers
    onCreateTeam: (e: React.FormEvent) => void;
    onUpdateTeam: (e: React.FormEvent) => void;
    onInviteSuccess: () => void;
}

export function TeamForm({
    coachId,
    editingTeam,
    showAddForm,
    cancelForms,
    teamName,
    setTeamName,
    season,
    setSeason,
    ageGroup,
    setAgeGroup,
    wins,
    setWins,
    losses,
    setLosses,
    ties,
    setTies,
    isActive,
    setIsActive,
    inningsPerGame,
    setInningsPerGame,
    onCreateTeam,
    onUpdateTeam,
    onInviteSuccess
}: TeamFormProps) {
    
    // 1. Create Team Form View
    if (showAddForm) {
        return (
            <form onSubmit={onCreateTeam} className="add-team-form">
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
                <div className="input-group">
                    <label>Innings Per Game (Game Length)</label>
                    <select 
                        value={inningsPerGame} 
                        onChange={(e) => setInningsPerGame(parseInt(e.target.value) || 7)} 
                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}
                    >
                        <option value="5">5 Innings</option>
                        <option value="6">6 Innings</option>
                        <option value="7">7 Innings</option>
                    </select>
                </div>
                <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Team</button>
                    <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                </div>
            </form>
        );
    }

    // 2. Edit Team Form View (Including the Coach invitation sub-form)
    if (editingTeam) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <form onSubmit={onUpdateTeam} className="add-team-form" style={{ marginBottom: 0 }}>
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
                    <div className="input-group">
                        <label>Innings Per Game (Game Length)</label>
                        <select 
                            value={inningsPerGame} 
                            onChange={(e) => setInningsPerGame(parseInt(e.target.value) || 7)} 
                            style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}
                        >
                            <option value="5">5 Innings</option>
                            <option value="6">6 Innings</option>
                            <option value="7">7 Innings</option>
                        </select>
                    </div>
                    <div className="active-checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <input 
                            type="checkbox" 
                            id="active-checkbox" 
                            checked={isActive} 
                            onChange={(e) => setIsActive(e.target.checked)} 
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                        />
                        <label htmlFor="active-checkbox" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>Active Team this Season</label>
                    </div>
                    <div className="form-actions" style={{ display: 'flex', gap: '12px' }}>
                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Changes</button>
                        <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                    </div>
                </form>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0' }} />

                <InviteCoachForm 
                    teamId={editingTeam.id} 
                    coachId={coachId} 
                    onInviteSuccess={onInviteSuccess} 
                />
            </div>
        );
    }

    return null;
}