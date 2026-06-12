import { useState } from 'react';
import type { Player } from '../types';
import { apiFetch } from '../../../utils/api';
import { normalizeHand } from '../types';

interface UseGameChangerImportProps {
    selectedTeamId: number | null;
    coachId: number;
    players: Player[];
    fetchPlayers: () => Promise<void>;
}

export function useGameChangerImport({
    selectedTeamId,
    coachId,
    players,
    fetchPlayers
}: UseGameChangerImportProps) {
    const [importPreview, setImportPreview] = useState<any[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);

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
            const cleanHeaders = rawHeaders.map(cleanHeader);
            
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
                    if (idx === -1 || !battingValues[idx] || battingValues[idx].trim() === '') return defaultVal;
                    const parsed = parseInt(battingValues[idx].replace(/"/g, ''));
                    return isNaN(parsed) ? defaultVal : parsed;
                };

                const getStr = (colNames: string[]) => {
                    const idx = battingHeaders.findIndex(h => colNames.includes(h));
                    if (idx === -1 || !battingValues[idx]) return '';
                    return battingValues[idx].replace(/"/g, '').trim();
                };

                // Helpers for Pitching search
                const getPitchingVal = (colNames: string[], defaultVal = 0) => {
                    const idx = pitchingHeaders.findIndex(h => colNames.includes(h));
                    if (idx === -1 || !pitchingValues[idx] || pitchingValues[idx].trim() === '') return defaultVal;
                    const parsed = parseInt(pitchingValues[idx].replace(/"/g, ''));
                    return isNaN(parsed) ? defaultVal : parsed;
                };

                const getPitchingValFloat = (colNames: string[], defaultVal = 0.0) => {
                    const idx = pitchingHeaders.findIndex(h => colNames.includes(h));
                    if (idx === -1 || !pitchingValues[idx] || pitchingValues[idx].trim() === '') return defaultVal;
                    const parsed = parseFloat(pitchingValues[idx].replace(/"/g, ''));
                    return isNaN(parsed) ? defaultVal : parsed;
                };

                // Unified lookup helper checking both batting and pitching columns for new stats
                const getVal = (colNames: string[], defaultVal = 0) => {
                    let idx = battingHeaders.findIndex(h => colNames.includes(h));
                    if (idx !== -1 && battingValues[idx] && battingValues[idx].trim() !== '') {
                        const parsed = parseInt(battingValues[idx].replace(/"/g, ''));
                        return isNaN(parsed) ? defaultVal : parsed;
                    }
                    
                    idx = pitchingHeaders.findIndex(h => colNames.includes(h));
                    if (idx !== -1 && pitchingValues[idx] && pitchingValues[idx].trim() !== '') {
                        const parsed = parseInt(pitchingValues[idx].replace(/"/g, ''));
                        return isNaN(parsed) ? defaultVal : parsed;
                    }
                    return defaultVal;
                };

                // Check if the catching section exists in the CSV
                const hasCatchingSection = cleanHeaders.some(h => ["INN", "IC", "INNINGSCAUGHT", "PB", "PASSEDBALLS"].includes(h));

                // Unified lookup helper checking from the right of the row to avoid batting/pitching collisions
                const getCatcherVal = (colNames: string[], defaultVal = 0) => {
                    if (!hasCatchingSection) return defaultVal;
                    const idx = cleanHeaders.map(h => colNames.includes(h)).lastIndexOf(true);
                    if (idx !== -1 && rawValues[idx] && rawValues[idx].trim() !== '') {
                        const parsed = parseInt(rawValues[idx].replace(/"/g, ''));
                        return isNaN(parsed) ? defaultVal : parsed;
                    }
                    return defaultVal;
                };

                const getCatcherValFloat = (colNames: string[], defaultVal = 0.0) => {
                    if (!hasCatchingSection) return defaultVal;
                    const idx = cleanHeaders.map(h => colNames.includes(h)).lastIndexOf(true);
                    if (idx !== -1 && rawValues[idx] && rawValues[idx].trim() !== '') {
                        const parsed = parseFloat(rawValues[idx].replace(/"/g, ''));
                        return isNaN(parsed) ? defaultVal : parsed;
                    }
                    return defaultVal;
                };

                const getPositionValFloat = (colNames: string[], defaultVal = 0.0) => {
                    const idx = cleanHeaders.map(h => colNames.includes(h)).lastIndexOf(true);
                    if (idx !== -1 && rawValues[idx] && rawValues[idx].trim() !== '') {
                        const parsed = parseFloat(rawValues[idx].replace(/"/g, ''));
                        return isNaN(parsed) ? defaultVal : parsed;
                    }
                    return defaultVal;
                };

                // Search terms are normalized (no whitespace, uppercase)
                const playerNum = getBattingVal(["#", "JERSEY", "JERSEY#", "JERSEYNUMBER", "NUMBER", "NO", "NO.", "PLAYERNUMBER", "NUM", "JERSEYNO", "JERSEYNO.", "PLAYERNO", "PLAYERNO.", "NUMBER#"], -1);
                
                // Extract and combine first and last name, or fallback to full name/player column
                const first = getStr(["FIRST", "FIRSTNAME", "PLAYER", "PLAYERNAME", "NAME"]);
                const last = getStr(["LAST", "LASTNAME"]);
                const playerName = last ? `${first} ${last}` : first;

                // If we have no jersey number and no name, skip the row
                if (playerNum === -1 && !playerName) continue;

                // Match with existing roster by Jersey Number (if specified) or name
                const existing = players.find(r => 
                    (playerNum >= 0 && r.player_number === playerNum) ||
                    (playerNum === -1 && playerName && r.player_name?.trim().toLowerCase() === playerName.trim().toLowerCase())
                );

                parsedPlayers.push({
                    matched: !!existing,
                    existing_id: existing?.id,
                    player_name: existing?.player_name || playerName || `Player #${playerNum >= 0 ? playerNum : ''}`,
                    player_number: existing ? existing.player_number : (playerNum >= 0 ? playerNum : 0),
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

                    // Catching stats mapping (from CSV - look up rightmost columns to prevent collisions)
                    innings_caught: getCatcherValFloat(["INN", "IC", "INNINGSCAUGHT"]),
                    passed_balls_allowed: getCatcherVal(["PB", "PASSEDBALLS", "PASSEDBALL"]),
                    runners_stolen_bases: getCatcherVal(["SB", "SBA", "RUNNERSSTOLENBASES", "SBAAGAINST"]),
                    runners_caught_stealing: getCatcherVal(["CS", "RUNNERSCAUGHTSTEALING", "CSAGAINST"]),
                    
                    // Position innings stats
                    innings_p: getPositionValFloat(["P", "IP-P", "IP - P", "IP_P", "INNINGSPITCHED_P", "INN_P"]),
                    innings_c: getPositionValFloat(["C", "IP-C", "IP - C", "IP_C", "INNINGSPLAYED_C", "INN_C"]),
                    innings_1b: getPositionValFloat(["1B", "IP-1B", "IP - 1B", "IP_1B", "INNINGSPLAYED_1B", "INN_1B"]),
                    innings_2b: getPositionValFloat(["2B", "IP-2B", "IP - 2B", "IP_2B", "INNINGSPLAYED_2B", "INN_2B"]),
                    innings_3b: getPositionValFloat(["3B", "IP-3B", "IP - 3B", "IP_3B", "INNINGSPLAYED_3B", "INN_3B"]),
                    innings_ss: getPositionValFloat(["SS", "IP-SS", "IP - SS", "IP_SS", "INNINGSPLAYED_SS", "INN_SS"]),
                    innings_lf: getPositionValFloat(["LF", "IP-LF", "IP - LF", "IP_LF", "INNINGSPLAYED_LF", "INN_LF"]),
                    innings_cf: getPositionValFloat(["CF", "IP-CF", "IP - CF", "IP_CF", "INNINGSPLAYED_CF", "INN_CF"]),
                    innings_rf: getPositionValFloat(["RF", "IP-RF", "IP - RF", "IP_RF", "INNINGSPLAYED_RF", "INN_RF"])
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
            const response = await apiFetch(`/api/players/bulk-update`, {
                method: "POST",
                body: JSON.stringify({
                    coach_id: coachId,
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

    return {
        importPreview,
        setImportPreview,
        showImportModal,
        setShowImportModal,
        handleFileImport,
        handleConfirmImport
    };
}