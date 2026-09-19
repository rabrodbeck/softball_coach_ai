import React from 'react';
import { Lock, Upload, Plus } from 'lucide-react';
import type { Team } from './types';

interface WorkspaceHeaderProps {
    activeTeam: Team | undefined;
    activeTeamCoaches: { head_coaches: string; assistant_coaches: string } | null;
    userRole: 'Head Coach' | 'Assistant Coach' | null;
    statsMode: 'season' | 'career';
    setStatsMode: (mode: 'season' | 'career') => void;
    onFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddPlayer: () => void;
}

export function WorkspaceHeader({
    activeTeam,
    activeTeamCoaches,
    userRole,
    statsMode,
    setStatsMode,
    onFileImport,
    onAddPlayer
}: WorkspaceHeaderProps) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '48px' }}>
                <div>
                    {/* Team Roster Header */}
                    <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-h)' }}>{activeTeam?.team_name} Roster</h1>
                    
                    {/* Season Subtitle */}
                    <div style={{ fontSize: '15px', color: 'var(--text-h)', marginTop: '4px', fontWeight: '500' }}>
                        {activeTeam?.season} • {activeTeam?.age_group}
                    </div>
                    
                    {/* Team Record */}
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Record: {activeTeam?.wins}W - {activeTeam?.losses}L - {activeTeam?.ties}T
                    </p>
                </div>
                
                {activeTeamCoaches && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
                        <div><strong>Head Coach:</strong> {activeTeamCoaches.head_coaches}</div>
                        {activeTeamCoaches.assistant_coaches && (
                            <div style={{ marginTop: '4px' }}><strong>Assistant Coach:</strong> {activeTeamCoaches.assistant_coaches}</div>
                        )}
                    </div>
                )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                {/* Row 1: Actions Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    {userRole === 'Assistant Coach' ? (
                        <div className="assistant-lock" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <Lock size={13} /> Read-Only Mode (Assistant Coach)
                        </div>
                    ) : (
                        <>
                            {/* File Import Wrapper */}
                            <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}>
                                <Upload size={14} /> Import GC Stats
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    onChange={onFileImport} 
                                    style={{ display: 'none' }} 
                                />
                            </label>
                            
                            <button onClick={onAddPlayer} className="btn-add-player" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#000', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                <Plus size={14} /> Add Player
                            </button>
                        </>
                    )}
                </div>

                {/* Row 2: Slick Season/Career Stats Toggle Capsule */}
                <div 
                    style={{ 
                        display: 'inline-flex', 
                        padding: '3px', 
                        background: '#13151a', 
                        border: '1px solid var(--border)', 
                        borderRadius: '20px', 
                        position: 'relative',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '220px',
                        height: '36px'
                    }}
                >
                    {/* Sliding active indicator */}
                    <div 
                        style={{ 
                            position: 'absolute',
                            top: '2px',
                            bottom: '2px',
                            left: statsMode === 'season' ? '2px' : '110px',
                            width: '108px',
                            background: 'var(--accent)',
                            borderRadius: '18px',
                            transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            zIndex: 1
                        }}
                    />
                    
                    {/* Season Stats Selector option */}
                    <div 
                        onClick={() => setStatsMode('season')}
                        style={{ 
                            flex: 1, 
                            textAlign: 'center', 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            color: statsMode === 'season' ? '#000' : 'var(--text-secondary)',
                            zIndex: 2,
                            transition: 'color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        Season Stats
                    </div>
                    
                    {/* Career Stats Selector option */}
                    <div 
                        onClick={() => setStatsMode('career')}
                        style={{ 
                            flex: 1, 
                            textAlign: 'center', 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            color: statsMode === 'career' ? '#000' : 'var(--text-secondary)',
                            zIndex: 2,
                            transition: 'color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        Career Stats
                    </div>
                </div>
            </div>
        </div>
    );
}
