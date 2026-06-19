import { useState, useEffect } from 'react';
import { X, Plus, Users, Pencil, Lock, Upload, ArrowLeft } from 'lucide-react';
import type { Team, Player, TeamManagerProps } from './types';

import { useTeamStore } from '../../store/useTeamStore';
import { useGameChangerImport } from './hooks/useGameChangerImport';

import { TeamForm } from './forms/TeamForm';
import { PlayerForm } from './forms/PlayerForm';
import { InviteCoachForm } from './forms/InviteCoachForm';

import { BattingAnalyticsView } from './analytics/BattingAnalyticsView';
import { PitchingAnalyticsView } from './analytics/PitchingAnalyticsView';
import { FieldingAnalyticsView } from './analytics/FieldingAnalyticsView';
import { DefensiveRotationView } from './analytics/DefensiveRotationView';
import { RosterTableContainer } from './tables/RosterTableContainer';

type SubViewType = 'batting' | 'pitching' | 'fielding' | 'catching' | 'pitching_analytics' | 'batting_analytics' | 'fielding_analytics' | 'defensive_rotation';

export default function TeamManager({ coachId, onClose, selectedTeamId, onSelectTeam }: TeamManagerProps) {
    const {
        teams,
        players,
        userRole,
        isLoading,
        fetchTeams,
        fetchPlayers,
        createTeam,
        updateTeam,
        createPlayer,
        updatePlayer,
        deletePlayer,
        setSelectedTeamId,
        setUserRole
    } = useTeamStore();

    // UI state
    const [subView, setSubView] = useState<SubViewType>('batting');
    const [mobileActiveView, setMobileActiveView] = useState<'list' | 'detail'>(selectedTeamId ? 'detail' : 'list');
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [showPlayerForm, setShowPlayerForm] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

    // Selections for analytics dashboards
    const [selectedPitcherId, setSelectedPitcherId] = useState<number | null>(null);
    const [selectedBatterId, setSelectedBatterId] = useState<number | null>(null);
    const [selectedFielderId, setSelectedFielderId] = useState<number | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

    // Team form input states
    const [teamName, setTeamName] = useState('');
    const [season, setSeason] = useState('Spring 2026');
    const [ageGroup, setAgeGroup] = useState('12U Division');
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [ties, setTies] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [inningsPerGame, setInningsPerGame] = useState(7);

    // Player form input states
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
    const [reachedOnError, setReachedOnError] = useState(0);
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
    const [eligiblePositions, setEligiblePositions] = useState('P,C,1B,2B,3B,SS,LF,CF,RF');

    // Initial load
    useEffect(() => {
        fetchTeams(coachId, selectedTeamId, onSelectTeam);
    }, []);

    // Load players when team changes
    useEffect(() => {
        if (selectedTeamId) {
            fetchPlayers(selectedTeamId);
            cancelForms();
        }
    }, [selectedTeamId]);

    // Update store state when parent passes new team
    const handleSelectActiveTeam = (team: Team) => {
        setSelectedTeamId(team.id);
        setUserRole(team.role || null);
        onSelectTeam(team);
        setMobileActiveView('detail');
    };

    // Instantiate hook for CSV uploads
    const {
        importPreview,
        showImportModal,
        setShowImportModal,
        handleFileImport,
        handleConfirmImport
    } = useGameChangerImport({
        selectedTeamId,
        coachId,
        players,
        fetchPlayers: () => fetchPlayers(selectedTeamId || 0)
    });

    const cancelForms = () => {
        setShowTeamForm(false);
        setEditingTeam(null);
        setShowPlayerForm(false);
        setEditingPlayer(null);
        
        // Reset team form inputs
        setTeamName('');
        setSeason('Spring 2026');
        setAgeGroup('12U Division');
        setWins(0);
        setLosses(0);
        setTies(0);
        setIsActive(false);
        setInningsPerGame(7);

        // Reset player form inputs
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
        setReachedOnError(0);
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
        setEligiblePositions('P,C,1B,2B,3B,SS,LF,CF,RF');
    };

    const handleCreateTeamSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createTeam(coachId, teamName, season, ageGroup, inningsPerGame, handleSelectActiveTeam);
        cancelForms();
    };

    const handleUpdateTeamSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeam) return;
        await updateTeam(coachId, editingTeam.id, teamName, season, wins, losses, ties, ageGroup, isActive, inningsPerGame);
        cancelForms();
    };

    const handleCreatePlayerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId) return;
        await createPlayer(coachId, selectedTeamId, playerName, playerNumber, battingHand, throwingHand);
        cancelForms();
    };

    const handleUpdatePlayerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlayer) return;
        await updatePlayer(coachId, editingPlayer.id, {
            player_name: playerName,
            player_number: playerNumber,
            batting_hand: battingHand,
            throwing_hand: throwingHand,
            eligible_positions: eligiblePositions,
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
            reached_on_error: reachedOnError,
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
        });
        cancelForms();
    };

    const handleDeletePlayerClick = async (playerId: number) => {
        if (!window.confirm("Are you sure you want to remove this player from the team?")) return;
        await deletePlayer(coachId, playerId);
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
        setShowTeamForm(true);
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
        setReachedOnError(player.reached_on_error || 0);
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
        setEligiblePositions(player.eligible_positions || 'P,C,1B,2B,3B,SS,LF,CF,RF');
        setShowPlayerForm(true);
    };

    const activeTeam = teams.find(t => t.id === selectedTeamId);
    const hasPlayers = players.length > 0;

    return (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 1000 }}>
            <div className="team-manager-card" style={{ width: '95vw', maxWidth: '1400px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
                
                {/* Header */}
                <div className="team-manager-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                            className={`btn-mobile-back ${mobileActiveView === 'detail' ? 'visible' : ''}`}
                            onClick={() => setMobileActiveView('list')}
                            title="Back to teams list"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <Users className="icon-sidebar" />
                        <h2>Team Workspace Manager</h2>
                        {userRole && (
                            <span className="badge-role" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: '12px', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                {userRole}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="btn-close-modal"><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    
                    {/* Sidebar: Teams List */}
                    <div 
                        className={`team-manager-sidebar ${mobileActiveView === 'list' ? 'mobile-visible' : 'mobile-hidden'}`}
                        style={{ width: '280px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--sidebar-bg)' }}
                    >
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>My Teams</span>
                            <button onClick={() => setShowTeamForm(true)} className="btn-add-team" style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Plus size={12} /> New Team
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                            {isLoading && teams.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading teams...</p>
                            ) : teams.map((team) => (
                                <div 
                                    key={team.id} 
                                    onClick={() => handleSelectActiveTeam(team)}
                                    className={`team-card ${team.id === selectedTeamId ? 'active' : ''}`}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        marginBottom: '12px',
                                        background: team.id === selectedTeamId ? 'var(--accent-bg)' : 'var(--bg)',
                                        border: team.id === selectedTeamId ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: '600', color: team.id === selectedTeamId ? 'var(--text-h)' : 'var(--text-p)' }}>{team.team_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{team.season} • {team.age_group}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div className="team-stats" style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                            <span style={{ color: '#22c55e' }}>{team.wins}W</span>
                                            <span style={{ color: '#ef4444' }}>{team.losses}L</span>
                                            <span style={{ color: '#94a3b8' }}>{team.ties}T</span>
                                        </div>
                                        {team.role === 'Head Coach' && (
                                            <button 
                                                onClick={(e) => startEditingTeam(team, e)} 
                                                className="btn-edit-team-pencil"
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Area: Roster/Details */}
                    <div 
                        className={`team-manager-main ${mobileActiveView === 'detail' ? 'mobile-visible' : 'mobile-hidden'}`}
                        style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}
                    >
                        
                        {/* Forms Overlay inside Main Area */}
                        {showTeamForm ? (
                            <TeamForm 
                                coachId={coachId}
                                editingTeam={editingTeam}
                                showAddForm={showTeamForm && !editingTeam}
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
                                onCreateTeam={handleCreateTeamSubmit}
                                onUpdateTeam={handleUpdateTeamSubmit}
                                onInviteSuccess={() => fetchTeams(coachId, selectedTeamId, onSelectTeam)}
                            />
                        ) : showPlayerForm ? (
                            <PlayerForm 
                                editingPlayer={editingPlayer}
                                showAddPlayerForm={showPlayerForm && !editingPlayer}
                                cancelForms={cancelForms}
                                teams={teams}
                                selectedTeamId={selectedTeamId}
                                onCreatePlayer={handleCreatePlayerSubmit}
                                onUpdatePlayer={handleUpdatePlayerSubmit}
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
                                reachedOnError={reachedOnError}
                                setReachedOnError={setReachedOnError}
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
                                eligiblePositions={eligiblePositions}
                                setEligiblePositions={setEligiblePositions}
                            />
                        ) : !selectedTeamId ? (
                            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                                <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                <h3>No active team workspace selected</h3>
                                <p>Select an existing team from the sidebar, or create a new team to get started.</p>
                            </div>
                        ) : (
                            // Roster Dashboard view
                            <>
                                {/* Workspace Header controls */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                    <div>
                                        <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-h)' }}>{activeTeam?.team_name} Roster</h1>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            Record: {activeTeam?.wins}W - {activeTeam?.losses}L - {activeTeam?.ties}T
                                        </p>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {userRole === 'Assistant Coach' ? (
                                            <div className="assistant-lock" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                <Lock size={13} /> Read-Only Mode (Assistant Coach)
                                            </div>
                                        ) : (
                                            <>
                                                {/* File Import Wrapper */}
                                                <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}>
                                                    <Upload size={14} /> Import GC Stats
                                                    <input 
                                                        type="file" 
                                                        accept=".csv" 
                                                        onChange={handleFileImport} 
                                                        style={{ display: 'none' }} 
                                                    />
                                                </label>
                                                
                                                <button onClick={() => setShowPlayerForm(true)} className="btn-add-player" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#000', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                                    <Plus size={14} /> Add Player
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Table Navigation Tabs */}
                                <div className="tabs-container" style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', paddingBottom: '1px', flexWrap: 'wrap' }}>
                                    {(['batting', 'pitching', 'fielding', 'catching', 'pitching_analytics', 'batting_analytics', 'fielding_analytics', 'defensive_rotation'] as const).map((view) => (
                                        <button
                                            key={view}
                                            onClick={() => setSubView(view)}
                                            className={`tab-btn ${subView === view ? 'active' : ''}`}
                                            style={{
                                                padding: '8px 16px',
                                                background: subView === view ? 'var(--card-bg)' : 'transparent',
                                                border: '1px solid transparent',
                                                borderBottomColor: subView === view ? 'transparent' : 'transparent',
                                                borderTopLeftRadius: '6px',
                                                borderTopRightRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: subView === view ? 'var(--accent)' : 'var(--text-secondary)',
                                                textTransform: 'capitalize'
                                            }}
                                        >
                                            {view.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>

                                {/* Active Subview Rendering */}
                                {isLoading && players.length === 0 ? (
                                    <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading roster data...</p>
                                ) : !hasPlayers ? (
                                    <div style={{ textAlign: 'center', padding: '48px', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                                        <Users size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                        <h3>No players on this roster</h3>
                                        {userRole === 'Head Coach' && <p>Click "Add Player" or "Import GC Stats" above to build your team.</p>}
                                    </div>
                                ) : subView === 'pitching_analytics' ? (
                                    <PitchingAnalyticsView 
                                        players={players} 
                                        selectedPitcherId={selectedPitcherId}
                                        onSelectPitcher={setSelectedPitcherId}
                                    />
                                ) : subView === 'batting_analytics' ? (
                                    <BattingAnalyticsView 
                                        players={players} 
                                        selectedBatterId={selectedBatterId} 
                                        onSelectBatter={setSelectedBatterId} 
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
                                    <RosterTableContainer 
                                        players={players}
                                        subView={subView}
                                        userRole={userRole}
                                        onEditPlayer={startEditingPlayer}
                                        onDeletePlayer={handleDeletePlayerClick}
                                    />
                                )}

                                {/* Invite Coach Interface (Only for Head Coaches) */}
                                {userRole === 'Head Coach' && !showTeamForm && !showPlayerForm && (
                                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                                        <InviteCoachForm 
                                            teamId={selectedTeamId} 
                                            coachId={coachId} 
                                            onInviteSuccess={() => fetchTeams(coachId, selectedTeamId, onSelectTeam)}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* GameChanger CSV Import Preview Modal */}
                {showImportModal && (
                    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 1100 }}>
                        <div className="team-manager-card" style={{ width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                            <div className="team-manager-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Users className="icon-sidebar" />
                                    <h2>GameChanger Stats Import Preview</h2>
                                </div>
                                <button onClick={() => setShowImportModal(false)} className="btn-close-modal"><X size={20} /></button>
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
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
                                                <th style={{ padding: '8px 10px' }}>ROE</th>
                                                <th style={{ padding: '8px 10px' }}>AVG</th>
                                                <th style={{ padding: '8px 10px' }}>OBP</th>
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
                                                
                                                // OBP = (Singles + Doubles + Triples + HR + BB + HBP) / (AB + BB + HBP)
                                                const obpDenom = p.at_bats + p.walks + p.hit_by_pitches;
                                                const obp = obpDenom > 0 
                                                    ? (h + p.walks + p.hit_by_pitches) / obpDenom 
                                                    : 0.000;
                                                
                                                const whole = Math.floor(p.innings_pitched);
                                                const fraction = Math.round((p.innings_pitched - whole) * 10) / 10;
                                                const actualIp = fraction === 0.1 ? whole + 0.333 : fraction === 0.2 ? whole + 0.667 : whole;
                                                const era = actualIp > 0 ? (p.earned_runs * 7) / actualIp : 0.00;

                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '8px 10px' }}>
                                                            {p.matched ? (
                                                                <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '4px', fontWeight: 'bold' }}>Matched</span>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontWeight: 'bold' }}>Unmatched</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '8px 10px', fontWeight: '600' }}>{p.player_name}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.player_number}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.games_played}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.at_bats}</td>
                                                        <td style={{ padding: '8px 10px' }}>{h}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.home_runs}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.reached_on_error || 0}</td>
                                                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{avg.toFixed(3)}</td>
                                                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{obp.toFixed(3)}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.innings_pitched.toFixed(1)}</td>
                                                        <td style={{ padding: '8px 10px' }}>{era.toFixed(2)}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.total_chances}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.errors}</td>
                                                        <td style={{ padding: '8px 10px' }}>{p.innings_caught.toFixed(1)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="team-manager-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--sidebar-bg)' }}>
                                <button onClick={() => setShowImportModal(false)} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px' }}>
                                    Cancel
                                </button>
                                <button onClick={handleConfirmImport} className="btn-confirm-import" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#000', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                    Confirm & Sync
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}