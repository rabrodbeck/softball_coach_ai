import React from 'react';
import type { Player } from '../TeamManager/types';

interface UnassignedPoolTableProps {
    inningsCount: number;
    bottomScrollRef: React.RefObject<HTMLDivElement | null>;
    handleBottomScroll: () => void;
    getUnassignedPlayers: (inningIdx: number) => Player[];
    handleDragStart: (e: React.DragEvent, playerId: number, inningIndex: number, sourceKey: string | null) => void;
    setDraggedPlayerId: (id: number | null) => void;
    handleRemoveAssignment: (inning: number, key: string) => void;
}

export function UnassignedPoolTable({
    inningsCount,
    bottomScrollRef,
    handleBottomScroll,
    getUnassignedPlayers,
    handleDragStart,
    setDraggedPlayerId,
    handleRemoveAssignment
}: UnassignedPoolTableProps) {
    return (
        <div 
            ref={bottomScrollRef}
            onScroll={handleBottomScroll}
            style={{ 
                flex: 1, 
                overflowX: 'auto', 
                overflowY: 'auto', 
                border: '1px solid var(--border)', 
                borderRadius: '0 0 10px 10px', 
                background: 'var(--bg)' 
            }}
        >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: `${150 + inningsCount * 180}px` }}>
                <tbody>
                    <tr style={{ background: 'var(--code-bg)' }}>
                        <td style={{ 
                            padding: '8px 12px', 
                            fontWeight: 'bold', 
                            color: 'var(--text-h)', 
                            borderRight: '1px solid var(--border)', 
                            position: 'sticky',
                            left: 0,
                            width: '150px',
                            minWidth: '150px',
                            background: 'var(--code-bg)',
                            zIndex: 20,
                            fontSize: '11px'
                        }}>
                            UNASSIGNED POOL
                        </td>
                        {Array.from({ length: inningsCount }).map((_, inningIdx) => {
                            const unassigned = getUnassignedPlayers(inningIdx);
                            return (
                                <td 
                                    key={inningIdx} 
                                    style={{ 
                                        padding: '4px 6px', 
                                        verticalAlign: 'top', 
                                        minWidth: '180px'
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        try {
                                            const raw = e.dataTransfer.getData("text/plain");
                                            const data = JSON.parse(raw);
                                            // If dragged from a grid cell in this inning, return it to the unassigned pool
                                            if (data.sourceInning === inningIdx && data.sourceKey) {
                                                handleRemoveAssignment(inningIdx, data.sourceKey);
                                            }
                                        } catch (err) {
                                            console.error(err);
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '30px', alignItems: 'stretch' }}>
                                        {unassigned.map(p => (
                                            <div 
                                                key={p.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, p.id, inningIdx, null)}
                                                onDragEnd={() => setDraggedPlayerId(null)}
                                                style={{
                                                    padding: '3px 6px',
                                                    background: 'var(--accent-bg)',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    color: 'var(--accent)',
                                                    fontWeight: 'bold',
                                                    textAlign: 'center',
                                                    cursor: 'grab',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                    transition: 'all 0.15s',
                                                    whiteSpace: 'nowrap',
                                                    width: '100%',
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                {p.player_name} #{p.player_number}
                                            </div>
                                        ))}
                                        {unassigned.length === 0 && (
                                            <div style={{ fontSize: '11px', color: 'var(--accent)', textAlign: 'center', padding: '4px 0' }}>All placed! 🎉</div>
                                        )}
                                    </div>
                                </td>
                            );
                        })}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
