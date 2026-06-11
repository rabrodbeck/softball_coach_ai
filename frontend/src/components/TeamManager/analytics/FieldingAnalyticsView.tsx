import React from 'react';

export interface FieldingStats {
    id: number;
    player_name: string;
    player_number: number;
    games_played: number;
    total_chances: number;
    assists: number;
    putouts: number;
    errors: number;
    fielding_percentage: number;
}

export function FieldingAnalyticsView({
    players,
    selectedFielderId,
    onSelectFielder
}: {
    players: any[];
    selectedFielderId: number | null;
    onSelectFielder: (id: number) => void;
}) {
    // Filter out players who have no total chances and have not played in any games to focus purely on active fielders
    const fielders: FieldingStats[] = players.filter(p => p.total_chances > 0 || p.games_played > 0);
    const [hoveredFielderId, setHoveredFielderId] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (fielders.length > 0 && selectedFielderId === null) {
            onSelectFielder(fielders[0].id);
        }
    }, [fielders, selectedFielderId]);

    const activeFielder = fielders.find(f => f.id === selectedFielderId) || fielders[0];
    const activeFpct = activeFielder ? (activeFielder.total_chances > 0 ? (activeFielder.fielding_percentage ?? 0) : 1.0) : 1.0;

    if (fielders.length === 0) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                ⚾ No fielding stats loaded yet. Import a GameChanger CSV or log fielding stats to activate analytics.
            </div>
        );
    }

    const plotW = 450;
    const plotH = 320;
    const marginL = 50;
    const marginB = 40;
    const chartW = plotW - marginL - 20;
    const chartH = plotH - marginB - 20;

    const tcArray = fielders.map(f => f.total_chances ?? 0);
    const fpctArray = fielders.map(f => f.total_chances > 0 ? (f.fielding_percentage ?? 0) : 1.0);

    const minX = Math.max(0, Math.min(5, ...tcArray) - 1);
    const maxX = Math.max(30, ...tcArray) + 3;
    const minY = Math.max(0.600, Math.min(0.850, ...fpctArray) - 0.05);
    const maxY = 1.000;

    const xTicks = Array.from({ length: 4 }).map((_, i) => {
        const step = (maxX - minX) / 3;
        return Math.round(minX + step * i);
    });

    const yTicks = Array.from({ length: 4 }).map((_, i) => {
        const step = (maxY - minY) / 3;
        return parseFloat((minY + step * i).toFixed(3));
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

    const sortedFieldersForPlot = [...fielders].sort((a, b) => {
        const aActive = a.id === activeFielder.id || a.id === hoveredFielderId;
        const bActive = b.id === activeFielder.id || b.id === hoveredFielderId;
        if (aActive && !bActive) return 1;
        if (!aActive && bActive) return -1;
        return 0;
    });

    const radarCenter = 130;
    const radarRadius = 80;

    const getRadarPoints = (fielder: FieldingStats) => {
        // Normalizations matching youth fastpitch benchmarks (0 to 100)
        const fpct = fielder.total_chances > 0 ? (fielder.fielding_percentage ?? 0) : 1.0;
        const reliability = Math.min(100, Math.max(0, (((fpct) - 0.700) / 0.300) * 100));
        
        // Range based on assists relative to team or standard (max 15 assists is 100)
        const range = Math.min(100, (((fielder.assists ?? 0) / 15) * 100));
        
        // Execution based on putouts (max 30 putouts is 100)
        const execution = Math.min(100, (((fielder.putouts ?? 0) / 30) * 100));
        
        // Hands score penalizes errors heavily (e.g. 5 errors is 0)
        const hands = Math.max(0, 100 - (((fielder.errors ?? 0) * 20)));

        // For a 4-axis radar chart, we map coordinates for i = 0 to 3 (angles spaced by PI / 2)
        const scores = [reliability, range, execution, hands];
        
        return scores.map((score, i) => {
            const angle = (Math.PI * 2 / 4) * i - Math.PI / 2;
            const r = (score / 100) * radarRadius;
            const x = radarCenter + r * Math.cos(angle);
            const y = radarCenter + r * Math.sin(angle);
            return `${x},${y}`;
        }).join(" ");
    };

    const axisLabels = [
        "Reliability (FPCT)",
        "Range (Assists)",
        "Execution (Putouts)",
        "Hands (No Errors)"
    ];

    // Compute lineup advice
    const getDefensiveAdvice = (fielder: FieldingStats) => {
        const fpct = fielder.total_chances > 0 ? (fielder.fielding_percentage ?? 0) : 1.0;
        const a = fielder.assists ?? 0;
        const po = fielder.putouts ?? 0;
        const tc = fielder.total_chances ?? 0;
        
        if (fpct >= 0.940 && a >= 5 && tc >= 15) {
            return {
                role: "Infield Anchor (SS, 2B, 3B)",
                desc: "Demonstrates reliable hands and high lateral range (assists). Essential for high-traffic infield positions."
            };
        } else if (fpct >= 0.950 && po >= 10 && a < 5) {
            return {
                role: "Clean Target (1st Base)",
                desc: "High volume of clean plays and putouts. Great target for taking throws across the infield."
            };
        } else if (fpct >= 0.920 && tc < 10) {
            return {
                role: "Outfield Specialist (CF, LF, RF)",
                desc: "Clean catching record under low-to-moderate grounder traffic. Best suited for catching fly balls."
            };
        } else if (fpct < 0.900 && a >= 4) {
            return {
                role: "High-Range / Needs Glove Work",
                desc: "Active range and involvement, but high error count. Needs focus on ball security and transfer drills."
            };
        } else {
            return {
                role: "Developing Corner Fielder / RF",
                desc: "Developing defensive reflexes. Best placed in low-traffic areas while building throwing and glove consistency."
            };
        }
    };

    const advice = getDefensiveAdvice(activeFielder);

    // Midpoints for quadrant shading
    const midX = Math.round((maxX + minX) / 2);
    const midY = 0.920; // benchmark fielding percentage for dividing clean vs developing

    return (
        <div className="analytics-grid" style={{ padding: '16px 8px', background: 'var(--card-bg)', borderRadius: '12px' }}>
            
            {/* 1. Left Section: Fielder Comparison Scatter Plot */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text)', fontWeight: 'bold', alignSelf: 'flex-start' }}>
                    Defensive Activity vs. Reliability Matrix
                </h4>
                
                <svg viewBox={`0 0 ${plotW} ${plotH}`} style={{ width: '100%', height: 'auto', maxWidth: plotW, overflow: 'visible' }}>
                    {/* Quadrant Background shading */}
                    <rect x={getPlotX(midX)} y={getPlotY(maxY)} width={getPlotX(maxX) - getPlotX(midX)} height={getPlotY(midY) - getPlotY(maxY)} fill="rgba(16, 185, 129, 0.04)" />
                    <rect x={getPlotX(midX)} y={getPlotY(midY)} width={getPlotX(maxX) - getPlotX(midX)} height={getPlotY(minY) - getPlotY(midY)} fill="rgba(245, 158, 11, 0.03)" />
                    <rect x={getPlotX(minX)} y={getPlotY(maxY)} width={getPlotX(midX) - getPlotX(minX)} height={getPlotY(midY) - getPlotY(maxY)} fill="rgba(59, 130, 246, 0.03)" />
                    <rect x={getPlotX(minX)} y={getPlotY(midY)} width={getPlotX(midX) - getPlotX(minX)} height={getPlotY(minY) - getPlotY(midY)} fill="rgba(239, 68, 68, 0.03)" />

                    {/* Grid Divider Lines */}
                    <line x1={getPlotX(minX)} y1={getPlotY(midY)} x2={getPlotX(maxX)} y2={getPlotY(midY)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
                    <line x1={getPlotX(midX)} y1={20} x2={getPlotX(midX)} y2={plotH - marginB} stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />

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
                        Total Defensive Chances (TC)
                    </text>

                    {yTicks.map(yVal => (
                        <g key={yVal} transform={`translate(${marginL - 8}, ${getPlotY(yVal) + 4})`}>
                            <text textAnchor="end" fill="var(--text)" fontSize="10px">{yVal.toFixed(3).replace(/^0/, '')}</text>
                        </g>
                    ))}
                    <text transform={`rotate(-90) translate(-${(plotH - marginB) / 2}, 14)`} textAnchor="middle" fill="var(--text)" fontSize="11px" fontWeight="bold">
                        Fielding Percentage (FPCT)
                    </text>

                    {/* Quadrant Labels */}
                    <text x={getPlotX(minX + 1)} y={35} fill="rgba(59, 130, 246, 0.7)" fontSize="9px" fontWeight="bold">RELIABLE / LOW TRAFFIC</text>
                    <text x={getPlotX(maxX - 8.5)} y={35} fill="rgba(16, 185, 129, 0.7)" fontSize="9px" fontWeight="bold">ELITE ANCHOR</text>
                    <text x={getPlotX(minX + 1)} y={plotH - marginB - 10} fill="rgba(239, 68, 68, 0.7)" fontSize="9px" fontWeight="bold">DEVELOPING</text>
                    <text x={getPlotX(maxX - 8.5)} y={plotH - marginB - 10} fill="rgba(245, 158, 11, 0.7)" fontSize="9px" fontWeight="bold">ACTIVE RANGE / DEV GLOVE</text>

                    {/* Draw Fielder Nodes */}
                    {sortedFieldersForPlot.map(f => {
                        const cx = getPlotX(f.total_chances ?? 0);
                        const cy = getPlotY(f.total_chances > 0 ? (f.fielding_percentage ?? 0) : 1.0);
                        const isSelected = f.id === activeFielder.id;
                        const isHovered = f.id === hoveredFielderId;

                        return (
                            <g 
                                key={f.id} 
                                style={{ cursor: 'pointer' }} 
                                onClick={() => onSelectFielder(f.id)}
                                onMouseEnter={() => setHoveredFielderId(f.id)}
                                onMouseLeave={() => setHoveredFielderId(null)}
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
                                    {getInitials(f.player_name)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Interactive Tooltip popup */}
                    {hoveredFielderId !== null && (
                        (() => {
                            const hf = fielders.find(f => f.id === hoveredFielderId);
                            if (!hf) return null;
                            const tx = getPlotX(hf.total_chances ?? 0);
                            const ty = getPlotY(hf.total_chances > 0 ? (hf.fielding_percentage ?? 0) : 1.0);
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
                                        filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.3))" 
                                    />
                                    <text x="8" y="16" fill="var(--text-h)" fontSize="10px" fontWeight="bold">{hf.player_name}</text>
                                    <text x="8" y="30" fill="var(--text)" fontSize="9px">Chances (TC): {hf.total_chances}</text>
                                    <text x="8" y="42" fill="var(--text)" fontSize="9px">Fielding %: {hf.total_chances > 0 ? (hf.fielding_percentage ?? 0).toFixed(3) : 'N/A'}</text>
                                </g>
                            );
                        })()
                    )}
                </svg>
                
                {/* Click / Select Roster list */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {fielders.map(f => (
                        <button 
                            key={f.id} 
                            onClick={() => onSelectFielder(f.id)}
                            style={{ 
                                padding: '4px 8px', 
                                fontSize: '11px', 
                                border: f.id === activeFielder.id ? '1px solid var(--accent)' : '1px solid var(--border)', 
                                borderRadius: '4px', 
                                background: f.id === activeFielder.id ? 'var(--accent-bg)' : 'transparent',
                                color: f.id === activeFielder.id ? 'var(--accent)' : 'var(--text)',
                                cursor: 'pointer',
                                transition: 'all 0.1s ease-out'
                            }}
                        >
                            #{f.player_number} {f.player_name.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Right Section: Radar Chart & KPI Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-h)', fontWeight: 'bold' }}>
                        #{activeFielder.player_number} {activeFielder.player_name}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text)', marginBottom: '12px' }}>
                        TC: {activeFielder.total_chances ?? 0} • PO: {activeFielder.putouts ?? 0} • A: {activeFielder.assists ?? 0} • E: {activeFielder.errors ?? 0}
                    </span>

                    {activeFielder.total_chances > 0 ? (
                        /* Radar Chart Display */
                        <svg viewBox="0 0 260 235" style={{ width: '100%', height: 'auto', maxWidth: '260px', overflow: 'visible' }}>
                            {/* Background diamonds (4-axis background grids) */}
                            {[25, 50, 75, 100].map((level) => {
                                const points = Array.from({ length: 4 }).map((_, i) => {
                                    const angle = (Math.PI * 2 / 4) * i - Math.PI / 2;
                                    const r = (level / 100) * radarRadius;
                                    const x = radarCenter + r * Math.cos(angle);
                                    const y = radarCenter + r * Math.sin(angle);
                                    return `${x},${y}`;
                                }).join(" ");
                                return (
                                    <polygon 
                                        key={level} 
                                        points={points} 
                                        fill="none" 
                                        stroke="var(--border)" 
                                        strokeWidth="0.8" 
                                        strokeDasharray={level === 100 ? "0" : "3,3"} 
                                    />
                                );
                            })}

                            {/* Axis lines and labels */}
                            {axisLabels.map((label, i) => {
                                const angle = (Math.PI * 2 / 4) * i - Math.PI / 2;
                                const xOuter = radarCenter + radarRadius * Math.cos(angle);
                                const yOuter = radarCenter + radarRadius * Math.sin(angle);
                                
                                // Align text anchor dynamically based on position
                                let anchor: "start" | "end" | "middle" = "middle";
                                if (Math.cos(angle) > 0.1) anchor = "start";
                                else if (Math.cos(angle) < -0.1) anchor = "end";

                                return (
                                    <g key={label}>
                                        <line x1={radarCenter} y1={radarCenter} x2={xOuter} y2={yOuter} stroke="var(--border)" strokeWidth="0.8" />
                                        <text 
                                            x={radarCenter + (radarRadius + 14) * Math.cos(angle)} 
                                            y={radarCenter + (radarRadius + 14) * Math.sin(angle) + 4} 
                                            textAnchor={anchor} 
                                            fill="var(--text)" 
                                            fontSize="9px" 
                                            fontWeight="semibold"
                                        >
                                            {label}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Player data shape */}
                            <polygon 
                                points={getRadarPoints(activeFielder)} 
                                fill="rgba(16, 185, 129, 0.2)" 
                                stroke="var(--accent)" 
                                strokeWidth="2.2" 
                                style={{ transition: 'all 0.3s ease-in-out' }}
                            />
                        </svg>
                    ) : (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: '40px 16px', 
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                            gap: '12px',
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px dashed var(--border)',
                            borderRadius: '8px',
                            width: '100%',
                            marginTop: '12px',
                            minHeight: '220px'
                        }}>
                            <span style={{ fontSize: '32px' }}>🥎</span>
                            <h5 style={{ margin: 0, fontSize: '14px', color: 'var(--text-h)', fontWeight: 'bold' }}>No Fielding Chances</h5>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text)', lineHeight: '1.4', maxWidth: '220px' }}>
                                {activeFielder.player_name} has played in games but has not logged any defensive chances yet (TC: 0).
                            </p>
                        </div>
                    )}
                </div>

                {activeFielder.total_chances > 0 && (
                    /* Glassmorphic KPI Details */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Fielding Percentage Progress Bar */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}>Fielding Percentage (FPCT)</span>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>{activeFpct.toFixed(3)}</span>
                            </div>
                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                <div 
                                    style={{ 
                                        width: `${Math.min(100, (((activeFpct) - 0.500) / 0.500) * 100)}%`, 
                                        background: (activeFpct) >= 0.950 ? 'linear-gradient(90deg, #10b981, #059669)' : ((activeFpct) >= 0.880 ? '#3b82f6' : '#f59e0b'),
                                        borderRadius: '3px',
                                        transition: 'width 0.3s ease-out'
                                    }} 
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                <span>Developing (&lt; .850)</span>
                                <span>.920 Solid</span>
                                <span>.960 Great</span>
                                <span>.980+ Elite</span>
                            </div>
                        </div>

                        {/* Ball Security Detail */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}>Play Success Ratio</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-h)' }}>
                                    {(activeFielder.putouts ?? 0) + (activeFielder.assists ?? 0)} Made / {activeFielder.errors ?? 0} Errors
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                <span>Putouts: {activeFielder.putouts ?? 0}</span>
                                <span>•</span>
                                <span>Assists: {activeFielder.assists ?? 0}</span>
                                <span>•</span>
                                <span>Total Chances: {activeFielder.total_chances ?? 0}</span>
                            </div>
                        </div>

                        {/* AI Defensive Position Advisor Card */}
                        <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '12px', textAlign: 'left' }}>
                            <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Defensive Advisor</span>
                            <h5 style={{ margin: '2px 0 6px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-h)' }}>{advice.role}</h5>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text)', lineHeight: '1.4' }}>{advice.desc}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}