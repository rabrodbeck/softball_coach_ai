import { useState } from 'react';
import type { Player } from '../types';
import { apiFetch } from '../../../utils/api';

const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];

interface PlayerEligibilityProps {
    players: Player[];
    onSaveSuccess: () => void;
}

export function PlayerEligibility({ players, onSaveSuccess }: PlayerEligibilityProps) {
    const [eligibilities, setEligibilities] = useState<Record<number, string[]>>(() => {
        const initial: Record<number, string[]> = {};
        players.forEach(p => {
            // Default to all positions if none specified
            const posStr = p.eligible_positions || "P,C,1B,2B,3B,SS,LF,CF,RF";
            initial[p.id] = posStr.split(',').map((s: string) => s.trim()).filter(Boolean);
        });
        return initial;
    });

    const [saving, setSaving] = useState<number | null>(null);

    const togglePosition = async (playerId: number, pos: string) => {
        const current = eligibilities[playerId] || [];
        const next = current.includes(pos) 
            ? current.filter(x => x !== pos) 
            : [...current, pos];
        
        // Optimistic State update
        setEligibilities(prev => ({ ...prev, [playerId]: next }));
        setSaving(playerId);

        try {
            const formatted = next.join(',');
            await apiFetch(`/api/players/${playerId}/eligibility`, {
                method: "PUT",
                body: JSON.stringify({ eligible_positions: formatted })
            });
            onSaveSuccess();
        } catch (e) {
            console.error("Failed to update position clearance:", e);
        } finally {
            setSaving(null);
        }
    };

    return (
        <div style={{ marginTop: '16px', overflowX: 'auto' }}>
            <h4 style={{ textAlign: 'left', margin: '0 0 12px 0', color: 'var(--text-h)' }}>Player Position Clearances</h4>
            <p style={{ textAlign: 'left', fontSize: '12px', margin: '0 0 16px 0', color: 'var(--text)' }}>
                Toggle clearances for each player. Unchecked positions will not be assigned to that player by the generator.
            </p>
            
            <table className="roster-table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Player</th>
                        {POSITIONS.map(p => (
                            <th key={p} style={{ textAlign: 'center', padding: '10px', fontSize: '11px' }}>{p}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {players.map(p => {
                        const cleared = eligibilities[p.id] || [];
                        return (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ textAlign: 'left', padding: '10px', fontWeight: 'bold' }}>
                                    {p.player_name} <span style={{ color: 'var(--accent)', fontSize: '11px' }}>#{p.player_number}</span>
                                    {saving === p.id && <span style={{ fontSize: '10px', color: '#10b981', marginLeft: '8px' }}>Saving...</span>}
                                </td>
                                {POSITIONS.map(pos => {
                                    const isCleared = cleared.includes(pos);
                                    return (
                                        <td key={pos} style={{ textAlign: 'center', padding: '10px' }}>
                                            <input 
                                                type="checkbox"
                                                checked={isCleared}
                                                onChange={() => togglePosition(p.id, pos)}
                                                style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}