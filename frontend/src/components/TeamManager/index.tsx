import React, { useState, useEffect } from 'react';
import { Plus, Users, X, Trophy, Pencil, Trash2, TrendingUp, Map } from 'lucide-react';

// Shared type-only imports and local helpers
import type { Team, Player, TeamManagerProps } from './types';
import { apiFetch } from '../../utils/api';


// Modular Forms and Views

import { TeamForm } from './forms/TeamForm';
import { PlayerForm } from './forms/PlayerForm';
import { PitchingAnalyticsView } from './analytics/PitchingAnalyticsView';
import { BattingAnalyticsView } from './analytics/BattingAnalyticsView';
import { FieldingAnalyticsView } from './analytics/FieldingAnalyticsView';
import { DefensiveRotationView } from './analytics/DefensiveRotationView';

// Hook uploader
import { useGameChangerImport } from './hooks/useGameChangerImport';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function TeamManager({ coachId, onClose, selectedTeamId, onSelectTeam }: TeamManagerProps) {
    const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);

    const activeTeam = teams.find(t => t.id === selectedTeamId);
    const [userRole, setUserRole] = useState<'Head Coach' | 'Assistant Coach'>('Head Coach');

    useEffect(() => {
        if (activeTeam) {
            setUserRole(activeTeam.role ?? 'Head Coach');
        }
    }, [activeTeam]);
    
    // Forms state toggles
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [subView, setSubView] = useState<'batting' | 'pitching' | 'fielding' | 'catching' | 'pitching_analytics' | 'batting_analytics' | 'fielding_analytics' | 'defensive_rotation'>('batting');
    const [selectedPitcherId, setSelectedPitcherId] = useState<number | null>(null);
    const [selectedBatterId, setSelectedBatterId] = useState<number | null>(null);
    const [selectedFielderId, setSelectedFielderId] = useState<number | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

    // Team form inputs
    const [teamName, setTeamName] = useState('');
    const [season, setSeason] = useState('Spring 2026');
    const [ageGroup, setAgeGroup] = useState('12U Division');
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [ties, setTies] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [inningsPerGame, setInningsPerGame] = useState(7);

    // Player form inputs
    const [playerName, setPlayerName] = useState('');
    const [playerNumber, setPlayerNumber] = useState(0);
    const [battingHand, setBattingHand] = useState('Right');
    const [throwingHand, setThrowingHand] = useState('Right');
    const [gp, setGp] = useState(0);
    const [pa, setPa] = useState(0);
    const [ab, setAb] = useState(0);
    const [singles, setSingles] = useState(0);
    const [doubles, setDoubles] = useState(0);
    const [triples, setTriples] = useState(0);
    const [hr, setHr] = useState(0);
    const [bb, setBb] = useState(0);
    const [k, setK] = useState(0);
    const [hbp, setHbp] = useState(0);
    const [sb, setSb] = useState(0);
    const [cs, setCs] = useState(0);
    const [runsScored, setRunsScored] = useState(0);
    const [rbi, setRbi] = useState(0);
    const [gamesPitched, setGamesPitched] = useState(0);
    const [gamesStarted, setGamesStarted] = useState(0);
    const [inningsPitched, setInningsPitched] = useState(0.0);
    const [battersFaced, setBattersFaced] = useState(0);
    const [numberOfPitches, setNumberOfPitches] = useState(0);
    const [hitsAllowed, setHitsAllowed] = useState(0);
    const [runsAllowed, setRunsAllowed] = useState(0);
    const [earnedRuns, setEarnedRuns] = useState(0);
    const [walksAllowed, setWalksAllowed] = useState(0);
    const [strikeoutsThrown, setStrikeoutsThrown] = useState(0);
    const [hitByPitchesAllowed, setHitByPitchesAllowed] = useState(0);
    const [leftOnBase, setLeftOnBase] = useState(0);

    // Fielding form inputs
    const [totalChances, setTotalChances] = useState(0);
    const [assists, setAssists] = useState(0);
    const [putouts, setPutouts] = useState(0);
    const [errorsVal, setErrorsVal] = useState(0);

    // Catching form inputs
    const [inningsCaught, setInningsCaught] = useState(0.0);
    const [passedBallsAllowed, setPassedBallsAllowed] = useState(0);
    const [runnersStolenBases, setRunnersStolenBases] = useState(0);
    const [runnersCaughtStealing, setRunnersCaughtStealing] = useState(0);

    // Sorting State
    const [sortField, setSortField] = useState<keyof Player | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const handleSort = (field: keyof Player) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };
    
    // Derived sorted roster list
    const sortedPlayers = React.useMemo(() => {
        let list = [...players];
        if (subView === 'pitching') {
            list = list.filter(p => p.games_pitched > 0 && p.number_of_pitches > 0);
        }
        if (subView === 'catching') {
            list = list.filter(p => p.innings_caught > 0);
        }
        if (!sortField) return list;
        return list.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc' 
                    ? aVal.localeCompare(bVal) 
                    : bVal.localeCompare(aVal);
            }
            
            const aNum = Number(aVal) || 0;
            const bNum = Number(bVal) || 0;
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        });
    }, [players, sortField, sortDirection, subView]);

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const response = await apiFetch(`/api/teams/${coachId}`);
            if (response.ok) {
                const data = await response.json();
                setTeams(data);
                
                if (selectedTeamId) {
                    const currentSelected = data.find((t: Team) => t.id === selectedTeamId);
                    if (currentSelected) {
                        onSelectTeam(currentSelected);
                    }
                } else {
                    const defaultActive = data.find((t: Team) => t.is_active);
                    if (defaultActive) {
                        onSelectTeam(defaultActive);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching teams:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlayers = async () => {
        if (!selectedTeamId) return;
        setLoading(true);
        try {
            const response = await apiFetch(`/api/players/${selectedTeamId}`);
            if (response.ok) {
                const data = await response.json();
                setPlayers(data);
            }
        } catch (err) {
            console.error("Error fetching players:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    useEffect(() => {
        if (selectedTeamId) {
            fetchPlayers();
            cancelForms();
        }
    }, [selectedTeamId]);

    // Instantiate hook for CSV uploads
    const {
        importPreview,
        showImportModal,
        setShowImportModal,
        handleFileImport,
        handleConfirmImport
    } = useGameChangerImport({
        API_BASE,
        selectedTeamId,
        coachId,
        players,
        fetchPlayers
    });

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await apiFetch(`/api/teams`, {
                method: "POST",
                body: JSON.stringify({
                    coach_id: coachId,
                    team_name: teamName,
                    season,
                    age_group: ageGroup,
                    innings_per_game: inningsPerGame
                })
            });
            if (response.ok) {
                const newTeam = await response.json();
                onSelectTeam(newTeam);
                fetchTeams();
                cancelForms();
            }
        } catch (err) {
            console.error("Error creating team:", err);
        }
    };

    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeam) return;
        try {
            const response = await apiFetch(`/api/teams/${editingTeam.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    coach_id: coachId,
                    team_name: teamName,
                    season,
                    wins,
                    losses,
                    ties,
                    age_group: ageGroup,
                    is_active: isActive,
                    innings_per_game: inningsPerGame
                })
            });
            if (response.ok) {
                fetchTeams();
                cancelForms();
            }
        } catch (err) {
            console.error("Error updating team:", err);
        }
    };



    


    const handleCreatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId) return;
        try {
            const response = await apiFetch(`/api/players`, {
                method: "POST",
                body: JSON.stringify({
                    coach_id: coachId,
                    team_id: selectedTeamId,
                    player_name: playerName,
                    player_number: playerNumber,
                    batting_hand: battingHand,
                    throwing_hand: throwingHand
                })
            });
            if (response.ok) {
                fetchPlayers();
                cancelForms();
            }
        } catch (err) {
            console.error("Error creating player:", err);
        }
    };

    const handleUpdatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlayer) return;
        try {
            const response = await apiFetch(`/api/players/${editingPlayer.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    coach_id: coachId,
                    player_name: playerName,
                    player_number: playerNumber,
                    batting_hand: battingHand,
                    throwing_hand: throwingHand,
                    games_played: gp,
                    plate_appearances: pa,
                    at_bats: ab,
                    singles,
                    doubles,
                    triples,
                    home_runs: hr,
                    walks: bb,
                    strikeouts: k,
                    hit_by_pitches: hbp,
                    stolen_bases: sb,
                    caught_stealing: cs,
                    runs_scored: runsScored,
                    runs_batted_in: rbi,
                    games_pitched: gamesPitched,
                    games_started: gamesStarted,
                    innings_pitched: inningsPitched,
                    batters_faced: battersFaced,
                    number_of_pitches: numberOfPitches,
                    hits_allowed: hitsAllowed,
                    runs_allowed: runsAllowed,
                    earned_runs: earnedRuns,
                    walks_allowed: walksAllowed,
                    strikeouts_thrown: strikeoutsThrown,
                    hit_by_pitches_allowed: hitByPitchesAllowed,
                    left_on_base: leftOnBase,
                    total_chances: totalChances,
                    assists,
                    putouts,
                    errors: errorsVal,
                    innings_caught: inningsCaught,
                    passed_balls_allowed: passedBallsAllowed,
                    runners_stolen_bases: runnersStolenBases,
                    runners_caught_stealing: runnersCaughtStealing
                })
            });
            if (response.ok) {
                fetchPlayers();
                cancelForms();
            }
        } catch (err) {
            console.error("Error updating player:", err);
        }
    };

    const handleDeletePlayer = async (playerId: number) => {
        if (!window.confirm("Are you sure you want to remove this player from the team?")) return;
        try {
            const response = await apiFetch(`/api/players/${playerId}?coach_id=${coachId}`, { method: "DELETE" });
            if (response.ok) {
                fetchPlayers();
            }
        } catch (err) {
            console.error("Error deleting player:", err);
        }
    };

    const startEditingTeam = (team: Team, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTeam(team);
        setTeamName(team.team_name);
        setSeason(team.season);
        setAgeGroup(team.age_group);
        setWins(team.wins);
        setLosses(team.losses);
        setTies(team.ties);
        setIsActive(team.is_active);
        setInningsPerGame(team.innings_per_game);
    };

    const startEditingPlayer = (player: Player) => {
        setEditingPlayer(player);
        setPlayerName(player.player_name);
        setPlayerNumber(player.player_number);
        setBattingHand(player.batting_hand);
        setThrowingHand(player.throwing_hand);
        setGp(player.games_played);
        setPa(player.plate_appearances);
        setAb(player.at_bats);
        setSingles(player.singles);
        setDoubles(player.doubles);
        setTriples(player.triples);
        setHr(player.home_runs);
        setBb(player.walks);
        setK(player.strikeouts);
        setHbp(player.hit_by_pitches);
        setSb(player.stolen_bases);
        setCs(player.caught_stealing);
        setRunsScored(player.runs_scored);
        setRbi(player.runs_batted_in);
        setGamesPitched(player.games_pitched);
        setGamesStarted(player.games_started);
        setInningsPitched(player.innings_pitched);
        setBattersFaced(player.batters_faced);
        setNumberOfPitches(player.number_of_pitches);
        setHitsAllowed(player.hits_allowed);
        setRunsAllowed(player.runs_allowed);
        setEarnedRuns(player.earned_runs);
        setWalksAllowed(player.walks_allowed);
        setStrikeoutsThrown(player.strikeouts_thrown);
        setHitByPitchesAllowed(player.hit_by_pitches_allowed);
        setLeftOnBase(player.left_on_base);
        setTotalChances(player.total_chances);
        setAssists(player.assists);
        setPutouts(player.putouts);
        setErrorsVal(player.errors);
        setInningsCaught(player.innings_caught);
        setPassedBallsAllowed(player.passed_balls_allowed);
        setRunnersStolenBases(player.runners_stolen_bases);
        setRunnersCaughtStealing(player.runners_caught_stealing);
    };

    const cancelForms = () => {
        setShowAddForm(false);
        setEditingTeam(null);
        setShowAddPlayerForm(false);
        setEditingPlayer(null);
        setTeamName('');
        setPlayerName('');
        setPlayerNumber(0);
        setBattingHand('Right');
        setThrowingHand('Right');
        setGp(0);
        setPa(0);
        setAb(0);
        setSingles(0);
        setDoubles(0);
        setTriples(0);
        setHr(0);
        setBb(0);
        setK(0);
        setHbp(0);
        setSb(0);
        setCs(0);
        setRunsScored(0);
        setRbi(0);
        setGamesPitched(0);
        setGamesStarted(0);
        setInningsPitched(0.0);
        setBattersFaced(0);
        setNumberOfPitches(0);
        setHitsAllowed(0);
        setRunsAllowed(0);
        setEarnedRuns(0);
        setWalksAllowed(0);
        setStrikeoutsThrown(0);
        setHitByPitchesAllowed(0);
        setLeftOnBase(0);
        setTotalChances(0);
        setAssists(0);
        setPutouts(0);
        setErrorsVal(0);
        setInningsCaught(0.0);
        setPassedBallsAllowed(0);
        setRunnersStolenBases(0);
        setRunnersCaughtStealing(0);
    };

    return (
        <div className="modal-overlay">
            <div className="team-manager-card" style={{ width: activeTab === 'players' ? (subView === 'batting' ? '1050px' : '1180px') : '550px', transition: 'width 0.2s ease-out' }}>
                <div className="team-manager-header">
                    <div className="title-area" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users className="icon-sidebar" />
                        <h2>Team Workspace Manager</h2>
                        {selectedTeamId && (
                            <span style={{ 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontWeight: 'bold',
                                background: userRole === 'Head Coach' ? 'var(--accent-bg)' : 'rgba(148, 163, 184, 0.15)',
                                color: userRole === 'Head Coach' ? 'var(--accent)' : 'var(--text)',
                                border: '1px solid ' + (userRole === 'Head Coach' ? 'var(--accent)' : 'var(--border)')
                            }}>
                                {userRole}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="btn-close-modal"><X size={20} /></button>
                </div>

                {/* Tab Switcher */}
                <div className="tab-menu" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                    <button 
                        onClick={() => { setActiveTab('teams'); cancelForms(); }} 
                        className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                        style={{ padding: '8px 16px', background: activeTab === 'teams' ? 'var(--accent-bg)' : 'transparent', border: 'none', color: activeTab === 'teams' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold' }}
                    >
                        Teams List
                    </button>
                    <button 
                        onClick={() => { setActiveTab('players'); cancelForms(); }} 
                        disabled={!selectedTeamId}
                        className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                        style={{ padding: '8px 16px', background: activeTab === 'players' ? 'var(--accent-bg)' : 'transparent', border: 'none', color: activeTab === 'players' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', opacity: selectedTeamId ? 1 : 0.4 }}
                    >
                        Player List
                    </button>
                </div>

                {activeTab === 'teams' ? (
                    /* TEAMS VIEW TAB */
                    showAddForm || editingTeam ? (
                        <TeamForm
                            coachId={coachId}
                            editingTeam={editingTeam}
                            showAddForm={showAddForm}
                            cancelForms={cancelForms}
                            teamName={teamName}
                            setTeamName={setTeamName}
                            season={season}
                            setSeason={setSeason}
                            ageGroup={ageGroup}
                            setAgeGroup={setAgeGroup}
                            wins={wins}
                            setWins={setWins}
                            losses={losses}
                            setLosses={setLosses}
                            ties={ties}
                            setTies={setTies}
                            isActive={isActive}
                            setIsActive={setIsActive}
                            inningsPerGame={inningsPerGame}
                            setInningsPerGame={setInningsPerGame}
                            onCreateTeam={handleCreateTeam}
                            onUpdateTeam={handleUpdateTeam}
                            onInviteSuccess={fetchTeams}
                        />
                    ) : (
                        <div className="teams-list-area">
                            <div className="list-subheader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text)' }}>Select or edit a team below</span>
                                <button onClick={() => setShowAddForm(true)} className="btn-add-team">
                                    <Plus size={16} /> Add Team
                                </button>
                            </div>
                            <div className="teams-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', padding: '4px' }}>
                                {teams.map((t) => (
                                    <div key={t.id} onClick={() => onSelectTeam(t)} className={`team-card ${t.id === selectedTeamId ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '8px', border: t.id === selectedTeamId ? '2px solid var(--accent)' : '1px solid var(--border)', background: t.id === selectedTeamId ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer' }}>
                                        <div className="team-card-info" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><Trophy style={{ color: t.id === selectedTeamId ? 'var(--accent)' : 'var(--text)' }} size={20} /><div><h4 style={{ margin: 0, color: 'var(--text-h)', fontWeight: '600' }}>{t.team_name}</h4><span style={{ fontSize: '12px', color: 'var(--text)' }}>{t.season} • {t.age_group}</span></div></div>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}><div className="team-stats" style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}><span style={{ color: '#22c55e' }}>{t.wins}W</span><span style={{ color: '#ef4444' }}>{t.losses}L</span><span style={{ color: '#94a3b8' }}>{t.ties}T</span></div>{(t.role === 'Head Coach' || !t.role) && <button onClick={(e) => startEditingTeam(t, e)} className="btn-edit-team-pencil" style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}><Pencil size={15} /></button>}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                ) : (
                    /* PLAYERS VIEW TAB */
                    showAddPlayerForm || editingPlayer ? (
                        <PlayerForm
                            editingPlayer={editingPlayer}
                            showAddPlayerForm={showAddPlayerForm}
                            cancelForms={cancelForms}
                            teams={teams}
                            selectedTeamId={selectedTeamId}
                            onCreatePlayer={handleCreatePlayer}
                            onUpdatePlayer={handleUpdatePlayer}
                            playerName={playerName}
                            setPlayerName={setPlayerName}
                            playerNumber={playerNumber}
                            setPlayerNumber={setPlayerNumber}
                            battingHand={battingHand}
                            setBattingHand={setBattingHand}
                            throwingHand={throwingHand}
                            setThrowingHand={setThrowingHand}
                            gp={gp}
                            setGp={setGp}
                            pa={pa}
                            setPa={setPa}
                            ab={ab}
                            setAb={setAb}
                            singles={singles}
                            setSingles={setSingles}
                            doubles={doubles}
                            setDoubles={setDoubles}
                            triples={triples}
                            setTriples={setTriples}
                            hr={hr}
                            setHr={setHr}
                            bb={bb}
                            setBb={setBb}
                            k={k}
                            setK={setK}
                            hbp={hbp}
                            setHbp={setHbp}
                            sb={sb}
                            setSb={setSb}
                            cs={cs}
                            setCs={setCs}
                            runsScored={runsScored}
                            setRunsScored={setRunsScored}
                            rbi={rbi}
                            setRbi={setRbi}
                            gamesPitched={gamesPitched}
                            setGamesPitched={setGamesPitched}
                            gamesStarted={gamesStarted}
                            setGamesStarted={setGamesStarted}
                            inningsPitched={inningsPitched}
                            setInningsPitched={setInningsPitched}
                            battersFaced={battersFaced}
                            setBattersFaced={setBattersFaced}
                            numberOfPitches={numberOfPitches}
                            setNumberOfPitches={setNumberOfPitches}
                            hitsAllowed={hitsAllowed}
                            setHitsAllowed={setHitsAllowed}
                            runsAllowed={runsAllowed}
                            setRunsAllowed={setRunsAllowed}
                            earnedRuns={earnedRuns}
                            setEarnedRuns={setEarnedRuns}
                            walksAllowed={walksAllowed}
                            setWalksAllowed={setWalksAllowed}
                            strikeoutsThrown={strikeoutsThrown}
                            setStrikeoutsThrown={setStrikeoutsThrown}
                            hitByPitchesAllowed={hitByPitchesAllowed}
                            setHitByPitchesAllowed={setHitByPitchesAllowed}
                            leftOnBase={leftOnBase}
                            setLeftOnBase={setLeftOnBase}
                            totalChances={totalChances}
                            setTotalChances={setTotalChances}
                            assists={assists}
                            setAssists={setAssists}
                            putouts={putouts}
                            setPutouts={setPutouts}
                            errorsVal={errorsVal}
                            setErrorsVal={setErrorsVal}
                            inningsCaught={inningsCaught}
                            setInningsCaught={setInningsCaught}
                            passedBallsAllowed={passedBallsAllowed}
                            setPassedBallsAllowed={setPassedBallsAllowed}
                            runnersStolenBases={runnersStolenBases}
                            setRunnersStolenBases={setRunnersStolenBases}
                            runnersCaughtStealing={runnersCaughtStealing}
                            setRunnersCaughtStealing={setRunnersCaughtStealing}
                        />
                    ) : (
                        <div className="players-list-area">
                            <div className="list-subheader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-h)' }}>
                                        Team Players {selectedTeamId && ` - ${teams.find(t => t.id === selectedTeamId)?.team_name}`}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('batting'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'batting' ? 'active' : ''}`}
                                            style={{ padding: '4px 10px', background: subView === 'batting' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: subView === 'batting' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}
                                        >
                                            Batting
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('pitching'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'pitching' ? 'active' : ''}`}
                                            style={{ padding: '4px 10px', background: subView === 'pitching' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: subView === 'pitching' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}
                                        >
                                            Pitching
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('fielding'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'fielding' ? 'active' : ''}`}
                                            style={{ padding: '4px 10px', background: subView === 'fielding' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: subView === 'fielding' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}
                                        >
                                            Fielding
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('catching'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'catching' ? 'active' : ''}`}
                                            style={{ padding: '4px 10px', background: subView === 'catching' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: subView === 'catching' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}
                                        >
                                            Catching
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('pitching_analytics'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'pitching_analytics' ? 'active' : ''}`}
                                            style={{ padding: '4px 10px', background: subView === 'pitching_analytics' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: subView === 'pitching_analytics' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <TrendingUp size={12} /> Pitching Analytics
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('batting_analytics'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'batting_analytics' ? 'active' : ''}`}
                                            style={{ padding: '4px 10px', background: subView === 'batting_analytics' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: subView === 'batting_analytics' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <TrendingUp size={12} /> Batting Analytics
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('fielding_analytics'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'fielding_analytics' ? 'active' : ''}`}
                                            style={{ padding: '4px 10px', background: subView === 'fielding_analytics' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: subView === 'fielding_analytics' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <TrendingUp size={12} /> Fielding Analytics
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('defensive_rotation'); setSelectedPosition('SS'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'defensive_rotation' ? 'active' : ''}`}
                                            style={{ padding: '4px 10px', background: subView === 'defensive_rotation' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: subView === 'defensive_rotation' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Map size={12} /> Defensive Rotation
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {userRole !== 'Head Coach' ? (
                                        <div style={{ padding: '8px 12px', background: 'rgba(148, 163, 184, 0.1)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', color: 'var(--text)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                            🔒 Read-Only Mode (Assistant Coach)
                                        </div>
                                    ) : (
                                        <>
                                            <label className="btn-guest" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', padding: '8px 12px' }}>
                                                <Plus size={14} /> Import GC Stats
                                                <input type="file" accept=".csv" onChange={handleFileImport} style={{ display: 'none' }} />
                                            </label>
                                            <button onClick={() => setShowAddPlayerForm(true)} className="btn-add-team">
                                                <Plus size={16} /> Add Player
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {loading && players.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center' }}>Loading players...</div>
                            ) : players.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text)' }}>
                                    📋 No players added to the roster yet. Add your first player!
                                </div>
                            ) : subView === 'pitching_analytics' ? (
                                <PitchingAnalyticsView 
                                    players={players} 
                                    selectedPitcherId={selectedPitcherId} 
                                    onSelectPitcher={setSelectedPitcherId} 
                                    inningsPerGame={teams.find(t => t.id === selectedTeamId)?.innings_per_game || 7}
                                />
                            ) : subView === 'batting_analytics' ? (
                                <BattingAnalyticsView 
                                    players={players} 
                                    selectedBatterId={selectedBatterId} 
                                    onSelectBatter={setSelectedBatterId} 
                                    // Innings per game isn't strictly required but standard
                                />
                            ) : subView === 'fielding_analytics' ? (
                                <FieldingAnalyticsView 
                                    players={players} 
                                    selectedFielderId={selectedFielderId} 
                                    onSelectFielder={setSelectedFielderId} 
                                />
                            ) : subView === 'defensive_rotation' ? (
                                <DefensiveRotationView 
                                    players={players}
                                    selectedPosition={selectedPosition}
                                    onSelectPosition={setSelectedPosition}
                                />
                            ) : (
                                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                    <table className="players-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)' }}>
                                                <th onClick={() => handleSort('player_number')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                    # {sortField === 'player_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                </th>
                                                <th onClick={() => handleSort('player_name')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                    Player Name {sortField === 'player_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                </th>
                                                <th onClick={() => handleSort('batting_hand')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                    Bats {sortField === 'batting_hand' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                </th>
                                                <th onClick={() => handleSort('throwing_hand')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                    Throws {sortField === 'throwing_hand' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                </th>
                                                {subView === 'batting' ? (
                                                    <>
                                                        <th onClick={() => handleSort('games_played')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            GP {sortField === 'games_played' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('plate_appearances')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            PA {sortField === 'plate_appearances' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('at_bats')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            AB {sortField === 'at_bats' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('hits')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            H {sortField === 'hits' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('walks')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            BB {sortField === 'walks' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('strikeouts')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            K {sortField === 'strikeouts' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('runs_scored')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            R {sortField === 'runs_scored' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('runs_batted_in')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            RBI {sortField === 'runs_batted_in' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('stolen_bases')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            SB {sortField === 'stolen_bases' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('batting_average')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            AVG {sortField === 'batting_average' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('on_base_percentage')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            OBP {sortField === 'on_base_percentage' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                    </>
                                                ) : subView === 'pitching' ? (
                                                    <>
                                                        <th onClick={() => handleSort('games_pitched')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            GP {sortField === 'games_pitched' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('innings_pitched')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            IP {sortField === 'innings_pitched' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('games_started')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            GS {sortField === 'games_started' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('batters_faced')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            BF {sortField === 'batters_faced' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('number_of_pitches')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            #P {sortField === 'number_of_pitches' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('hits_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            H {sortField === 'hits_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('runs_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            R {sortField === 'runs_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('earned_runs')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            ER {sortField === 'earned_runs' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('walks_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            BB {sortField === 'walks_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('strikeouts_thrown')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            SO {sortField === 'strikeouts_thrown' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('hit_by_pitches_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            HBP {sortField === 'hit_by_pitches_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('era')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            ERA {sortField === 'era' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('whip')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            WHIP {sortField === 'whip' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('left_on_base')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            LOB {sortField === 'left_on_base' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                    </>
                                                ) : subView === 'fielding' ? (
                                                    <>
                                                        <th onClick={() => handleSort('games_played')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            GP {sortField === 'games_played' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('total_chances')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            TC {sortField === 'total_chances' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('putouts')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            PO {sortField === 'putouts' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('assists')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            A {sortField === 'assists' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('errors')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            E {sortField === 'errors' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('fielding_percentage')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            FPCT {sortField === 'fielding_percentage' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th onClick={() => handleSort('innings_caught')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            IC {sortField === 'innings_caught' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('passed_balls_allowed')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            PB {sortField === 'passed_balls_allowed' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('runners_stolen_bases')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            SBA {sortField === 'runners_stolen_bases' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('runners_caught_stealing')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            CS {sortField === 'runners_caught_stealing' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th onClick={() => handleSort('caught_stealing_percentage')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            CS% {sortField === 'caught_stealing_percentage' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                    </>
                                                )}
                                                {userRole === 'Head Coach' && <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedPlayers.map((p) => {
                                                const battingAvg = p.at_bats > 0 ? (p.singles + p.doubles + p.triples + p.home_runs) / p.at_bats : 0.000;
                                                const onBasePct = (p.at_bats + p.walks + p.hit_by_pitches) > 0 
                                                    ? (p.singles + p.doubles + p.triples + p.home_runs + p.walks + p.hit_by_pitches) / (p.at_bats + p.walks + p.hit_by_pitches) 
                                                    : 0.000;



                                                const era = p.innings_pitched > 0 ? (p.earned_runs * 7) / p.innings_pitched : 0.00;
                                                const whip = p.innings_pitched > 0 ? (p.hits_allowed + p.walks_allowed) / p.innings_pitched : 0.00;

                                                const fpct = p.total_chances > 0 ? (p.putouts + p.assists) / p.total_chances : 1.000;
                                                const cs_pct = (p.runners_stolen_bases + p.runners_caught_stealing) > 0 
                                                    ? p.runners_caught_stealing / (p.runners_stolen_bases + p.runners_caught_stealing)
                                                    : 0.000;

                                                return (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => startEditingPlayer(p)}>
                                                        <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>#{p.player_number}</td>
                                                        <td style={{ padding: '10px 12px', color: 'var(--text-h)', fontWeight: '600' }}>{p.player_name}</td>
                                                        <td style={{ padding: '10px 12px' }}>{p.batting_hand}</td>
                                                        <td style={{ padding: '10px 12px' }}>{p.throwing_hand}</td>
                                                        {subView === 'batting' ? (
                                                            <>
                                                                <td style={{ padding: '10px 12px' }}>{p.games_played}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.plate_appearances}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.at_bats}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.singles + p.doubles + p.triples + p.home_runs}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.walks}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.strikeouts}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.runs_scored}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.runs_batted_in}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.stolen_bases}</td>
                                                                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--accent)' }}>{battingAvg.toFixed(3)}</td>
                                                                <td style={{ padding: '10px 12px' }}>{onBasePct.toFixed(3)}</td>
                                                            </>
                                                        ) : subView === 'pitching' ? (
                                                            <>
                                                                <td style={{ padding: '10px 12px' }}>{p.games_pitched}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.innings_pitched.toFixed(1)}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.games_started}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.batters_faced}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.number_of_pitches}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.hits_allowed}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.runs_allowed}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.earned_runs}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.walks_allowed}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.strikeouts_thrown}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.hit_by_pitches_allowed}</td>
                                                                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--accent)' }}>{era.toFixed(2)}</td>
                                                                <td style={{ padding: '10px 12px' }}>{whip.toFixed(2)}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.left_on_base}</td>
                                                            </>
                                                        ) : subView === 'fielding' ? (
                                                            <>
                                                                <td style={{ padding: '10px 12px' }}>{p.games_played}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.total_chances}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.putouts}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.assists}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.errors}</td>
                                                                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                                    {p.total_chances > 0 ? fpct.toFixed(3) : 'N/A'}
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td style={{ padding: '10px 12px' }}>{p.innings_caught.toFixed(1)}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.passed_balls_allowed}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.runners_stolen_bases}</td>
                                                                <td style={{ padding: '10px 12px' }}>{p.runners_caught_stealing}</td>
                                                                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                                    {(p.runners_stolen_bases + p.runners_caught_stealing) > 0 ? (cs_pct * 100).toFixed(1) + '%' : '0.0%'}
                                                                </td>
                                                            </>
                                                        )}
                                                        {userRole === 'Head Coach' && (
                                                            <td style={{ padding: '10px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                                <button onClick={() => handleDeletePlayer(p.id)} className="btn-delete-team" style={{ display: 'inline-flex', padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* GameChanger CSV Import Preview Modal */}
                {showImportModal && (
                    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)' }}>
                        <div className="team-manager-card" style={{ width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                            <div className="team-manager-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Users className="icon-sidebar" />
                                    <h2>GameChanger Stats Import Preview</h2>
                                </div>
                                <button onClick={() => setShowImportModal(false)} className="btn-close-modal"><X size={20} /></button>
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                    Verify the matched players and stats below. Clicking "Confirm & Sync" will update statistics in your database for matched players.
                                </p>
                                
                                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                    <table className="players-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ padding: '8px 10px' }}>Status</th>
                                                <th style={{ padding: '8px 10px' }}>Player Name</th>
                                                <th style={{ padding: '8px 10px' }}>#</th>
                                                <th style={{ padding: '8px 10px' }}>GP</th>
                                                <th style={{ padding: '8px 10px' }}>AB</th>
                                                <th style={{ padding: '8px 10px' }}>H</th>
                                                <th style={{ padding: '8px 10px' }}>HR</th>
                                                <th style={{ padding: '8px 10px' }}>AVG</th>
                                                <th style={{ padding: '8px 10px' }}>IP (Pit)</th>
                                                <th style={{ padding: '8px 10px' }}>ERA</th>
                                                <th style={{ padding: '8px 10px' }}>TC (Fld)</th>
                                                <th style={{ padding: '8px 10px' }}>E</th>
                                                <th style={{ padding: '8px 10px' }}>IC (Cat)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importPreview.map((p, idx) => {
                                                const h = p.singles + p.doubles + p.triples + p.home_runs;
                                                const avg = p.at_bats > 0 ? h / p.at_bats : 0.000;
                                                const era = p.innings_pitched > 0 ? (p.earned_runs * 7) / p.innings_pitched : 0.00;

                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '8px 10px' }}>
                                                            {p.matched ? (
                                                                <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '4px', fontWeight: 'bold' }}>Matched</span>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontWeight: 'bold' }}>Unmatched</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: 'var(--text-h)' }}>{p.player_name}</td>
                                                        <td style={{ padding: '8px 10px' }}>#{p.player_number}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.games_played}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.at_bats}</td>
                                                        <td style={{ padding: '8px 10px' }}>{h}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.home_runs}</td>
                                                        <td style={{ padding: '8px 10px', color: 'var(--accent)', fontWeight: 'bold' }}>{avg.toFixed(3)}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.innings_pitched.toFixed(1)}</td>
                                                        <td style={{ padding: '8px 10px' }}>{era.toFixed(2)}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.total_chances}</td>
                                                        <td style={{ padding: '8px 10px', color: p.errors > 0 ? '#ef4444' : 'inherit' }}>{p.errors}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.innings_caught.toFixed(1)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="form-actions" style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
                                <button onClick={handleConfirmImport} className="btn-primary" style={{ flex: 1 }}>
                                    Confirm & Sync Stats ({importPreview.filter(p => p.matched).length} Players)
                                </button>
                                <button onClick={() => setShowImportModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}