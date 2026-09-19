import React from 'react';
import { Plus, Pencil } from 'lucide-react';
import type { Team } from './types';

interface TeamSidebarProps {
    mobileActiveView: 'list' | 'detail';
    isLoading: boolean;
    teams: Team[];
    sortedTeams: Team[];
    selectedTeamId: number | null;
    onSelectTeam: (team: Team) => void;
    onAddTeam: () => void;
    onEditTeam: (team: Team, e: React.MouseEvent) => void;
}

export function TeamSidebar({
    mobileActiveView,
    isLoading,
    teams,
    sortedTeams,
    selectedTeamId,
    onSelectTeam,
    onAddTeam,
    onEditTeam
}: TeamSidebarProps) {
    return (
        <div 
            className={`team-manager-sidebar ${mobileActiveView === 'list' ? 'mobile-visible' : 'mobile-hidden'}`}
            style={{ width: '280px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--sidebar-bg)' }}
        >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>My Teams</span>
                <button onClick={onAddTeam} className="btn-add-team" style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={12} /> New Team
                </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {isLoading && teams.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading teams...</p>
                ) : sortedTeams.map((team) => (
                    <div 
                        key={team.id} 
                        onClick={() => onSelectTeam(team)}
                        className={`team-card ${team.id === selectedTeamId ? 'active' : ''}`}
                        style={{
                            padding: '16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginBottom: '12px',
                            background: team.id === selectedTeamId ? 'var(--accent-bg)' : 'var(--bg)',
                            border: team.id === selectedTeamId ? '2px solid var(--accent)' : '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: '600', color: team.id === selectedTeamId ? 'var(--text-h)' : 'var(--text-p)' }}>{team.team_name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{team.season} • {team.age_group}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div className="team-stats" style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                <span style={{ color: '#22c55e' }}>{team.wins}W</span>
                                <span style={{ color: '#ef4444' }}>{team.losses}L</span>
                                <span style={{ color: '#94a3b8' }}>{team.ties}T</span>
                            </div>
                            {team.role === 'Head Coach' && (
                                <button 
                                    onClick={(e) => onEditTeam(team, e)} 
                                    className="btn-edit-team-pencil"
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                    title="Edit Team"
                                >
                                    <Pencil size={15} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
