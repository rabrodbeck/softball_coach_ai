import React, { useState, useEffect } from 'react';
import { Plus, Users, X, Trophy, Pencil, Trash2 } from 'lucide-react';

interface Team {
    id: number;
    team_name: string;
    season: string;
    wins: number;
    losses: number;
    ties: number;
    is_active: boolean;
    age_group: string;
}

interface Player {
    id: number;
    team_id: number;
    player_name: string;
    player_number: number;
    handedness: string;
    games_played: number;
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
}

interface TeamManagerProps {
    coachId: number;
    onClose: () => void;
    selectedTeamId: number | null;
    onSelectTeam: (team: Team) => void;
}

export default function TeamManager({ coachId, onClose, selectedTeamId, onSelectTeam }: TeamManagerProps) {
    const [activeTab, setActiveTab] = useState<'teams' | 'roster'>('teams');
    const [teams, setTeams] = useState<Team[]>([]);
    const [roster, setRoster] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Forms state toggles
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

    // Team form inputs
    const [teamName, setTeamName] = useState('');
    const [season, setSeason] = useState('Spring 2026');
    const [ageGroup, setAgeGroup] = useState('12U Division');
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [ties, setTies] = useState(0);
    const [isActive, setIsActive] = useState(false);

    // Player form inputs
    const [playerName, setPlayerName] = useState('');
    const [playerNumber, setPlayerNumber] = useState(0);
    const [handedness, setHandedness] = useState('Righty');
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

    // Import state variables
    const [importPreview, setImportPreview] = useState<any[]>([])
    const [showImportModal, setShowImportModal] = useState(false)

    // Sorting State
    const [sortField, setSortField] = useState<keyof Player | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const handleSort = (field: keyof Player) => {
        if (sortField === field) {
            // Toggle direction if clicking the same field
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Default to descending order on first click of a new column
            setSortField(field);
            setSortDirection('desc');
        }
    };
    // Derived sorted roster list
    const sortedRoster = React.useMemo(() => {
        if (!sortField) return roster;
        return [...roster].sort((a, b) => {
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
    }, [roster, sortField, sortDirection]);
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

    const fetchRoster = async () => {
        if (!selectedTeamId) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/roster/${selectedTeamId}`);
            if (response.ok) {
                const data = await response.json();
                setRoster(data);
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
        if (activeTab === 'roster') {
            fetchRoster();
        }
    }, [activeTab, selectedTeamId]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim()) return;
        try {
            const response = await fetch(`${API_BASE}/api/teams`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coach_id: coachId, team_name: teamName, season: season, age_group: ageGroup })
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
    };

    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeam || !teamName.trim()) return;
        try {
            const response = await fetch(`${API_BASE}/api/teams/${editingTeam.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coach_id: coachId, team_name: teamName, season: season, wins: wins, losses: losses, ties: ties, age_group: ageGroup, is_active: isActive })
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
            const response = await fetch(`${API_BASE}/api/roster`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ team_id: selectedTeamId, player_name: playerName, player_number: playerNumber, handedness: handedness })
            });
            if (response.ok) {
                setPlayerName('');
                setPlayerNumber(0);
                setShowAddPlayerForm(false);
                fetchRoster();
            }
        } catch (err) {
            console.error("Error creating player:", err);
        }
    };

    const startEditingPlayer = (player: Player) => {
        setEditingPlayer(player);
        setPlayerName(player.player_name);
        setPlayerNumber(player.player_number);
        setHandedness(player.handedness);
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
    };

    const handleUpdatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlayer || !playerName.trim()) return;
        try {
            const response = await fetch(`${API_BASE}/api/roster/${editingPlayer.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    player_name: playerName, player_number: playerNumber, handedness: handedness,
                    games_played: gp, plate_appearances: pa, at_bats: ab,
                    singles: singles, doubles: doubles, triples: triples, home_runs: hr,
                    walks: bb, strikeouts: k, hit_by_pitches: hbp,
                    stolen_bases: sb, caught_stealing: cs,
                    runs_scored: runsScored, runs_batted_in: rbi
                })
            });
            if (response.ok) {
                setEditingPlayer(null);
                setPlayerName('');
                fetchRoster();
            }
        } catch (err) {
            console.error("Error updating player:", err);
        }
    };

    const handleDeletePlayer = async (playerId: number) => {
        if (!window.confirm("Are you sure you want to remove this player from the team?")) return;
        try {
            const response = await fetch(`${API_BASE}/api/roster/${playerId}`, { method: "DELETE" });
            if (response.ok) {
                fetchRoster();
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
            const slicedRawHeaders = rawHeaders.slice(0, lastBattingColIdx + 1);
            const cleanHeader = (h: string) => h.replace(/"/g, '').replace(/\s+/g, '').trim().toUpperCase();
            const headers = slicedRawHeaders.map(cleanHeader);

            const parsedPlayers: any[] = [];
            
            for (let i = headerLineIdx + 1; i < lines.length; i++){
                if (!lines[i].trim()) continue;
                const rawValues = parseCSVLine(lines[i]);
                // Keep only the batting stats columns for this row
                const values = rawValues.slice(0, lastBattingColIdx + 1);

                // Map columns using indexes
                const getVal = (colNames: string[], defaultVal = 0) => {
                    const idx = headers.findIndex(h => colNames.includes(h));
                    if (idx === -1 || !values[idx]) return defaultVal;
                    return parseInt(values[idx].replace(/"/g, '')) || defaultVal;
                };

                const getStr = (colNames: string[]) => {
                    const idx = headers.findIndex(h => colNames.includes(h));
                    if (idx === -1 || !values[idx]) return '';
                    return values[idx].replace(/"/g, '').trim();
                };

                // Search terms are normalized (no whitespace, uppercase)
                const playerNum = getVal(["#", "JERSEY", "JERSEY#", "JERSEYNUMBER", "NUMBER", "NO", "NO.", "PLAYERNUMBER", "NUM", "JERSEYNO", "JERSEYNO.", "PLAYERNO", "PLAYERNO.", "NUMBER#"]);
                
                // Extract and combine first and last name, or fallback to full name/player column
                const first = getStr(["FIRST", "FIRSTNAME", "PLAYER", "PLAYERNAME", "NAME"]);
                const last = getStr(["LAST", "LASTNAME"]);
                const playerName = last ? `${first} ${last}` : first;

                // If we have no jersey number and no name, skip the row (it's probably an empty line or footer)
                if (playerNum === 0 && !playerName) continue;

                // Match with existing roster by Jersey Number ONLY (per user preference)
                const existing = roster.find(r => playerNum > 0 && r.player_number === playerNum);

                parsedPlayers.push({
                    matched: !!existing,
                    existing_id: existing?.id,
                    player_name: existing?.player_name || playerName || `Player #${playerNum}`,
                    player_number: existing?.player_number || playerNum,
                    handedness: existing?.handedness || "Righty",

                    // Stats mapping using normalized spaceless search keys
                    games_played: getVal(["GP", "G", "GAMES", "GAMESPLAYED"]),
                    plate_appearances: getVal(["PA", "PLATEAPPEARANCES"]),
                    at_bats: getVal(["AB", "ATBATS"]),
                    singles: getVal(["1B", "SINGLES", "SINGLE"]),
                    doubles: getVal(["2B", "DOUBLES", "DOUBLE"]),
                    triples: getVal(["3B", "TRIPLES", "TRIPLE"]),
                    home_runs: getVal(["HR", "HOMERUNS", "HOMERUN"]),
                    walks: getVal(["BB", "WALKS", "WALK", "BASEONBALLS"]),
                    strikeouts: getVal(["SO", "STRIKEOUTS", "K", "STRIKEOUT"]),
                    hit_by_pitches: getVal(["HBP", "HITBYPITCH", "HITBYPITCHES"]),
                    stolen_bases: getVal(["SB", "STOLENBASES"]),
                    caught_stealing: getVal(["CS", "CAUGHTSTEALING"]),
                    runs_scored: getVal(["R", "RUNS", "RUNSSCORED"]),
                    runs_batted_in: getVal(["RBI", "RBIS", "RUNSBATTEDIN"]),
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
            const response = await fetch(`${API_BASE}/api/roster/bulk-update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    team_id: selectedTeamId,
                    players: matchedUpdates
                })
            });
            if (response.ok) {
                setShowImportModal(false);
                fetchRoster();
                alert("Roster statistics successfully synced with GameChanger!");
            } else {
                alert("Failed to update statistics.");
            }
        } catch (err) {
            console.error("Error bulk updating stats:", err);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="team-manager-card" style={{ width: activeTab === 'roster' ? '1050px' : '550px', transition: 'width 0.2s ease-out' }}>
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
                        onClick={() => { setActiveTab('roster'); cancelForms(); }} 
                        disabled={!selectedTeamId}
                        className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
                        style={{ padding: '8px 16px', background: activeTab === 'roster' ? 'var(--accent-bg)' : 'transparent', border: 'none', color: activeTab === 'roster' ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', opacity: selectedTeamId ? 1 : 0.4 }}
                    >
                        Active Roster
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
                                    <label>Handedness (Bats)</label>
                                    <select value={handedness} onChange={(e) => setHandedness(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}>
                                        <option value="Righty">Righty</option>
                                        <option value="Lefty">Lefty</option>
                                        <option value="Switch">Switch</option>
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
                                <div className="input-group" style={{ flex: 1 }}><label>Bats</label><select value={handedness} onChange={(e) => setHandedness(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}><option value="Righty">Righty</option><option value="Lefty">Lefty</option><option value="Switch">Switch</option></select></div>
                            </div>
                            
                            {/* Raw Counts Fields (Grid of stats) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
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
                            
                            <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Stats</button>
                                <button type="button" onClick={cancelForms} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <div className="roster-list-area">
                            <div className="list-subheader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-h)' }}>
                                    Team Roster {selectedTeamId && ` - ${teams.find(t => t.id === selectedTeamId)?.team_name}`}
                                </h3>
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

                            {loading && roster.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center' }}>Loading roster...</div>
                            ) : roster.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text)' }}>
                                    📋 No players added to the roster yet. Add your first player!
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                    <table className="roster-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)' }}>
                                                <th onClick={() => handleSort('player_number')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                    # {sortField === 'player_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                </th>
                                                <th onClick={() => handleSort('player_name')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                    Player Name {sortField === 'player_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                </th>
                                                <th onClick={() => handleSort('handedness')} style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}>
                                                    Bats {sortField === 'handedness' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                </th>
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
                                                <th style={{ padding: '10px 12px', textAlign: 'center', userSelect: 'none' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedRoster.map((p) => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{p.player_number}</td>
                                                    <td style={{ padding: '10px 12px', color: 'var(--text-h)', fontWeight: '500' }}>{p.player_name}</td>
                                                    <td style={{ padding: '10px 12px' }}>{p.handedness[0]}</td>
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