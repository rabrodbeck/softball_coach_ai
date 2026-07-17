import React, { useState, useEffect } from 'react';
import type { Player, Team } from '../types';
import { useTeamStore } from '../../../store/useTeamStore';
import { ArrowLeft } from 'lucide-react';

interface PlayerFormProps {
    editingPlayer: Player | null;
    showAddPlayerForm: boolean;
    cancelForms: () => void;
    teams: Team[];
    selectedTeamId: number | null;
    coachId: number;
    
    // Core Form Actions
    onCreatePlayer: (e: React.FormEvent) => void;
    onUpdatePlayer: (e: React.FormEvent) => void;

    // General Fields
    playerName: string;
    setPlayerName: (val: string) => void;
    playerNumber: number;
    setPlayerNumber: (val: number) => void;
    battingHand: string;
    setBattingHand: (val: string) => void;
    throwingHand: string;
    setThrowingHand: (val: string) => void;

    // Batting Stats Fields
    gp: number;
    setGp: (val: number) => void;
    pa: number;
    setPa: (val: number) => void;
    ab: number;
    setAb: (val: number) => void;
    singles: number;
    setSingles: (val: number) => void;
    doubles: number;
    setDoubles: (val: number) => void;
    triples: number;
    setTriples: (val: number) => void;
    hr: number;
    setHr: (val: number) => void;
    bb: number;
    setBb: (val: number) => void;
    k: number;
    setK: (val: number) => void;
    hbp: number;
    setHbp: (val: number) => void;
    sb: number;
    setSb: (val: number) => void;
    cs: number;
    setCs: (val: number) => void;
    runsScored: number;
    setRunsScored: (val: number) => void;
    rbi: number;
    setRbi: (val: number) => void;
    reachedOnError: number;
    setReachedOnError: (val: number) => void;

    // Pitching Stats Fields
    gamesPitched: number;
    setGamesPitched: (val: number) => void;
    gamesStarted: number;
    setGamesStarted: (val: number) => void;
    inningsPitched: number;
    setInningsPitched: (val: number) => void;
    battersFaced: number;
    setBattersFaced: (val: number) => void;
    numberOfPitches: number;
    setNumberOfPitches: (val: number) => void;
    hitsAllowed: number;
    setHitsAllowed: (val: number) => void;
    runsAllowed: number;
    setRunsAllowed: (val: number) => void;
    earnedRuns: number;
    setEarnedRuns: (val: number) => void;
    walksAllowed: number;
    setWalksAllowed: (val: number) => void;
    strikeoutsThrown: number;
    setStrikeoutsThrown: (val: number) => void;
    hitByPitchesAllowed: number;
    setHitByPitchesAllowed: (val: number) => void;
    leftOnBase: number;
    setLeftOnBase: (val: number) => void;

    // Fielding Stats Fields
    totalChances: number;
    setTotalChances: (val: number) => void;
    assists: number;
    setAssists: (val: number) => void;
    putouts: number;
    setPutouts: (val: number) => void;
    errorsVal: number;
    setErrorsVal: (val: number) => void;

    // Catching Stats Fields
    inningsCaught: number;
    setInningsCaught: (val: number) => void;
    passedBallsAllowed: number;
    setPassedBallsAllowed: (val: number) => void;
    runnersStolenBases: number;
    setRunnersStolenBases: (val: number) => void;
    runnersCaughtStealing: number;
    setRunnersCaughtStealing: (val: number) => void;
    eligiblePositions: string;
    setEligiblePositions: (val: string) => void;
}

export function PlayerForm({
    editingPlayer,
    showAddPlayerForm,
    cancelForms,
    teams,
    selectedTeamId,
    coachId,
    onCreatePlayer,
    onUpdatePlayer,
    playerName,
    setPlayerName,
    playerNumber,
    setPlayerNumber,
    battingHand,
    setBattingHand,
    throwingHand,
    setThrowingHand,
    gp,
    setGp,
    pa,
    setPa,
    ab,
    setAb,
    singles,
    setSingles,
    doubles,
    setDoubles,
    triples,
    setTriples,
    hr,
    setHr,
    bb,
    setBb,
    k,
    setK,
    hbp,
    setHbp,
    sb,
    setSb,
    cs,
    setCs,
    runsScored,
    setRunsScored,
    rbi,
    setRbi,
    reachedOnError,
    setReachedOnError,
    gamesPitched,
    setGamesPitched,
    gamesStarted,
    setGamesStarted,
    inningsPitched,
    setInningsPitched,
    battersFaced,
    setBattersFaced,
    numberOfPitches,
    setNumberOfPitches,
    hitsAllowed,
    setHitsAllowed,
    runsAllowed,
    setRunsAllowed,
    earnedRuns,
    setEarnedRuns,
    walksAllowed,
    setWalksAllowed,
    strikeoutsThrown,
    setStrikeoutsThrown,
    hitByPitchesAllowed,
    setHitByPitchesAllowed,
    leftOnBase,
    setLeftOnBase,
    totalChances,
    setTotalChances,
    assists,
    setAssists,
    putouts,
    setPutouts,
    errorsVal,
    setErrorsVal,
    inningsCaught,
    setInningsCaught,
    passedBallsAllowed,
    setPassedBallsAllowed,
    runnersStolenBases,
    setRunnersStolenBases,
    runnersCaughtStealing,
    setRunnersCaughtStealing,
    eligiblePositions,
    setEligiblePositions
}: PlayerFormProps) {

    const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

    const { searchPlayers, addReturningPlayer, isLoading: storeLoading } = useTeamStore();

    // Trigger global search when query changes
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                const results = await searchPlayers(searchQuery);
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    // Handle adding selected returning player
    const handleAddReturningSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlayer || !selectedTeamId) return;
        
        await addReturningPlayer(coachId, selectedTeamId, selectedPlayer.id, playerNumber);
        cancelForms();
    };

    // 1. Add Player Form
    if (showAddPlayerForm) {
        return (
            <div className="add-team-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header with Back Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        type="button" 
                        onClick={cancelForms} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--text-secondary)', 
                            cursor: 'pointer', 
                            padding: '4px 0', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-h)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        title="Back to Roster"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h3 style={{ margin: 0 }}>Add Player to {teams.find(t => t.id === selectedTeamId)?.team_name || 'Roster'}</h3>
                </div>
                
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                    <button 
                        type="button" 
                        onClick={() => setActiveTab('new')} 
                        style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'new' ? '2px solid var(--accent)' : 'none', color: activeTab === 'new' ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Create New Player
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setActiveTab('existing')} 
                        style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'existing' ? '2px solid var(--accent)' : 'none', color: activeTab === 'existing' ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Search Existing Players
                    </button>
                </div>

                {activeTab === 'new' ? (
                    /* Tab 1: New Player Form */
                    <form onSubmit={onCreatePlayer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="input-group">
                            <label>Player Name</label>
                            <input 
                                type="text" 
                                value={playerName} 
                                onChange={(e) => setPlayerName(e.target.value)} 
                                placeholder="Sarah Jenkins" 
                                required 
                            />
                        </div>
                        <div className="form-row-double" style={{ display: 'flex', gap: '12px' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Jersey Number</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="99" 
                                    value={playerNumber} 
                                    onChange={(e) => setPlayerNumber(parseInt(e.target.value) || 0)} 
                                    required 
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Bats</label>
                                <select 
                                    value={battingHand} 
                                    onChange={(e) => setBattingHand(e.target.value)} 
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}
                                >
                                    <option value="Right">Right</option>
                                    <option value="Left">Left</option>
                                    <option value="Switch">Switch</option>
                                </select>
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Throws</label>
                                <select 
                                    value={throwingHand} 
                                    onChange={(e) => setThrowingHand(e.target.value)} 
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}
                                >
                                    <option value="Right">Right</option>
                                    <option value="Left">Left</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Player</button>
                            <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    /* Tab 2: Search/Add Returning Player Form */
                    <form onSubmit={handleAddReturningSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {!selectedPlayer ? (
                            <div className="input-group">
                                <label>Search Career Directory (by name)</label>
                                <input 
                                    type="text" 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    placeholder="Type player name..." 
                                    required={!selectedPlayer}
                                />
                                
                                {searchResults.length > 0 && (
                                    <div style={{ marginTop: '8px', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--code-bg)' }}>
                                        {searchResults.map(p => (
                                            <div 
                                                key={p.id} 
                                                onClick={() => setSelectedPlayer(p)} 
                                                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', textAlign: 'left', transition: 'background 0.15s ease' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <strong style={{ color: 'var(--accent)' }}>{p.player_name}</strong> 
                                                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                                                    {p.team_name ? `(${p.team_name} — ${p.season})` : '(No previous team)'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--accent-bg)', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ color: 'var(--text-secondary)' }}>Selected Player:</span>
                                    <strong style={{ display: 'block', fontSize: '15px', color: 'var(--accent)', marginTop: '4px' }}>{selectedPlayer.player_name}</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Bats: {selectedPlayer.batting_hand} | Throws: {selectedPlayer.throwing_hand}
                                    </span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => { setSelectedPlayer(null); setSearchQuery(''); }} 
                                    style={{ background: 'none', border: 'none', color: '#ff6b6b', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Change
                                </button>
                            </div>
                        )}

                        {selectedPlayer && (
                            <div className="input-group">
                                <label>Jersey Number for {teams.find(t => t.id === selectedTeamId)?.team_name || 'Roster'}</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="99" 
                                    value={playerNumber} 
                                    onChange={(e) => setPlayerNumber(parseInt(e.target.value) || 0)} 
                                    placeholder="Enter jersey number"
                                    required 
                                />
                            </div>
                        )}

                        <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                style={{ flex: 1 }} 
                                disabled={!selectedPlayer || storeLoading}
                            >
                                {storeLoading ? 'Adding...' : 'Add to Roster'}
                            </button>
                            <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </form>
                )}
            </div>
        );
    }

    // 2. Edit Player Details & Stats Form
    if (editingPlayer) {
        return (
            <form onSubmit={onUpdatePlayer} className="add-team-form">
                {/* Header with Back Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <button 
                        type="button" 
                        onClick={cancelForms} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--text-secondary)', 
                            cursor: 'pointer', 
                            padding: '4px 0', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-h)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        title="Back to Roster"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h3 style={{ margin: 0 }}>Edit Player & Stats</h3>
                </div>
                <div className="form-row-double" style={{ display: 'flex', gap: '12px' }}>
                    <div className="input-group" style={{ flex: 2 }}>
                        <label>Player Name</label>
                        <input 
                            type="text" 
                            value={playerName} 
                            onChange={(e) => setPlayerName(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                        <label>Number</label>
                        <input 
                            type="number" 
                            value={playerNumber} 
                            onChange={(e) => setPlayerNumber(parseInt(e.target.value) || 0)} 
                            required 
                        />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                        <label>Bats</label>
                        <select 
                            value={battingHand} 
                            onChange={(e) => setBattingHand(e.target.value)} 
                            style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}
                        >
                            <option value="Right">Right</option>
                            <option value="Left">Left</option>
                            <option value="Switch">Switch</option>
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                        <label>Throws</label>
                        <select 
                            value={throwingHand} 
                            onChange={(e) => setThrowingHand(e.target.value)} 
                            style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}
                        >
                            <option value="Right">Right</option>
                            <option value="Left">Left</option>
                        </select>
                    </div>
                </div>
                
                {/* Batting Statistics section */}
                <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '4px', textAlign: 'left' }}>Batting Statistics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div className="input-group">
                        <label>Games (GP)</label>
                        <input type="number" value={gp} onChange={(e) => setGp(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Plate App. (PA)</label>
                        <input type="number" value={pa} onChange={(e) => setPa(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>At Bats (AB)</label>
                        <input type="number" value={ab} onChange={(e) => setAb(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Runs Scored (R)</label>
                        <input type="number" value={runsScored} onChange={(e) => setRunsScored(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Runs Batted In (RBI)</label>
                        <input type="number" value={rbi} onChange={(e) => setRbi(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Singles (1B)</label>
                        <input type="number" value={singles} onChange={(e) => setSingles(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Doubles (2B)</label>
                        <input type="number" value={doubles} onChange={(e) => setDoubles(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Triples (3B)</label>
                        <input type="number" value={triples} onChange={(e) => setTriples(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Home Runs (HR)</label>
                        <input type="number" value={hr} onChange={(e) => setHr(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Walks (BB)</label>
                        <input type="number" value={bb} onChange={(e) => setBb(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Strikeouts (K)</label>
                        <input type="number" value={k} onChange={(e) => setK(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Hit By Pitch (HBP)</label>
                        <input type="number" value={hbp} onChange={(e) => setHbp(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Stolen Bases (SB)</label>
                        <input type="number" value={sb} onChange={(e) => setSb(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Caught Stealing</label>
                        <input type="number" value={cs} onChange={(e) => setCs(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Reached on Error (ROE)</label>
                        <input type="number" value={reachedOnError} onChange={(e) => setReachedOnError(parseInt(e.target.value) || 0)} />
                    </div>
                </div>

                {/* Pitching Statistics section */}
                <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '4px', textAlign: 'left' }}>Pitching Statistics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div className="input-group">
                        <label>Games Pitched (GP)</label>
                        <input type="number" min="0" value={gamesPitched} onChange={(e) => setGamesPitched(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Innings Pitched (IP)</label>
                        <input type="number" step="0.1" min="0" value={inningsPitched} onChange={(e) => setInningsPitched(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Games Started (GS)</label>
                        <input type="number" min="0" value={gamesStarted} onChange={(e) => setGamesStarted(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Batters Faced (BF)</label>
                        <input type="number" min="0" value={battersFaced} onChange={(e) => setBattersFaced(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Pitches (#P)</label>
                        <input type="number" min="0" value={numberOfPitches} onChange={(e) => setNumberOfPitches(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Hits Allowed (H)</label>
                        <input type="number" min="0" value={hitsAllowed} onChange={(e) => setHitsAllowed(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Runs Allowed (R)</label>
                        <input type="number" min="0" value={runsAllowed} onChange={(e) => setRunsAllowed(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Earned Runs (ER)</label>
                        <input type="number" min="0" value={earnedRuns} onChange={(e) => setEarnedRuns(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Walks Allowed (BB)</label>
                        <input type="number" min="0" value={walksAllowed} onChange={(e) => setWalksAllowed(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Strikeouts Thrown (SO)</label>
                        <input type="number" min="0" value={strikeoutsThrown} onChange={(e) => setStrikeoutsThrown(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>HBP Allowed</label>
                        <input type="number" min="0" value={hitByPitchesAllowed} onChange={(e) => setHitByPitchesAllowed(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Left on Base (LOB)</label>
                        <input type="number" min="0" value={leftOnBase} onChange={(e) => setLeftOnBase(parseInt(e.target.value) || 0)} />
                    </div>
                </div>

                {/* Fielding Statistics Section */}
                <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '4px', textAlign: 'left' }}>Fielding Statistics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div className="input-group">
                        <label>Total Chances (TC)</label>
                        <input type="number" min="0" value={totalChances} onChange={(e) => setTotalChances(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Putouts (PO)</label>
                        <input type="number" min="0" value={putouts} onChange={(e) => setPutouts(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Assists (A)</label>
                        <input type="number" min="0" value={assists} onChange={(e) => setAssists(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Errors (E)</label>
                        <input type="number" min="0" value={errorsVal} onChange={(e) => setErrorsVal(parseInt(e.target.value) || 0)} />
                    </div>
                </div>

                {/* Catching Statistics Section */}
                <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '4px', textAlign: 'left' }}>Catching Statistics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div className="input-group">
                        <label>Innings Caught (IC)</label>
                        <input type="number" step="0.1" min="0" value={inningsCaught} onChange={(e) => setInningsCaught(parseFloat(e.target.value) || 0.0)} />
                    </div>
                    <div className="input-group">
                        <label>Passed Balls (PB)</label>
                        <input type="number" min="0" value={passedBallsAllowed} onChange={(e) => setPassedBallsAllowed(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>SB Allowed (SBA)</label>
                        <input type="number" min="0" value={runnersStolenBases} onChange={(e) => setRunnersStolenBases(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="input-group">
                        <label>Caught Stealing (CS)</label>
                        <input type="number" min="0" value={runnersCaughtStealing} onChange={(e) => setRunnersCaughtStealing(parseInt(e.target.value) || 0)} />
                    </div>
                </div>

                {/* Eligible Positions Section */}
                <h4 style={{ margin: '20px 0 12px 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '4px', textAlign: 'left' }}>Eligible Positions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px', textAlign: 'left' }}>
                    {["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"].map(pos => {
                        const isEligible = eligiblePositions.split(',').map((s: string) => s.trim()).includes(pos);
                        return (
                            <label key={pos} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '8px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid var(--border)', 
                                background: isEligible ? 'var(--accent-bg)' : 'transparent', 
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.15s ease',
                                fontWeight: isEligible ? 'bold' : 'normal',
                                color: isEligible ? 'var(--accent)' : 'var(--text)'
                            }}>
                                <input 
                                    type="checkbox" 
                                    checked={isEligible} 
                                    onChange={() => {
                                        const currentList = eligiblePositions.split(',').map((s: string) => s.trim()).filter(Boolean);
                                        let newList;
                                        if (currentList.includes(pos)) {
                                            newList = currentList.filter((x: string) => x !== pos);
                                        } else {
                                            newList = [...currentList, pos];
                                        }
                                        setEligiblePositions(newList.join(','));
                                    }}
                                    style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                                />
                                <span style={{ fontSize: '13px' }}>{pos}</span>
                            </label>
                        );
                    })}
                </div>
                
                <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Stats</button>
                    <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                </div>
            </form>
        );
    }

    return null;
}