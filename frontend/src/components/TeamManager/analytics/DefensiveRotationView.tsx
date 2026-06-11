import { useState, useEffect } from 'react';

export interface PlayerPositionStats {
    id: number;
    player_name: string;
    player_number: number;
    innings_p: number;
    innings_c: number;
    innings_1b: number;
    innings_2b: number;
    innings_3b: number;
    innings_ss: number;
    innings_lf: number;
    innings_cf: number;
    innings_rf: number;
}

export function DefensiveRotationView({
    players,
    selectedPosition,
    onSelectPosition
}: {
    players: any[];
    selectedPosition: string | null;
    onSelectPosition: (pos: string) => void;
}) {
    const [selectedFielderId, setSelectedFielderId] = useState<number | null>(null);

    const positionKeys: Record<string, string> = {
        'P': 'innings_p',
        'C': 'innings_c',
        '1B': 'innings_1b',
        '2B': 'innings_2b',
        '3B': 'innings_3b',
        'SS': 'innings_ss',
        'LF': 'innings_lf',
        'CF': 'innings_cf',
        'RF': 'innings_rf'
    };

    useEffect(() => {
        if (players.length > 0 && selectedFielderId === null) {
            setSelectedFielderId(players[0].id);
        }
    }, [players, selectedFielderId]);

    const getPositionLeader = (pos: string) => {
        const key = positionKeys[pos];
        const sorted = [...players].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
        const leader = sorted[0];
        if (leader && (leader[key] ?? 0) > 0) {
            return { name: leader.player_name.split(' ')[0], innings: leader[key] };
        }
        return { name: "None", innings: 0.0 };
    };

    const activePlayer = players.find(p => p.id === selectedFielderId) || players[0];
    
    const playerPositionData = Object.keys(positionKeys).map(pos => {
        const key = positionKeys[pos];
        return { pos, innings: activePlayer ? (activePlayer[key] ?? 0.0) : 0.0 };
    }).sort((a, b) => b.innings - a.innings);

    const primaryPos = playerPositionData[0];
    const secondaryPos = playerPositionData[1];

    const fieldPositions = [
        { id: 'CF', x: 170, y: 45 },
        { id: 'LF', x: 80, y: 80 },
        { id: 'RF', x: 260, y: 80 },
        { id: 'SS', x: 120, y: 135 },
        { id: '2B', x: 220, y: 135 },
        { id: '3B', x: 80, y: 200 },
        { id: 'P',  x: 170, y: 180 },
        { id: '1B', x: 260, y: 200 },
        { id: 'C',  x: 170, y: 290 }
    ];

    const targetKey = positionKeys[selectedPosition || 'SS'];
    const rankingList = [...players]
        .filter(p => (p[targetKey] ?? 0) > 0)
        .sort((a, b) => (b[targetKey] ?? 0) - (a[targetKey] ?? 0));

    return (
        <div className="analytics-grid" style={{ padding: '16px 8px', background: 'var(--card-bg)', borderRadius: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text)', fontWeight: 'bold', alignSelf: 'flex-start' }}>
                    Active Field Inning Leaders
                </h4>
                
                <svg viewBox="0 0 340 340" style={{ width: '100%', height: 'auto', maxWidth: '340px', overflow: 'visible', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '50%', border: '2px dashed var(--border)' }}>
                    <path d="M 170,300 L 40,170 A 184,184 0 0,1 300,170 Z" fill="rgba(139, 92, 26, 0.15)" stroke="var(--border)" strokeWidth="1" />
                    <rect x="165" y="295" width="10" height="10" transform="rotate(45 170 300)" fill="white" />
                    <circle cx="170" cy="180" r="24" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3,3" />
                    <polygon points="170,300 80,210 170,120 260,210" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                    
                    {fieldPositions.map(pos => {
                        const leader = getPositionLeader(pos.id);
                        const isSelected = selectedPosition === pos.id;

                        return (
                            <g 
                                key={pos.id} 
                                style={{ cursor: 'pointer' }}
                                onClick={() => onSelectPosition(pos.id)}
                            >
                                <circle 
                                    cx={pos.x} 
                                    cy={pos.y} 
                                    r={isSelected ? "18" : "15"} 
                                    fill={isSelected ? "var(--accent)" : "var(--card-bg)"} 
                                    stroke={isSelected ? "white" : "var(--border)"} 
                                    strokeWidth="2" 
                                    style={{ transition: 'all 0.15s ease-out' }}
                                />
                                <text 
                                    x={pos.x} 
                                    y={pos.y + 4} 
                                    textAnchor="middle" 
                                    fill={isSelected ? "var(--card-bg)" : "var(--text)"} 
                                    fontSize="10px" 
                                    fontWeight="bold"
                                >
                                    {pos.id}
                                </text>
                                
                                <g transform={`translate(${pos.x}, ${pos.y + 24})`}>
                                    <rect x="-35" y="-8" width="70" height="22" rx="4" fill="rgba(0,0,0,0.6)" />
                                    <text textAnchor="middle" fill="white" fontSize="8px" fontWeight="semibold" y="2">
                                        {leader.name}
                                    </text>
                                    <text textAnchor="middle" fill="var(--accent)" fontSize="7px" y="10">
                                        {(leader.innings ?? 0.0).toFixed(1)} IP
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-h)', fontWeight: 'bold' }}>
                        📊 {selectedPosition} Position Leaderboard
                    </h4>
                    
                    {rankingList.length === 0 ? (
                        <div style={{ padding: '24px 0', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            No players have logged innings at {selectedPosition} yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                            {rankingList.map((p, idx) => (
                                <div 
                                    key={p.id}
                                    style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        padding: '6px 8px', 
                                        background: idx === 0 ? 'var(--accent-bg)' : 'transparent',
                                        border: idx === 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ fontWeight: idx === 0 ? 'bold' : 'normal', color: 'var(--text)' }}>
                                        #{p.player_number} {p.player_name}
                                    </span>
                                    <span style={{ fontWeight: 'bold', color: idx === 0 ? 'var(--accent)' : 'var(--text-h)' }}>
                                        {(p[targetKey] ?? 0.0).toFixed(1)} IP
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-h)', fontWeight: 'bold' }}>
                            🏃‍♀️ Individual Rotation Share
                        </h4>
                        
                        <select 
                            value={selectedFielderId || ''} 
                            onChange={(e) => setSelectedFielderId(Number(e.target.value))}
                            style={{ 
                                background: 'var(--card-bg)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '4px', 
                                color: 'var(--text)', 
                                fontSize: '11px', 
                                padding: '2px 6px' 
                            }}
                        >
                            {players.map(p => (
                                <option key={p.id} value={p.id}>#{p.player_number} {p.player_name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                                <span style={{ fontSize: '9px', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>Primary Position</span>
                                <h5 style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-h)' }}>
                                    {primaryPos && primaryPos.innings > 0 ? `${primaryPos.pos} (${primaryPos.innings.toFixed(1)} IP)` : 'None'}
                                </h5>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Secondary Position</span>
                                <h5 style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-h)' }}>
                                    {secondaryPos && secondaryPos.innings > 0 ? `${secondaryPos.pos} (${secondaryPos.innings.toFixed(1)} IP)` : 'None'}
                                </h5>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {playerPositionData.slice(0, 4).map((pData, idx) => {
                                const maxInnings = Math.max(0.1, ...playerPositionData.map(p => p.innings));
                                const pct = (pData.innings / maxInnings) * 100;
                                
                                return (
                                    <div key={pData.pos} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '10px', width: '22px', fontWeight: 'bold', color: 'var(--text)' }}>{pData.pos}</span>
                                        <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div 
                                                style={{ 
                                                    width: `${pct}%`, 
                                                    height: '100%', 
                                                    background: idx === 0 ? 'var(--accent)' : 'var(--text-secondary)',
                                                    borderRadius: '4px' 
                                                }} 
                                            />
                                        </div>
                                        <span style={{ fontSize: '9px', width: '32px', textAlign: 'right', color: 'var(--text-h)' }}>{(pData.innings ?? 0.0).toFixed(1)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}