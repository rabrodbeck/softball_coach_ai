import React from 'react';

// Pitching statistics interface for clean type safety
export interface PitchingStats {
    id: number;
    player_name: string;
    player_number: number;
    games_pitched: number;
    games_started: number;
    innings_pitched: number;
    number_of_pitches: number;
    hits_allowed: number;
    runs_allowed: number;
    earned_runs: number;
    walks_allowed: number;
    strikeouts_thrown: number;
    era: number;
    whip: number;
    k7: number;
    bb7: number;
    pitches_per_inning: number;
    k_bb_ratio: number;
}

interface PitchingAnalyticsViewProps {
    players: any[]; 
    selectedPitcherId: number | null; 
    onSelectPitcher: (id: number) => void;
    inningsPerGame?: number;
}

export function PitchingAnalyticsView({ 
    players, 
    selectedPitcherId, 
    onSelectPitcher,
    inningsPerGame = 7
}: PitchingAnalyticsViewProps) {
    const pitchers: PitchingStats[] = players.filter(p => p.games_pitched > 0 && p.number_of_pitches > 0);
    const [hoveredPitcherId, setHoveredPitcherId] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (pitchers.length > 0 && selectedPitcherId === null) {
            onSelectPitcher(pitchers[0].id);
        }
    }, [pitchers, selectedPitcherId, onSelectPitcher]);

    const activePitcher = pitchers.find(p => p.id === selectedPitcherId) || pitchers[0];

    if (pitchers.length === 0) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                ⚾ No pitching stats loaded yet. Import a GameChanger CSV or log pitching stats to activate analytics.
            </div>
        );
    }

    const plotW = 450;
    const plotH = 320;
    const marginL = 50;
    const marginB = 40;
    const chartW = plotW - marginL - 20;
    const chartH = plotH - marginB - 20;

    const pitchesArray = pitchers.map(p => p.pitches_per_inning);
    const whipArray = pitchers.map(p => p.whip);

    const minX = Math.max(5, Math.min(10, ...pitchesArray) - 1);
    const maxX = Math.max(25, ...pitchesArray) + 2;
    const minY = Math.max(0, Math.min(0.5, ...whipArray) - 0.2);
    const maxY = Math.max(3.0, ...whipArray) + 0.3;

    const xTicks = Array.from({ length: 4 }).map((_, i) => {
        const step = (maxX - minX) / 3;
        return Math.round(minX + step * i);
    });

    const yTicks = Array.from({ length: 4 }).map((_, i) => {
        const step = (maxY - minY) / 3;
        return parseFloat((minY + step * i).toFixed(1));
    });

    const getPlotX = (val: number) => {
        const clamped = Math.max(minX, Math.min(maxX, val));
        return marginL + ((clamped - minX) / (maxX - minX)) * chartW;
    };

    const getPlotY = (val: number) => {
        const clamped = Math.max(minY, Math.min(maxY, val));
        return (plotH - marginB) - ((clamped - minY) / (maxY - minY)) * chartH;
    };

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const sortedPitchersForPlot = [...pitchers].sort((a, b) => {
        const aActive = a.id === activePitcher.id || a.id === hoveredPitcherId;
        const bActive = b.id === activePitcher.id || b.id === hoveredPitcherId;
        if (aActive && !bActive) return 1;
        if (!aActive && bActive) return -1;
        return 0;
    });

    const radarCenter = 130;
    const radarRadius = 80;

    const getRadarPoints = (pitcher: PitchingStats) => {
        const runPrevention = Math.max(0, 100 - (pitcher.era * 10));
        const runnerControl = Math.max(0, 100 - ((pitcher.whip - 0.5) * 40));
        const missedBats = Math.min(100, pitcher.k7 * (50 / inningsPerGame));
        const command = Math.max(0, 100 - (pitcher.bb7 * (116.67 / inningsPerGame)));
        const efficiency = Math.max(0, 100 - ((pitcher.pitches_per_inning - 10) * 8.33));

        const scores = [runPrevention, runnerControl, missedBats, command, efficiency];
        
        return scores.map((score, i) => {
            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const r = (score / 100) * radarRadius;
            const x = radarCenter + r * Math.cos(angle);
            const y = radarCenter + r * Math.sin(angle);
            return `${x},${y}`;
        }).join(" ");
    };

    const axisLabels = [
        "Run Prev (ERA)",
        "Runner Ctrl (WHIP)",
        `Missed Bats (K/${inningsPerGame})`,
        `Command (BB/${inningsPerGame})`,
        "Efficiency"
    ];

    return (
        <div className="analytics-grid" style={{ padding: '16px 8px', background: 'var(--card-bg)', borderRadius: '12px' }}>
            
            {/* 1. Left Section: Pitcher Comparison Scatter Plot */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text)', fontWeight: 'bold', alignSelf: 'flex-start' }}>
                    Staff Efficiency vs. Effectiveness Matrix
                </h4>
                
                <svg viewBox={`0 0 ${plotW} ${plotH}`} style={{ width: '100%', height: 'auto', maxWidth: plotW, overflow: 'visible' }}>
                    {/* Quadrant Background shading */}
                    <rect x={getPlotX(15)} y={20} width={getPlotX(maxX) - getPlotX(15)} height={getPlotY(minY) - getPlotY(1.2)} fill="rgba(239, 68, 68, 0.03)" />
                    <rect x={getPlotX(minX)} y={getPlotY(1.2)} width={getPlotX(15) - getPlotX(minX)} height={getPlotY(1.2) - getPlotY(maxY)} fill="rgba(16, 185, 129, 0.04)" />

                    {/* Grid Lines */}
                    <line x1={getPlotX(minX)} y1={getPlotY(1.2)} x2={getPlotX(maxX)} y2={getPlotY(1.2)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
                    <line x1={getPlotX(15)} y1={20} x2={getPlotX(15)} y2={plotH - marginB} stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />

                    {/* Chart Axes */}
                    <line x1={marginL} y1={plotH - marginB} x2={plotW - 20} y2={plotH - marginB} stroke="var(--text)" strokeWidth="1" />
                    <line x1={marginL} y1={20} x2={marginL} y2={plotH - marginB} stroke="var(--text)" strokeWidth="1" />

                    {/* Axis Ticks and Labels */}
                    {xTicks.map(xVal => (
                        <g key={xVal} transform={`translate(${getPlotX(xVal)}, ${plotH - marginB + 16})`}>
                            <text textAnchor="middle" fill="var(--text)" fontSize="10px">{xVal}</text>
                        </g>
                    ))}
                    <text x={marginL + chartW / 2} y={plotH - 8} textAnchor="middle" fill="var(--text)" fontSize="11px" fontWeight="bold">
                        Pitches per Inning (Efficiency)
                    </text>

                    {yTicks.map(yVal => (
                        <g key={yVal} transform={`translate(${marginL - 8}, ${getPlotY(yVal) + 4})`}>
                            <text textAnchor="end" fill="var(--text)" fontSize="10px">{yVal}</text>
                        </g>
                    ))}
                    <text transform={`rotate(-90) translate(-${(plotH - marginB) / 2}, 14)`} textAnchor="middle" fill="var(--text)" fontSize="11px" fontWeight="bold">
                        WHIP (Runners per Inning)
                    </text>

                    {/* Quadrant Labels */}
                    <text x={getPlotX(minX + 1.5)} y={35} fill="rgba(16, 185, 129, 0.6)" fontSize="9px" fontWeight="bold">ELITE COMMAND</text>
                    <text x={getPlotX(maxX - 6.5)} y={35} fill="rgba(239, 68, 68, 0.6)" fontSize="9px" fontWeight="bold">HIGH TRAFFIC</text>
                    <text x={getPlotX(minX + 1.5)} y={plotH - marginB - 10} fill="rgba(59, 130, 246, 0.6)" fontSize="9px" fontWeight="bold">PITCH-TO-CONTACT</text>

                    {/* Draw Pitcher Nodes */}
                    {sortedPitchersForPlot.map(p => {
                        const cx = getPlotX(p.pitches_per_inning);
                        const cy = getPlotY(p.whip);
                        const isSelected = p.id === activePitcher.id;
                        const isHovered = p.id === hoveredPitcherId;

                        return (
                            <g 
                                key={p.id} 
                                style={{ cursor: 'pointer' }} 
                                onClick={() => onSelectPitcher(p.id)}
                                onMouseEnter={() => setHoveredPitcherId(p.id)}
                                onMouseLeave={() => setHoveredPitcherId(null)}
                            >
                                {(isSelected || isHovered) && (
                                    <circle cx={cx} cy={cy} r={isSelected ? "15" : "12"} fill="rgba(16, 185, 129, 0.25)" />
                                )}
                                
                                <circle 
                                    cx={cx} 
                                    cy={cy} 
                                    r={isSelected ? "10" : "8"} 
                                    fill={isSelected ? "var(--accent)" : "rgba(255, 255, 255, 0.15)"} 
                                    stroke={isSelected ? "var(--card-bg)" : "var(--border)"} 
                                    strokeWidth={isSelected ? "2.5" : "1.5"}
                                    style={{ transition: 'all 0.15s ease-out' }}
                                />
                                <text 
                                    x={cx} 
                                    y={cy + 3} 
                                    textAnchor="middle" 
                                    fill={isSelected ? "var(--card-bg)" : "var(--text)"} 
                                    fontSize="8px" 
                                    fontWeight="bold"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {getInitials(p.player_name)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Interactive Tooltip popup */}
                    {hoveredPitcherId !== null && (
                        (() => {
                            const hp = pitchers.find(p => p.id === hoveredPitcherId);
                            if (!hp) return null;
                            const tx = getPlotX(hp.pitches_per_inning);
                            const ty = getPlotY(hp.whip);
                            const tooltipW = 120;
                            const tooltipH = 50;
                            
                            const tooltipX = tx + 12 + tooltipW > plotW ? tx - 12 - tooltipW : tx + 12;
                            const tooltipY = Math.max(10, Math.min(plotH - marginB - tooltipH, ty - 25));

                            return (
                                <g transform={`translate(${tooltipX}, ${tooltipY})`} style={{ pointerEvents: 'none' }}>
                                    <rect 
                                        width={tooltipW} 
                                        height={tooltipH} 
                                        rx="6" 
                                        fill="var(--card-bg)" 
                                        stroke="var(--accent)" 
                                        strokeWidth="1.5"
                                        style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.4))' }}
                                    />
                                    <text x="8" y="16" fill="var(--text)" fontSize="10px" fontWeight="bold">
                                        {hp.player_name}
                                    </text>
                                    <text x="8" y="29" fill="var(--text)" fontSize="8px">
                                        Pitches/IP: {hp.pitches_per_inning.toFixed(1)}
                                    </text>
                                    <text x="8" y="41" fill="var(--text)" fontSize="8px">
                                        WHIP: {hp.whip.toFixed(2)}
                                    </text>
                                </g>
                            );
                        })()
                    )}
                </svg>

                {/* Staff List Legend / Alternative Selection Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
                    {pitchers.map(p => {
                        const isSelected = p.id === activePitcher.id;
                        const isHovered = p.id === hoveredPitcherId;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => onSelectPitcher(p.id)}
                                onMouseEnter={() => setHoveredPitcherId(p.id)}
                                onMouseLeave={() => setHoveredPitcherId(null)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)'),
                                    background: isSelected ? 'var(--accent-bg)' : (isHovered ? 'rgba(255,255,255,0.05)' : 'transparent'),
                                    color: isSelected ? 'var(--accent)' : 'var(--text)',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    transition: 'all 0.1s ease'
                                }}
                            >
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: isSelected ? 'var(--accent)' : 'var(--border)',
                                    color: isSelected ? 'var(--card-bg)' : 'var(--text)',
                                    fontSize: '8px',
                                    fontWeight: 'bold'
                                }}>
                                    {getInitials(p.player_name)}
                                </span>
                                {p.player_name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Right Section: Selected Pitcher Detail Profile */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--accent)', fontWeight: 'bold' }}>
                        {activePitcher.player_name}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text)' }}>
                        Jersey #{activePitcher.player_number} | {activePitcher.games_pitched} Appearances ({activePitcher.games_started} Starts)
                    </span>
                </div>

                <div className="inner-analytics-grid">
                    {/* Radar Chart Display */}
                    <svg viewBox="0 0 260 260" style={{ width: '100%', height: 'auto', maxWidth: '260px', overflow: 'visible' }}>
                        {[20, 40, 60, 80, 100].map(level => {
                            const gridPoints = Array.from({ length: 5 }).map((_, i) => {
                                const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                                const r = (level / 100) * radarRadius;
                                const x = radarCenter + r * Math.cos(angle);
                                const y = radarCenter + r * Math.sin(angle);
                                return `${x},${y}`;
                            }).join(" ");
                            return (
                                <polygon 
                                    key={level} 
                                    points={gridPoints} 
                                    fill="none" 
                                    stroke="var(--border)" 
                                    strokeWidth="0.8" 
                                    strokeDasharray={level === 100 ? "none" : "3"} 
                                />
                            );
                        })}

                        {/* Axis Spikes */}
                        {Array.from({ length: 5 }).map((_, i) => {
                            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                            const xOuter = radarCenter + radarRadius * Math.cos(angle);
                            const yOuter = radarCenter + radarRadius * Math.sin(angle);
                            return (
                                <g key={i}>
                                    <line x1={radarCenter} y1={radarCenter} x2={xOuter} y2={yOuter} stroke="var(--border)" strokeWidth="0.8" />
                                    <text 
                                        x={radarCenter + (radarRadius + 14) * Math.cos(angle)} 
                                        y={radarCenter + (radarRadius + 14) * Math.sin(angle) + 4} 
                                        textAnchor="middle" 
                                        fill="var(--text)" 
                                        fontSize="9px"
                                        fontWeight="semibold"
                                    >
                                        {axisLabels[i]}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Player Stats Shape */}
                        <polygon 
                            points={getRadarPoints(activePitcher)} 
                            fill="rgba(16, 185, 129, 0.25)" 
                            stroke="var(--accent)" 
                            strokeWidth="2.5" 
                            style={{ transition: 'all 0.3s ease-in-out' }}
                        />
                    </svg>

                    {/* Numeric KPI readout list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ background: 'var(--code-bg)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.7 }}>ERA</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
                                {activePitcher.era.toFixed(2)}
                            </div>
                        </div>

                        <div style={{ background: 'var(--code-bg)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.7 }}>WHIP</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
                                {activePitcher.whip.toFixed(2)}
                            </div>
                        </div>

                        <div style={{ background: 'var(--code-bg)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.7 }}>Pitches/Inning</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
                                {activePitcher.pitches_per_inning.toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI details grid footer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', opacity: 0.7 }}>K/{inningsPerGame}</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{activePitcher.k7.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', opacity: 0.7 }}>BB/{inningsPerGame}</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{activePitcher.bb7.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', opacity: 0.7 }}>K/BB Ratio</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{activePitcher.k_bb_ratio.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            
        </div>
    );
}