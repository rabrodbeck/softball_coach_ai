import { useState } from 'react';
import { apiFetch } from '../../../utils/api';

interface InviteCoachFormProps {
    teamId: number;
    coachId: number;
    onInviteSuccess: () => void;
}

// 1. Added "export" so other files can import it
// 2. Used the "InviteCoachFormProps" interface instead of inline types
export function InviteCoachForm({ teamId, coachId, onInviteSuccess }: InviteCoachFormProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'Head Coach' | 'Assistant Coach'>('Assistant Coach');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const res = await apiFetch(`/api/teams/${teamId}/coaches`, {
                method: 'POST',
                body: JSON.stringify({ coach_id: coachId, email, role })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Invitation failed.');
            setMessage({ type: 'success', text: `Success! Added ${data.coach_name} to the team.` });
            setEmail('');
            onInviteSuccess();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-h)', textAlign: 'left' }}>Invite Coach / Link Account</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                    type="email" 
                    placeholder="Coach's registered email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-h)', fontSize: '12px' }}
                />
                <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value as any)}
                    style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-h)', fontSize: '12px' }}
                >
                    <option value="Assistant Coach">Assistant (Read-Only)</option>
                    <option value="Head Coach">Head Coach (Full Access)</option>
                </select>
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ padding: '6px 12px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                    {loading ? 'Adding...' : 'Add'}
                </button>
            </div>
            {message && (
                <div style={{ fontSize: '11px', color: message.type === 'success' ? '#22c55e' : '#ef4444', textAlign: 'left' }}>
                    {message.text}
                </div>
            )}
        </form>
    );
}