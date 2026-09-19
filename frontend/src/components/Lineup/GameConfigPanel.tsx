
interface GameConfigPanelProps {
    gameDate: string;
    setGameDate: (date: string) => void;
    opponent: string;
    setOpponent: (opp: string) => void;
    inningsCount: number;
    setInningsCount: (count: number) => void;
}

export function GameConfigPanel({
    gameDate,
    setGameDate,
    opponent,
    setOpponent,
    inningsCount,
    setInningsCount
}: GameConfigPanelProps) {
    return (
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
    );
}
