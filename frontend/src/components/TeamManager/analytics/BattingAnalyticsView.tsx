import React from 'react';

export interface BattingStats {
    id: number;
    player_name: string;
    player_number: number;
    games_played: number;
    plate_appearances: number;
    at_bats: number;
    batting_average: number;
    on_base_percentage: number;
    slugging_percentage: number;
    ops: number;
    isolated_power: number;
    bb_k_ratio: number;
    stolen_bases: number;
    caught_stealing: number;
    stolen_base_percentage: number;
    walks: number;
    strikeouts: number;
    runs_scored: number;
    runs_batted_in: number;
}

export function BattingAnalyticsView({
    players,
    selectedBatterId,
    onSelectBatter
}: {
    players: any[];
    selectedBatterId: number | null;
    onSelectBatter: (id: number) => void;
}) {
    // Filter out players who have no plate appearances to focus purely on active batters
    const batters: BattingStats[] = players.filter(p => p.plate_appearances > 0);
    const [hoveredBatterId, setHoveredBatterId] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (batters.length > 0 && selectedBatterId === null) {
            onSelectBatter(batters[0].id);
        }
    }, [batters, selectedBatterId]);

    const activeBatter = batters.find(b => b.id === selectedBatterId) || batters[0];

    if (batters.length === 0) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                ⚾ No batting stats loaded yet. Import a GameChanger CSV or log batting stats to activate analytics.
            </div>
        );
    }

    const plotW = 450;
    const plotH = 320;
    const marginL = 50;
    const marginB = 40;
    const chartW = plotW - marginL - 20;
    const chartH = plotH - marginB - 20;

    const obpArray = batters.map(b => b.on_base_percentage ?? 0);
    const slgArray = batters.map(b => b.slugging_percentage ?? 0);

    const minX = Math.max(0.100, Math.min(0.250, ...obpArray) - 0.05);
    const maxX = Math.max(0.650, ...obpArray) + 0.05;
    const minY = Math.max(0.100, Math.min(0.250, ...slgArray) - 0.05);
    const maxY = Math.max(1.000, ...slgArray) + 0.1;

    const xTicks = Array.from({ length: 4 }).map((_, i) => {
        const step = (maxX - minX) / 3;
        return parseFloat((minX + step * i).toFixed(3));
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

    const sortedBattersForPlot = [...batters].sort((a, b) => {
        const aActive = a.id === activeBatter.id || a.id === hoveredBatterId;
        const bActive = b.id === activeBatter.id || b.id === hoveredBatterId;
        if (aActive && !bActive) return 1;
        if (!aActive && bActive) return -1;
        return 0;
    });

    const radarCenter = 130;
    const radarRadius = 80;

    const getRadarPoints = (batter: BattingStats) => {
        // Normalizations matching youth fastpitch benchmarks (0 to 100)
        const contact = Math.min(100, Math.max(0, (((batter.batting_average ?? 0) - 0.100) / 0.350) * 100));
        const onBase = Math.min(100, Math.max(0, (((batter.on_base_percentage ?? 0) - 0.150) / 0.450) * 100));
        const power = Math.min(100, Math.max(0, (((batter.slugging_percentage ?? 0) - 0.150) / 0.650) * 100));
        const discipline = Math.min(100, Math.max(0, ((batter.bb_k_ratio ?? 0) / 1.5) * 100));
        
        // Speed score considers both SB success rate and SB volume per game
        const sbPerGame = batter.games_played > 0 ? (batter.stolen_bases / batter.games_played) : 0;
        const speedVolume = Math.min(30, sbPerGame * 45); // Max 30 points for volume (approx 0.66 SB/game)
        const speedPct = (batter.stolen_base_percentage ?? 0) * 70; // Max 70 points for SB efficiency
        const speed = Math.min(100, speedVolume + speedPct);

        const scores = [contact, onBase, power, discipline, speed];
        
        return scores.map((score, i) => {
            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const r = (score / 100) * radarRadius;
            const x = radarCenter + r * Math.cos(angle);
            const y = radarCenter + r * Math.sin(angle);
            return `${x},${y}`;
        }).join(" ");
    };

    const axisLabels = [
        "Contact (AVG)",
        "On-Base (OBP)",
        "Power (SLG)",
        "Discipline (BB/K)",
        "Speed (SB%)"
    ];

    // Compute lineup advice
    const getLineupAdvice = (batter: BattingStats) => {
        const o = batter.on_base_percentage ?? 0;
        const s = batter.slugging_percentage ?? 0;
        const sb = batter.stolen_bases ?? 0;
        
        if (o >= 0.450 && s >= 0.550) {
            return {
                role: "Cleanup / Run Producer (#3, #4)",
                desc: "High on-base combined with outstanding power. Excellent at driving in runs and slugging extra bases."
            };
        } else if (o >= 0.420 && s < 0.550 && sb >= 2) {
            return {
                role: "Leadoff Sparkplug (#1, #2)",
                desc: "Excellent discipline, gets on base frequently, and poses a major threat to steal bags on the bases."
            };
        } else if (o >= 0.420 && s < 0.550) {
            return {
                role: "Table-Setter / Lineup Connector (#2, #9)",
                desc: "Strong contact skills and on-base capabilities. Helps advance runners and turns the lineup card over."
            };
        } else if (o < 0.420 && s >= 0.500) {
            return {
                role: "Power Threat (#5, #6)",
                desc: "Solid extra-base capacity. Brings run-producing potential to the middle of the order."
            };
        } else {
            return {
                role: "Contact Specialist / Developing (#7, #8)",
                desc: "Focuses on making contact and putting the ball in play. Best suited for the lower third of the order."
            };
        }
    };

    const advice = getLineupAdvice(activeBatter);

    return (
        <div className="analytics-grid" style={{ padding: '16px 8px', background: 'var(--card-bg)', borderRadius: '12px' }}>
            
            {/* 1. Left Section: Batter Comparison Scatter Plot */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text)', fontWeight: 'bold', alignSelf: 'flex-start' }}>
                    Offensive Power vs. On-Base Matrix
                </h4>
                
                <svg viewBox={`0 0 ${plotW} ${plotH}`} style={{ width: '100%', height: 'auto', maxWidth: plotW, overflow: 'visible' }}>
                    {/* Quadrant Background shading */}
                    <rect x={getPlotX(0.400)} y={getPlotY(maxY)} width={getPlotX(maxX) - getPlotX(0.400)} height={getPlotY(0.500) - getPlotY(maxY)} fill="rgba(16, 185, 129, 0.04)" />
                    <rect x={getPlotX(0.400)} y={getPlotY(0.500)} width={getPlotX(maxX) - getPlotX(0.400)} height={getPlotY(minY) - getPlotY(0.500)} fill="rgba(59, 130, 246, 0.03)" />
                    <rect x={getPlotX(minX)} y={getPlotY(maxY)} width={getPlotX(0.400) - getPlotX(minX)} height={getPlotY(0.500) - getPlotY(maxY)} fill="rgba(245, 158, 11, 0.03)" />
                    <rect x={getPlotX(minX)} y={getPlotY(0.500)} width={getPlotX(0.400) - getPlotX(minX)} height={getPlotY(minY) - getPlotY(0.500)} fill="rgba(239, 68, 68, 0.03)" />

                    {/* Grid Divider Lines */}
                    <line x1={getPlotX(minX)} y1={getPlotY(0.500)} x2={getPlotX(maxX)} y2={getPlotY(0.500)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
                    <line x1={getPlotX(0.400)} y1={20} x2={getPlotX(0.400)} y2={plotH - marginB} stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />

                    {/* Chart Axes */}
                    <line x1={marginL} y1={plotH - marginB} x2={plotW - 20} y2={plotH - marginB} stroke="var(--text)" strokeWidth="1" />
                    <line x1={marginL} y1={20} x2={marginL} y2={plotH - marginB} stroke="var(--text)" strokeWidth="1" />

                    {/* Axis Ticks and Labels */}
                    {xTicks.map(xVal => (
                        <g key={xVal} transform={`translate(${getPlotX(xVal)}, ${plotH - marginB + 16})`}>
                            <text textAnchor="middle" fill="var(--text)" fontSize="10px">{xVal.toFixed(3).replace(/^0/, '')}</text>
                        </g>
                    ))}
                    <text x={marginL + chartW / 2} y={plotH - 8} textAnchor="middle" fill="var(--text)" fontSize="11px" fontWeight="bold">
                        On-Base Percentage (OBP)
                    </text>

                    {yTicks.map(yVal => (
                        <g key={yVal} transform={`translate(${marginL - 8}, ${getPlotY(yVal) + 4})`}>
                            <text textAnchor="end" fill="var(--text)" fontSize="10px">{yVal.toFixed(3).replace(/^0/, '')}</text>
                        </g>
                    ))}
                    <text transform={`rotate(-90) translate(-${(plotH - marginB) / 2}, 14)`} textAnchor="middle" fill="var(--text)" fontSize="11px" fontWeight="bold">
                        Slugging Percentage (SLG)
                    </text>

                    {/* Quadrant Labels */}
                    <text x={getPlotX(minX + 0.02)} y={35} fill="rgba(245, 158, 11, 0.7)" fontSize="9px" fontWeight="bold">POWER SLUGGER</text>
                    <text x={getPlotX(maxX - 0.22)} y={35} fill="rgba(16, 185, 129, 0.7)" fontSize="9px" fontWeight="bold">CORE PRODUCER</text>
                    <text x={getPlotX(minX + 0.02)} y={plotH - marginB - 10} fill="rgba(239, 68, 68, 0.7)" fontSize="9px" fontWeight="bold">DEVELOPING</text>
                    <text x={getPlotX(maxX - 0.22)} y={plotH - marginB - 10} fill="rgba(59, 130, 246, 0.7)" fontSize="9px" fontWeight="bold">TABLE-SETTER</text>

                    {/* Draw Batter Nodes */}
                    {sortedBattersForPlot.map(b => {
                        const cx = getPlotX(b.on_base_percentage ?? 0);
                        const cy = getPlotY(b.slugging_percentage ?? 0);
                        const isSelected = b.id === activeBatter.id;
                        const isHovered = b.id === hoveredBatterId;

                        return (
                            <g 
                                key={b.id} 
                                style={{ cursor: 'pointer' }} 
                                onClick={() => onSelectBatter(b.id)}
                                onMouseEnter={() => setHoveredBatterId(b.id)}
                                onMouseLeave={() => setHoveredBatterId(null)}
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
                                    {getInitials(b.player_name)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Interactive Tooltip popup */}
                    {hoveredBatterId !== null && (
                        (() => {
                            const hb = batters.find(b => b.id === hoveredBatterId);
                            if (!hb) return null;
                            const tx = getPlotX(hb.on_base_percentage ?? 0);
                            const ty = getPlotY(hb.slugging_percentage ?? 0);
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
                                    <text x="8" y="16" fill="var(--text-h)" fontSize="10px" fontWeight="bold">{hb.player_name}</text>
                                    <text x="8" y="30" fill="var(--text)" fontSize="9px">OBP: {(hb.on_base_percentage ?? 0).toFixed(3)}</text>
                                    <text x="8" y="42" fill="var(--text)" fontSize="9px">SLG: {(hb.slugging_percentage ?? 0).toFixed(3)}</text>
                                </g>
                            );
                        })()
                    )}
                </svg>
                
                {/* Click / Select Roster list */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {batters.map(b => (
                        <button 
                            key={b.id} 
                            onClick={() => onSelectBatter(b.id)}
                            style={{ 
                                padding: '4px 8px', 
                                fontSize: '11px', 
                                border: b.id === activeBatter.id ? '1px solid var(--accent)' : '1px solid var(--border)', 
                                borderRadius: '4px', 
                                background: b.id === activeBatter.id ? 'var(--accent-bg)' : 'transparent',
                                color: b.id === activeBatter.id ? 'var(--accent)' : 'var(--text)',
                                cursor: 'pointer',
                                transition: 'all 0.1s ease-out'
                            }}
                        >
                            #{b.player_number} {b.player_name.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Right Section: Radar Chart & KPI Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-h)', fontWeight: 'bold' }}>
                        #{activeBatter.player_number} {activeBatter.player_name}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text)', marginBottom: '12px' }}>
                        PA: {activeBatter.plate_appearances} • AB: {activeBatter.at_bats} • OPS: {(activeBatter.ops ?? 0).toFixed(3)}
                    </span>

                    {/* Radar Chart Display */}
                    <svg viewBox="0 0 260 235" style={{ width: '100%', height: 'auto', maxWidth: '260px', overflow: 'visible' }}>
                        {/* Background pentagons */}
                        {[25, 50, 75, 100].map((level) => {
                            const points = Array.from({ length: 5 }).map((_, i) => {
                                const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
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
                            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
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
                            points={getRadarPoints(activeBatter)} 
                            fill="rgba(16, 185, 129, 0.2)" 
                            stroke="var(--accent)" 
                            strokeWidth="2.2" 
                            style={{ transition: 'all 0.3s ease-in-out' }}
                        />
                    </svg>
                </div>

                {/* Glassmorphic KPI Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* OPS Progress Bar */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}>On-Base Plus Slugging (OPS)</span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>{(activeBatter.ops ?? 0).toFixed(3)}</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                            <div 
                                style={{ 
                                    width: `${Math.min(100, ((activeBatter.ops ?? 0) / 1.200) * 100)}%`, 
                                    background: (activeBatter.ops ?? 0) >= 0.950 ? 'linear-gradient(90deg, #10b981, #059669)' : ((activeBatter.ops ?? 0) >= 0.800 ? '#3b82f6' : '#f59e0b'),
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease-out'
                                }} 
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <span>Developing</span>
                            <span>.700 Avg</span>
                            <span>.900 Great</span>
                            <span>1.100+ Elite</span>
                        </div>
                    </div>

                    {/* Plate Discipline Indicator */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}>Plate Eye (Walks vs. Strikeouts)</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-h)' }}>
                                {activeBatter.walks} BB / {activeBatter.strikeouts} SO ({(activeBatter.bb_k_ratio ?? 0).toFixed(2)} Ratio)
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                            <span>AVG: {(activeBatter.batting_average ?? 0).toFixed(3)}</span>
                            <span>•</span>
                            <span>OBP: {(activeBatter.on_base_percentage ?? 0).toFixed(3)}</span>
                            <span>•</span>
                            <span>ISO: {(activeBatter.isolated_power ?? 0).toFixed(3)}</span>
                        </div>
                    </div>

                    {/* AI Lineup Role Advisor Card */}
                    <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '12px', textAlign: 'left' }}>
                        <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Lineup Advisor</span>
                        <h5 style={{ margin: '2px 0 6px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-h)' }}>{advice.role}</h5>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text)', lineHeight: '1.4' }}>{advice.desc}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}