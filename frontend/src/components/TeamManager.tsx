import React, { useState, useEffect } from 'react';
import { Plus, Users, X, Trophy, Pencil, Trash2, TrendingUp } from 'lucide-react';

interface Team {
    id: number;
    team_name: string;
    season: string;
    wins: number;
    losses: number;
    ties: number;
    is_active: boolean;
    age_group: string;
    innings_per_game: number;
}

interface Player {
    id: number;
    team_id: number;
    player_name: string;
    player_number: number;
    batting_hand: string;
    throwing_hand: string;
    games_played: number;
    parent_player_id?: number | null;
    plate_appearances: number;
    at_bats: number;
    hits: number; // Derived
    singles: number;
    doubles: number;
    triples: number;
    home_runs: number;
    walks: number;
    strikeouts: number;
    hit_by_pitches: number;
    stolen_bases: number;
    caught_stealing: number;
    runs_scored: number;
    runs_batted_in: number;
    batting_average: number; // Derived
    on_base_percentage: number; // Derived
    created_at: string;
    updated_at: string;

    // Pitching stats
    games_pitched: number;
    games_started: number;
    innings_pitched: number;
    batters_faced: number;
    number_of_pitches: number;
    hits_allowed: number;
    runs_allowed: number;
    earned_runs: number;
    walks_allowed: number;
    strikeouts_thrown: number;
    hit_by_pitches_allowed: number;
    left_on_base: number;
    era: number; // Derived
    whip: number; // Derived

    // Fielding stats (NEW)
    total_chances: number;
    assists: number;
    putouts: number;
    errors: number;
    fielding_percentage: number; // Derived

    // Catching stats (NEW)
    innings_caught: number;
    passed_balls_allowed: number;
    runners_stolen_bases: number;
    runners_caught_stealing: number;
    caught_stealing_percentage: number; // Derived
}

const normalizeHand = (h: string | null | undefined, fallback = 'Right'): string => {
    if (!h) return fallback;
    const clean = h.trim().toLowerCase();
    if (clean === 'righty' || clean === 'right') return 'Right';
    if (clean === 'lefty' || clean === 'left') return 'Left';
    if (clean === 'switch') return 'Switch';
    return fallback;
};

interface TeamManagerProps {
    coachId: number;
    onClose: () => void;
    selectedTeamId: number | null;
    onSelectTeam: (team: Team) => void;
}

export default function TeamManager({ coachId, onClose, selectedTeamId, onSelectTeam }: TeamManagerProps) {
    const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Forms state toggles
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [subView, setSubView] = useState<'batting' | 'pitching' | 'fielding' | 'catching' | 'analytics'>('batting');
    const [selectedPitcherId, setSelectedPitcherId] = useState<number | null>(null);

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

    // Import state variables
    const [importPreview, setImportPreview] = useState<any[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);

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
            
            // Numerical sort for raw stats & derived stats
            const aNum = Number(aVal) || 0;
            const bNum = Number(bVal) || 0;
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        });
    }, [players, sortField, sortDirection, subView]);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/teams/${coachId}`);
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
            const response = await fetch(`${API_BASE}/api/players/${selectedTeamId}`);
            if (response.ok) {
                const data = await response.json();
                setPlayers(data);
            }
        } catch (err) {
            console.error("Error fetching roster:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, [coachId]);

    useEffect(() => {
        if (activeTab === 'players') {
            fetchPlayers();
        }
    }, [activeTab, selectedTeamId]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim()) return;
        try {
            const response = await fetch(`${API_BASE}/api/teams`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coach_id: coachId, team_name: teamName, season: season, age_group: ageGroup, innings_per_game: inningsPerGame })
            });
            if (response.ok) {
                setTeamName('');
                setShowAddForm(false);
                fetchTeams();
            }
        } catch (err) {
            console.error("Error creating team:", err);
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
        setInningsPerGame(team.innings_per_game || 7);
    };

    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeam || !teamName.trim()) return;
        try {
            const response = await fetch(`${API_BASE}/api/teams/${editingTeam.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coach_id: coachId, team_name: teamName, season: season, wins: wins, losses: losses, ties: ties, age_group: ageGroup, is_active: isActive, innings_per_game: inningsPerGame })
            });
            if (response.ok) {
                setEditingTeam(null);
                setTeamName('');
                fetchTeams();
            }
        } catch (err) {
            console.error("Error updating team:", err);
        }
    };

    const handleCreatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerName.trim() || !selectedTeamId) return;
        try {
            const response = await fetch(`${API_BASE}/api/players`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ team_id: selectedTeamId, player_name: playerName, player_number: playerNumber, batting_hand: battingHand, throwing_hand: throwingHand })
            });
            if (response.ok) {
                setPlayerName('');
                setPlayerNumber(0);
                setShowAddPlayerForm(false);
                fetchPlayers();
            }
        } catch (err) {
            console.error("Error creating player:", err);
        }
    };

    const startEditingPlayer = (player: Player) => {
        setEditingPlayer(player);
        setPlayerName(player.player_name);
        setPlayerNumber(player.player_number);
        setBattingHand(player.batting_hand || 'Right');
        setThrowingHand(player.throwing_hand || 'Right');
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
        setRunsScored(player.runs_scored || 0);
        setRbi(player.runs_batted_in || 0);

        // Load pitching stats
        setGamesPitched(player.games_pitched || 0);
        setGamesStarted(player.games_started || 0);
        setInningsPitched(player.innings_pitched || 0.0);
        setBattersFaced(player.batters_faced || 0);
        setNumberOfPitches(player.number_of_pitches || 0);
        setHitsAllowed(player.hits_allowed || 0);
        setRunsAllowed(player.runs_allowed || 0);
        setEarnedRuns(player.earned_runs || 0);
        setWalksAllowed(player.walks_allowed || 0);
        setStrikeoutsThrown(player.strikeouts_thrown || 0);
        setHitByPitchesAllowed(player.hit_by_pitches_allowed || 0);
        setLeftOnBase(player.left_on_base || 0);

        // Load fielding stats
        setTotalChances(player.total_chances || 0);
        setAssists(player.assists || 0);
        setPutouts(player.putouts || 0);
        setErrorsVal(player.errors || 0);

        // Load catching stats
        setInningsCaught(player.innings_caught || 0.0);
        setPassedBallsAllowed(player.passed_balls_allowed || 0);
        setRunnersStolenBases(player.runners_stolen_bases || 0);
        setRunnersCaughtStealing(player.runners_caught_stealing || 0);
    };

    const handleUpdatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlayer || !playerName.trim()) return;
        try {
            const response = await fetch(`${API_BASE}/api/players/${editingPlayer.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    player_name: playerName, player_number: playerNumber, batting_hand: battingHand, throwing_hand: throwingHand,
                    games_played: gp, plate_appearances: pa, at_bats: ab,
                    singles: singles, doubles: doubles, triples: triples, home_runs: hr,
                    walks: bb, strikeouts: k, hit_by_pitches: hbp,
                    stolen_bases: sb, caught_stealing: cs,
                    runs_scored: runsScored, runs_batted_in: rbi,
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
                    assists: assists,
                    putouts: putouts,
                    errors: errorsVal,
                    innings_caught: inningsCaught,
                    passed_balls_allowed: passedBallsAllowed,
                    runners_stolen_bases: runnersStolenBases,
                    runners_caught_stealing: runnersCaughtStealing
                })
            });
            if (response.ok) {
                setEditingPlayer(null);
                setPlayerName('');
                fetchPlayers();
            }
        } catch (err) {
            console.error("Error updating player:", err);
        }
    };

    const handleDeletePlayer = async (playerId: number) => {
        if (!window.confirm("Are you sure you want to remove this player from the team?")) return;
        try {
            const response = await fetch(`${API_BASE}/api/players/${playerId}`, { method: "DELETE" });
            if (response.ok) {
                fetchPlayers();
            }
        } catch (err) {
            console.error("Error deleting player:", err);
        }
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

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // 1. Lightweight CSV string parser
            const lines = text.split(/\r?\n/);
            if (lines.length < 2) return;

            const parseCSVLine = (line: string) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            // 2. Find the header line by scanning the first few lines for known stat columns (e.g. GP, PA, AB)
            let headerLineIdx = 0;
            for (let i = 0; i < Math.min(lines.length, 10); i++) {
                const parsed = parseCSVLine(lines[i]).map(h => h.replace(/"/g, '').replace(/\s+/g, '').trim().toUpperCase());
                if (parsed.includes("GP") || parsed.includes("PA") || parsed.includes("AB") || parsed.includes("GAMESPLAYED") || parsed.includes("ATBATS")) {
                    headerLineIdx = i;
                    break;
                }
            }

            const rawHeaders = parseCSVLine(lines[headerLineIdx]);
            
            // Find the index of the last batting column ('GITP') to ignore pitching/fielding duplicates
            let lastBattingColIdx = rawHeaders.findIndex(h => {
                const clean = h.replace(/"/g, '').trim().toUpperCase();
                return clean === 'GITP' || clean === 'BA';
            });
            
            // Fallback to column index 52 (Excel column BA) if 'GITP' isn't explicitly found
            if (lastBattingColIdx === -1) {
                lastBattingColIdx = 52;
            }

            // Slice raw headers and clean them by removing all whitespace/quotes and converting to uppercase
            const cleanHeader = (h: string) => h.replace(/"/g, '').replace(/\s+/g, '').trim().toUpperCase();
            
            // Slice headers into Batting (0 to BA) and Pitching (from BC / index 54 onwards)
            const battingHeaders = rawHeaders.slice(0, lastBattingColIdx + 1).map(cleanHeader);
            const pitchingHeaders = rawHeaders.slice(54).map(cleanHeader);

            const parsedPlayers: any[] = [];
            
            for (let i = headerLineIdx + 1; i < lines.length; i++){
                if (!lines[i].trim()) continue;
                const rawValues = parseCSVLine(lines[i]);
                
                // Slice values to align with the split headers
                const battingValues = rawValues.slice(0, lastBattingColIdx + 1);
                const pitchingValues = rawValues.slice(54);

                // Helper for Batting search
                const getBattingVal = (colNames: string[], defaultVal = 0) => {
                    const idx = battingHeaders.findIndex(h => colNames.includes(h));
                    if (idx === -1 || !battingValues[idx]) return defaultVal;
                    return parseInt(battingValues[idx].replace(/"/g, '')) || defaultVal;
                };

                const getStr = (colNames: string[]) => {
                    const idx = battingHeaders.findIndex(h => colNames.includes(h));
                    if (idx === -1 || !battingValues[idx]) return '';
                    return battingValues[idx].replace(/"/g, '').trim();
                };

                // Helpers for Pitching search
                const getPitchingVal = (colNames: string[], defaultVal = 0) => {
                    const idx = pitchingHeaders.findIndex(h => colNames.includes(h));
                    if (idx === -1 || !pitchingValues[idx]) return defaultVal;
                    return parseInt(pitchingValues[idx].replace(/"/g, '')) || defaultVal;
                };

                const getPitchingValFloat = (colNames: string[], defaultVal = 0.0) => {
                    const idx = pitchingHeaders.findIndex(h => colNames.includes(h));
                    if (idx === -1 || !pitchingValues[idx]) return defaultVal;
                    return parseFloat(pitchingValues[idx].replace(/"/g, '')) || defaultVal;
                };

                // Unified lookup helper checking both batting and pitching columns for new stats
                const getVal = (colNames: string[], defaultVal = 0) => {
                    let idx = battingHeaders.findIndex(h => colNames.includes(h));
                    if (idx !== -1 && battingValues[idx]) return parseInt(battingValues[idx].replace(/"/g, '')) || defaultVal;
                    
                    idx = pitchingHeaders.findIndex(h => colNames.includes(h));
                    if (idx !== -1 && pitchingValues[idx]) return parseInt(pitchingValues[idx].replace(/"/g, '')) || defaultVal;
                    return defaultVal;
                };

                const getValFloat = (colNames: string[], defaultVal = 0.0) => {
                    let idx = battingHeaders.findIndex(h => colNames.includes(h));
                    if (idx !== -1 && battingValues[idx]) return parseFloat(battingValues[idx].replace(/"/g, '')) || defaultVal;
                    
                    idx = pitchingHeaders.findIndex(h => colNames.includes(h));
                    if (idx !== -1 && pitchingValues[idx]) return parseFloat(pitchingValues[idx].replace(/"/g, '')) || defaultVal;
                    return defaultVal;
                };

                // Search terms are normalized (no whitespace, uppercase)
                const playerNum = getBattingVal(["#", "JERSEY", "JERSEY#", "JERSEYNUMBER", "NUMBER", "NO", "NO.", "PLAYERNUMBER", "NUM", "JERSEYNO", "JERSEYNO.", "PLAYERNO", "PLAYERNO.", "NUMBER#"]);
                
                // Extract and combine first and last name, or fallback to full name/player column
                const first = getStr(["FIRST", "FIRSTNAME", "PLAYER", "PLAYERNAME", "NAME"]);
                const last = getStr(["LAST", "LASTNAME"]);
                const playerName = last ? `${first} ${last}` : first;

                // If we have no jersey number and no name, skip the row
                if (playerNum === 0 && !playerName) continue;

                // Match with existing roster by Jersey Number ONLY
                const existing = players.find(r => playerNum > 0 && r.player_number === playerNum);

                parsedPlayers.push({
                    matched: !!existing,
                    existing_id: existing?.id,
                    player_name: existing?.player_name || playerName || `Player #${playerNum}`,
                    player_number: existing?.player_number || playerNum,
                    batting_hand: existing ? normalizeHand(existing.batting_hand, 'Right') : 'Right',
                    throwing_hand: existing ? normalizeHand(existing.throwing_hand, 'Right') : 'Right',

                    // Batting stats mapping
                    games_played: getBattingVal(["GP", "G", "GAMES", "GAMESPLAYED"]),
                    plate_appearances: getBattingVal(["PA", "PLATEAPPEARANCES"]),
                    at_bats: getBattingVal(["AB", "ATBATS"]),
                    singles: getBattingVal(["1B", "SINGLES", "SINGLE"]),
                    doubles: getBattingVal(["2B", "DOUBLES", "DOUBLE"]),
                    triples: getBattingVal(["3B", "TRIPLES", "TRIPLE"]),
                    home_runs: getBattingVal(["HR", "HOMERUNS", "HOMERUN"]),
                    walks: getBattingVal(["BB", "WALKS", "WALK", "BASEONBALLS"]),
                    strikeouts: getBattingVal(["SO", "STRIKEOUTS", "K", "STRIKEOUT"]),
                    hit_by_pitches: getBattingVal(["HBP", "HITBYPITCH", "HITBYPITCHES"]),
                    stolen_bases: getBattingVal(["SB", "STOLENBASES"]),
                    caught_stealing: getBattingVal(["CS", "CAUGHTSTEALING"]),
                    runs_scored: getBattingVal(["R", "RUNS", "RUNSSCORED"]),
                    runs_batted_in: getBattingVal(["RBI", "RBIS", "RUNSBATTEDIN"]),

                    // Pitching stats mapping (from column BC / index 54 onwards)
                    games_pitched: getPitchingVal(["GP", "G", "GAMES", "GAMESPITCHED"]),
                    games_started: getPitchingVal(["GS", "GAMESSTARTED", "STARTED"]),
                    innings_pitched: getPitchingValFloat(["IP", "INNINGSPITCHED"]),
                    batters_faced: getPitchingVal(["BF", "BATTERSFACED"]),
                    number_of_pitches: getPitchingVal(["#P", "PITCHES", "NP", "NUMBEROFPITCHES"]),
                    hits_allowed: getPitchingVal(["H", "HITS", "HITSALLOWED"]),
                    runs_allowed: getPitchingVal(["R", "RUNS", "RUNSALLOWED"]),
                    earned_runs: getPitchingVal(["ER", "EARNEDRUNS"]),
                    walks_allowed: getPitchingVal(["BB", "WALKS", "BASEONBALLS", "WALKSALLOWED"]),
                    strikeouts_thrown: getPitchingVal(["SO", "STRIKEOUTS", "K", "STRIKEOUTSTHROWN"]),
                    hit_by_pitches_allowed: getPitchingVal(["HBP", "HITBYPITCH", "HITBYPITCHES"]),
                    left_on_base: getPitchingVal(["LOB", "LEFTONBASE"]),

                    // Fielding stats mapping (from CSV)
                    total_chances: getVal(["TC", "TOTALCHANCES", "CHANCES"]),
                    assists: getVal(["A", "ASSISTS", "ASSIST"]),
                    putouts: getVal(["PO", "PUTOUTS", "PUTOUT"]),
                    errors: getVal(["E", "ERRORS", "ERROR"]),

                    // Catching stats mapping (from CSV)
                    innings_caught: getValFloat(["IC", "INNINGSCAUGHT"]),
                    passed_balls_allowed: getVal(["PB", "PASSEDBALLS", "PASSEDBALL"]),
                    runners_stolen_bases: getVal(["SBA", "RUNNERSSTOLENBASES", "SBAAGAINST"]),
                    runners_caught_stealing: getVal(["CS", "RUNNERSCAUGHTSTEALING", "CSAGAINST"])
                });
            }
            
            setImportPreview(parsedPlayers);
            setShowImportModal(true);

            // Reset file input value so same file can be selected again
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = async () => {
        if (!selectedTeamId || importPreview.length === 0) return;
        
        // Only send matched players to bulk update
        const matchedUpdates = importPreview.filter(p => p.matched);
        if (matchedUpdates.length === 0) {
            alert("No matched players found to update.");
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/api/players/bulk-update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    team_id: selectedTeamId,
                    players: matchedUpdates
                })
            });
            if (response.ok) {
                setShowImportModal(false);
                fetchPlayers();
                alert("Roster statistics successfully synced with GameChanger!");
            } else {
                alert("Failed to update statistics.");
            }
        } catch (err) {
            console.error("Error bulk updating stats:", err);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="team-manager-card" style={{ width: activeTab === 'players' ? (subView === 'batting' ? '1050px' : '1180px') : '550px', transition: 'width 0.2s ease-out' }}>
                <div className="team-manager-header">
                    <div className="title-area">
                        <Users className="icon-sidebar" />
                        <h2>Team Workspace Manager</h2>
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
                    showAddForm ? (
                        <form onSubmit={handleCreateTeam} className="add-team-form">
                            <h3>Create New Team</h3>
                            <div className="input-group">
                                <label>Team Name</label>
                                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Lady Hawks" required />
                            </div>
                            <div className="form-row-double" style={{ display: 'flex', gap: '12px' }}>
                                <div className="input-group" style={{ flex: 1 }}><label>Season</label><input type="text" value={season} onChange={(e) => setSeason(e.target.value)} required /></div>
                                <div className="input-group" style={{ flex: 1 }}><label>Age Group</label><select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}><option value="8U Division">8U Division</option><option value="10U Division">10U Division</option><option value="12U Division">12U Division</option><option value="14U Division">14U Division</option></select></div>
                            </div>
                            <div className="input-group">
                                <label>Innings Per Game (Game Length)</label>
                                <select value={inningsPerGame} onChange={(e) => setInningsPerGame(parseInt(e.target.value) || 7)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}>
                                    <option value="5">5 Innings</option>
                                    <option value="6">6 Innings</option>
                                    <option value="7">7 Innings</option>
                                </select>
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Team</button>
                                <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    ) : editingTeam ? (
                        <form onSubmit={handleUpdateTeam} className="add-team-form">
                            <h3>Edit Team Details</h3>
                            <div className="input-group"><label>Team Name</label><input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} required /></div>
                            <div className="form-row-double" style={{ display: 'flex', gap: '12px' }}>
                                <div className="input-group" style={{ flex: 1 }}><label>Season</label><input type="text" value={season} onChange={(e) => setSeason(e.target.value)} required /></div>
                                <div className="input-group" style={{ flex: 1 }}><label>Age Group</label><select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}><option value="8U Division">8U Division</option><option value="10U Division">10U Division</option><option value="12U Division">12U Division</option><option value="14U Division">14U Division</option></select></div>
                            </div>
                            <div className="stats-row" style={{ display: 'flex', gap: '12px' }}>
                                <div className="input-group" style={{ flex: 1 }}><label style={{ color: '#22c55e' }}>Wins</label><input type="number" min="0" value={wins} onChange={(e) => setWins(parseInt(e.target.value) || 0)} required /></div>
                                <div className="input-group" style={{ flex: 1 }}><label style={{ color: '#ef4444' }}>Losses</label><input type="number" min="0" value={losses} onChange={(e) => setLosses(parseInt(e.target.value) || 0)} required /></div>
                                <div className="input-group" style={{ flex: 1 }}><label style={{ color: '#94a3b8' }}>Ties</label><input type="number" min="0" value={ties} onChange={(e) => setTies(parseInt(e.target.value) || 0)} required /></div>
                            </div>
                            <div className="input-group">
                                <label>Innings Per Game (Game Length)</label>
                                <select value={inningsPerGame} onChange={(e) => setInningsPerGame(parseInt(e.target.value) || 7)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}>
                                    <option value="5">5 Innings</option>
                                    <option value="6">6 Innings</option>
                                    <option value="7">7 Innings</option>
                                </select>
                            </div>
                            <div className="active-checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" id="active-checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} /><label htmlFor="active-checkbox" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>Active Team this Season</label></div>
                            <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}><button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Changes</button><button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button></div>
                        </form>
                    ) : (
                        <div className="teams-list-area">
                            <div className="list-subheader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text)' }}>Select or edit a team below</span>
                                <button onClick={() => setShowAddForm(true)} className="btn-add-team">
                                    <Plus size={16} /> Add Team
                                </button>
                            </div>
                            <div className="teams-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', padding: '4px' }}>
                                {teams.filter(t => t.is_active).map((t) => (
                                    <div key={t.id} onClick={() => onSelectTeam(t)} className={`team-card ${t.id === selectedTeamId ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '8px', border: t.id === selectedTeamId ? '2px solid var(--accent)' : '1px solid var(--border)', background: t.id === selectedTeamId ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer' }}>
                                        <div className="team-card-info" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><Trophy style={{ color: t.id === selectedTeamId ? 'var(--accent)' : 'var(--text)' }} size={20} /><div><h4 style={{ margin: 0, color: 'var(--text-h)', fontWeight: '600' }}>{t.team_name}</h4><span style={{ fontSize: '12px', color: 'var(--text)' }}>{t.season} • {t.age_group}</span></div></div>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}><div className="team-stats" style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}><span style={{ color: '#22c55e' }}>{t.wins}W</span><span style={{ color: '#ef4444' }}>{t.losses}L</span><span style={{ color: '#94a3b8' }}>{t.ties}T</span></div><button onClick={(e) => startEditingTeam(t, e)} className="btn-edit-team-pencil" style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}><Pencil size={15} /></button></div>
                                    </div>
                                ))}
                                
                                {teams.some(t => !t.is_active) && (
                                    <>
                                        <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '8px 0' }} />
                                        <span style={{ fontSize: '12px', color: 'var(--text)', textAlign: 'left', fontWeight: 'bold' }}>Archived / Inactive Teams</span>
                                        {teams.filter(t => !t.is_active).map((t) => (
                                            <div key={t.id} onClick={() => onSelectTeam(t)} className={`team-card inactive ${t.id === selectedTeamId ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', border: t.id === selectedTeamId ? '2px solid var(--accent)' : '1px solid var(--border)', background: t.id === selectedTeamId ? 'var(--accent-bg)' : 'rgba(0,0,0,0.1)', opacity: t.id === selectedTeamId ? 1 : 0.6, cursor: 'pointer' }}>
                                                <div className="team-card-info" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><Users style={{ color: t.id === selectedTeamId ? 'var(--accent)' : 'var(--text)' }} size={20} /><div><h4 style={{ margin: 0, color: 'var(--text-h)', fontWeight: t.id === selectedTeamId ? '600' : '500' }}>{t.team_name}</h4><span style={{ fontSize: '11px', color: 'var(--text)' }}>{t.season} • {t.age_group}</span></div></div>
                                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}><div className="team-stats" style={{ display: 'flex', gap: '8px', fontSize: '12px', fontWeight: t.id === selectedTeamId ? 'bold' : 'normal' }}><span style={{ color: t.id === selectedTeamId ? '#22c55e' : 'inherit' }}>{t.wins}W</span><span style={{ color: t.id === selectedTeamId ? '#ef4444' : 'inherit' }}>{t.losses}L</span><span style={{ color: t.id === selectedTeamId ? '#94a3b8' : 'inherit' }}>{t.ties}T</span></div><button onClick={(e) => startEditingTeam(t, e)} className="btn-edit-team-pencil" style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}><Pencil size={15} /></button></div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    )
                ) : (
                    /* ROSTER VIEW TAB */
                    showAddPlayerForm ? (
                        <form onSubmit={handleCreatePlayer} className="add-team-form">
                            <h3>Add Player to {teams.find(t => t.id === selectedTeamId)?.team_name || 'Roster'}</h3>
                            <div className="input-group">
                                <label>Player Name</label>
                                <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Sarah Jenkins" required />
                            </div>
                            <div className="form-row-double" style={{ display: 'flex', gap: '12px' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Jersey Number</label>
                                    <input type="number" min="0" max="99" value={playerNumber} onChange={(e) => setPlayerNumber(parseInt(e.target.value) || 0)} required />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Bats</label>
                                    <select value={battingHand} onChange={(e) => setBattingHand(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}>
                                        <option value="Right">Right</option>
                                        <option value="Left">Left</option>
                                        <option value="Switch">Switch</option>
                                    </select>
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Throws</label>
                                    <select value={throwingHand} onChange={(e) => setThrowingHand(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}>
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
                    ) : editingPlayer ? (
                        <form onSubmit={handleUpdatePlayer} className="add-team-form" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '8px' }}>
                            <h3>Edit Player & Stats</h3>
                            <div className="form-row-double" style={{ display: 'flex', gap: '12px' }}>
                                <div className="input-group" style={{ flex: 2 }}><label>Player Name</label><input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} required /></div>
                                <div className="input-group" style={{ flex: 1 }}><label>Number</label><input type="number" value={playerNumber} onChange={(e) => setPlayerNumber(parseInt(e.target.value) || 0)} required /></div>
                                <div className="input-group" style={{ flex: 1 }}><label>Bats</label><select value={battingHand} onChange={(e) => setBattingHand(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}><option value="Right">Right</option><option value="Left">Left</option><option value="Switch">Switch</option></select></div>
                                <div className="input-group" style={{ flex: 1 }}><label>Throws</label><select value={throwingHand} onChange={(e) => setThrowingHand(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}><option value="Right">Right</option><option value="Left">Left</option></select></div>
                            </div>
                            
                            {/* Batting Statistics section */}
                            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '4px', textAlign: 'left' }}>Batting Statistics</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                <div className="input-group"><label>Games (GP)</label><input type="number" value={gp} onChange={(e) => setGp(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Plate App. (PA)</label><input type="number" value={pa} onChange={(e) => setPa(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>At Bats (AB)</label><input type="number" value={ab} onChange={(e) => setAb(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Runs Scored (R)</label><input type="number" value={runsScored} onChange={(e) => setRunsScored(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Runs Batted In (RBI)</label><input type="number" value={rbi} onChange={(e) => setRbi(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Singles (1B)</label><input type="number" value={singles} onChange={(e) => setSingles(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Doubles (2B)</label><input type="number" value={doubles} onChange={(e) => setDoubles(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Triples (3B)</label><input type="number" value={triples} onChange={(e) => setTriples(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Home Runs (HR)</label><input type="number" value={hr} onChange={(e) => setHr(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Walks (BB)</label><input type="number" value={bb} onChange={(e) => setBb(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Strikeouts (K)</label><input type="number" value={k} onChange={(e) => setK(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Hit By Pitch (HBP)</label><input type="number" value={hbp} onChange={(e) => setHbp(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Stolen Bases (SB)</label><input type="number" value={sb} onChange={(e) => setSb(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Caught Stealing</label><input type="number" value={cs} onChange={(e) => setCs(parseInt(e.target.value) || 0)} /></div>
                            </div>

                            {/* Pitching Statistics section */}
                            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '4px', textAlign: 'left' }}>Pitching Statistics</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                <div className="input-group"><label>Games Pitched (GP)</label><input type="number" min="0" value={gamesPitched} onChange={(e) => setGamesPitched(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Innings Pitched (IP)</label><input type="number" step="0.1" min="0" value={inningsPitched} onChange={(e) => setInningsPitched(parseFloat(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Games Started (GS)</label><input type="number" min="0" value={gamesStarted} onChange={(e) => setGamesStarted(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Batters Faced (BF)</label><input type="number" min="0" value={battersFaced} onChange={(e) => setBattersFaced(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Pitches (#P)</label><input type="number" min="0" value={numberOfPitches} onChange={(e) => setNumberOfPitches(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Hits Allowed (H)</label><input type="number" min="0" value={hitsAllowed} onChange={(e) => setHitsAllowed(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Runs Allowed (R)</label><input type="number" min="0" value={runsAllowed} onChange={(e) => setRunsAllowed(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Earned Runs (ER)</label><input type="number" min="0" value={earnedRuns} onChange={(e) => setEarnedRuns(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Walks Allowed (BB)</label><input type="number" min="0" value={walksAllowed} onChange={(e) => setWalksAllowed(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Strikeouts Thrown (SO)</label><input type="number" min="0" value={strikeoutsThrown} onChange={(e) => setStrikeoutsThrown(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>HBP Allowed</label><input type="number" min="0" value={hitByPitchesAllowed} onChange={(e) => setHitByPitchesAllowed(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Left on Base (LOB)</label><input type="number" min="0" value={leftOnBase} onChange={(e) => setLeftOnBase(parseInt(e.target.value) || 0)} /></div>
                            </div>

                            {/* Fielding Statistics Section */}
                            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '4px', textAlign: 'left' }}>Fielding Statistics</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                <div className="input-group"><label>Total Chances (TC)</label><input type="number" min="0" value={totalChances} onChange={(e) => setTotalChances(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Putouts (PO)</label><input type="number" min="0" value={putouts} onChange={(e) => setPutouts(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Assists (A)</label><input type="number" min="0" value={assists} onChange={(e) => setAssists(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Errors (E)</label><input type="number" min="0" value={errorsVal} onChange={(e) => setErrorsVal(parseInt(e.target.value) || 0)} /></div>
                            </div>

                            {/* Catching Statistics Section */}
                            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '4px', textAlign: 'left' }}>Catching Statistics</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                <div className="input-group"><label>Innings Caught (IC)</label><input type="number" step="0.1" min="0" value={inningsCaught} onChange={(e) => setInningsCaught(parseFloat(e.target.value) || 0.0)} /></div>
                                <div className="input-group"><label>Passed Balls (PB)</label><input type="number" min="0" value={passedBallsAllowed} onChange={(e) => setPassedBallsAllowed(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>SB Allowed (SBA)</label><input type="number" min="0" value={runnersStolenBases} onChange={(e) => setRunnersStolenBases(parseInt(e.target.value) || 0)} /></div>
                                <div className="input-group"><label>Caught Stealing (CS)</label><input type="number" min="0" value={runnersCaughtStealing} onChange={(e) => setRunnersCaughtStealing(parseInt(e.target.value) || 0)} /></div>
                            </div>
                            
                            <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Stats</button>
                                <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
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
                                            style={{ 
                                                padding: '4px 10px', 
                                                background: subView === 'batting' ? 'var(--accent-bg)' : 'transparent', 
                                                border: '1px solid ' + (subView === 'batting' ? 'var(--accent)' : 'var(--border)'),
                                                color: subView === 'batting' ? 'var(--accent)' : 'var(--text)', 
                                                cursor: 'pointer', 
                                                borderRadius: '6px', 
                                                fontSize: '12px',
                                                fontWeight: 'bold' 
                                            }}
                                        >
                                            Batting
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('pitching'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'pitching' ? 'active' : ''}`}
                                            style={{ 
                                                padding: '4px 10px', 
                                                background: subView === 'pitching' ? 'var(--accent-bg)' : 'transparent', 
                                                border: '1px solid ' + (subView === 'pitching' ? 'var(--accent)' : 'var(--border)'),
                                                color: subView === 'pitching' ? 'var(--accent)' : 'var(--text)', 
                                                cursor: 'pointer', 
                                                borderRadius: '6px', 
                                                fontSize: '12px',
                                                fontWeight: 'bold' 
                                            }}
                                        >
                                            Pitching
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('fielding'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'fielding' ? 'active' : ''}`}
                                            style={{ 
                                                padding: '4px 10px', 
                                                background: subView === 'fielding' ? 'var(--accent-bg)' : 'transparent', 
                                                border: '1px solid ' + (subView === 'fielding' ? 'var(--accent)' : 'var(--border)'),
                                                color: subView === 'fielding' ? 'var(--accent)' : 'var(--text)', 
                                                cursor: 'pointer', 
                                                borderRadius: '6px', 
                                                fontSize: '12px',
                                                fontWeight: 'bold' 
                                            }}
                                        >
                                            Fielding
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('catching'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'catching' ? 'active' : ''}`}
                                            style={{ 
                                                padding: '4px 10px', 
                                                background: subView === 'catching' ? 'var(--accent-bg)' : 'transparent', 
                                                border: '1px solid ' + (subView === 'catching' ? 'var(--accent)' : 'var(--border)'),
                                                color: subView === 'catching' ? 'var(--accent)' : 'var(--text)', 
                                                cursor: 'pointer', 
                                                borderRadius: '6px', 
                                                fontSize: '12px',
                                                fontWeight: 'bold' 
                                            }}
                                        >
                                            Catching
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSubView('analytics'); setSortField(null); }} 
                                            className={`tab-btn ${subView === 'analytics' ? 'active' : ''}`}
                                            style={{ 
                                                padding: '4px 10px', 
                                                background: subView === 'analytics' ? 'var(--accent-bg)' : 'transparent', 
                                                border: '1px solid ' + (subView === 'analytics' ? 'var(--accent)' : 'var(--border)'),
                                                color: subView === 'analytics' ? 'var(--accent)' : 'var(--text)', 
                                                cursor: 'pointer', 
                                                borderRadius: '6px', 
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <TrendingUp size={12} /> Analytics
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <label className="btn-guest" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', padding: '8px 12px' }}>
                                        <Plus size={14} /> Import GC Stats
                                        <input type="file" accept=".csv" onChange={handleFileImport} style={{ display: 'none' }} />
                                    </label>
                                    <button onClick={() => setShowAddPlayerForm(true)} className="btn-add-team">
                                        <Plus size={16} /> Add Player
                                    </button>
                                </div>
                            </div>

                            {loading && players.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center' }}>Loading players...</div>
                            ) : players.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text)' }}>
                                    📋 No players added to the roster yet. Add your first player!
                                </div>
                            ) : subView === 'analytics' ? (
                                <PitchingAnalyticsView 
                                    players={players} 
                                    selectedPitcherId={selectedPitcherId} 
                                    onSelectPitcher={setSelectedPitcherId} 
                                    inningsPerGame={teams.find(t => t.id === selectedTeamId)?.innings_per_game || 7}
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
                                                        <th onClick={() => handleSort('games_played')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                            GP {sortField === 'games_played' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                        </th>
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
                                                <th style={{ padding: '10px 12px', textAlign: 'center', userSelect: 'none' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedPlayers.map((p) => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{p.player_number}</td>
                                                    <td style={{ padding: '10px 12px', color: 'var(--text-h)', fontWeight: '500' }}>{p.player_name}</td>
                                                    <td style={{ padding: '10px 12px' }}>{normalizeHand(p.batting_hand, 'Right')[0]}</td>
                                                    <td style={{ padding: '10px 12px' }}>{normalizeHand(p.throwing_hand, 'Right')[0]}</td>
                                                    {subView === 'batting' ? (
                                                        <>
                                                            <td style={{ padding: '10px 12px' }}>{p.games_played}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.plate_appearances}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.at_bats}</td>
                                                            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{p.hits}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.walks}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.strikeouts}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.runs_scored}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.runs_batted_in}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.stolen_bases}</td>
                                                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                                                {p.batting_average.toFixed(3).replace(/^0+/, '')}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                                                {p.on_base_percentage.toFixed(3).replace(/^0+/, '')}
                                                            </td>
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
                                                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                                                {p.era.toFixed(2)}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                                                {p.whip.toFixed(2)}
                                                            </td>
                                                            <td style={{ padding: '10px 12px' }}>{p.left_on_base}</td>
                                                        </>
                                                    ) : subView === 'fielding' ? (
                                                        <>
                                                            <td style={{ padding: '10px 12px' }}>{p.games_played}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.total_chances}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.putouts}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.assists}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.errors}</td>
                                                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                                                {(p.fielding_percentage || 0).toFixed(3)}
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td style={{ padding: '10px 12px' }}>{p.games_played}</td>
                                                            <td style={{ padding: '10px 12px' }}>{(p.innings_caught || 0).toFixed(1)}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.passed_balls_allowed}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.runners_stolen_bases}</td>
                                                            <td style={{ padding: '10px 12px' }}>{p.runners_caught_stealing}</td>
                                                            <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                                                {(p.caught_stealing_percentage || 0).toFixed(3)}
                                                            </td>
                                                        </>
                                                    )}
                                                    <td style={{ padding: '10px 12px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                        <button onClick={() => startEditingPlayer(p)} className="btn-edit-team-pencil" style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}>
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeletePlayer(p.id)} className="btn-delete-player" style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}>
                                                            <Trash2 size={14} style={{ color: '#ef4444' }} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                )}
                {/* GameChanger Import Review Modal */}
                {showImportModal && (
                    <div className="modal-overlay" style={{ zIndex: 1100 }}>
                        <div className="team-manager-card" style={{ width: '680px', maxHeight: '80%', display: 'flex', flexDirection: 'column' }}>
                            <div className="team-manager-header">
                                <h3>Review Imported GameChanger Stats</h3>
                                <button onClick={() => setShowImportModal(false)} className="btn-close-modal"><X size={18} /></button>
                            </div>
                            
                            <p style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text)' }}>
                                Match results from GC spreadsheet. Only matched players will have their statistics updated.
                            </p>

                            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px', padding: '8px' }}>
                                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                            <th style={{ padding: '8px' }}>Match</th>
                                            <th style={{ padding: '8px' }}>#</th>
                                            <th style={{ padding: '8px' }}>Player Name</th>
                                            <th style={{ padding: '8px' }}>PA</th>
                                            <th style={{ padding: '8px' }}>AB</th>
                                            <th style={{ padding: '8px' }}>H</th>
                                            <th style={{ padding: '8px' }}>R</th>
                                            <th style={{ padding: '8px' }}>RBI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importPreview.map((p, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)', opacity: p.matched ? 1 : 0.5 }}>
                                                <td style={{ padding: '8px', color: p.matched ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                                                    {p.matched ? '✓ Matched' : '✗ No Match'}
                                                </td>
                                                <td style={{ padding: '8px', fontWeight: 'bold' }}>{p.player_number}</td>
                                                <td style={{ padding: '8px' }}>{p.player_name}</td>
                                                <td style={{ padding: '8px' }}>{p.plate_appearances}</td>
                                                <td style={{ padding: '8px' }}>{p.at_bats}</td>
                                                <td style={{ padding: '8px', fontWeight: 'bold' }}>
                                                    {p.singles + p.doubles + p.triples + p.home_runs}
                                                </td>
                                                <td style={{ padding: '8px' }}>{p.runs_scored}</td>
                                                <td style={{ padding: '8px' }}>{p.runs_batted_in}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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

interface PitchingStats {
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

export function PitchingAnalyticsView({ 
    players, 
    selectedPitcherId, 
    onSelectPitcher,
    inningsPerGame = 7
}: { 
    players: any[]; 
    selectedPitcherId: number | null; 
    onSelectPitcher: (id: number) => void;
    inningsPerGame?: number;
}) {
    const pitchers: PitchingStats[] = players.filter(p => p.games_pitched > 0 && p.number_of_pitches > 0);
    const [hoveredPitcherId, setHoveredPitcherId] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (pitchers.length > 0 && selectedPitcherId === null) {
            onSelectPitcher(pitchers[0].id);
        }
    }, [pitchers, selectedPitcherId]);

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
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', padding: '16px 8px', background: 'var(--card-bg)', borderRadius: '12px' }}>
            
            {/* 1. Left Section: Pitcher Comparison Scatter Plot */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text)', fontWeight: 'bold', alignSelf: 'flex-start' }}>
                    Staff Efficiency vs. Effectiveness Matrix
                </h4>
                
                <svg width={plotW} height={plotH} style={{ overflow: 'visible' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'center' }}>
                    {/* Radar Chart Display */}
                    <svg width="260" height="260" style={{ overflow: 'visible' }}>
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