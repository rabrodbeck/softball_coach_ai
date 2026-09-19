export interface Team {
    id: number;
    team_name: string;
    season: string;
    wins: number;
    losses: number;
    ties: number;
    is_active: boolean;
    innings_per_game: number;
    role?: 'Head Coach' | 'Assistant Coach';
    age_group: string;
}

export interface Player {
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
    hits: number;
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
    reached_on_error: number;
    batting_average: number;
    on_base_percentage: number;
    created_at: string;
    updated_at: string;
    eligible_positions?: string;
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
    era: number;
    whip: number;
    // Fielding stats
    total_chances: number;
    assists: number;
    putouts: number;
    errors: number;
    fielding_percentage: number;
    // Catching stats
    innings_caught: number;
    passed_balls_allowed: number;
    runners_stolen_bases: number;
    runners_caught_stealing: number;
    caught_stealing_percentage: number;
    // Optional analytics and position innings
    slugging_percentage?: number;
    ops?: number;
    isolated_power?: number;
    bb_k_ratio?: number;
    stolen_base_percentage?: number;
    k7?: number;
    bb7?: number;
    pitches_per_inning?: number;
    k_bb_ratio?: number;
    innings_p?: number;
    innings_c?: number;
    innings_1b?: number;
    innings_2b?: number;
    innings_3b?: number;
    innings_ss?: number;
    innings_lf?: number;
    innings_cf?: number;
    innings_rf?: number;
    team_name?: string;
    season?: string;
}

export interface TeamManagerProps {
    coachId: number;
    onClose: () => void;
    selectedTeamId: number | null;
    onSelectTeam: (team: Team) => void;
}

export const normalizeHand = (h: string | null | undefined, fallback = 'Right'): string => {
    if (!h) return fallback;
    const clean = h.trim().toLowerCase();
    if (clean === 'righty' || clean === 'right') return 'Right';
    if (clean === 'lefty' || clean === 'left') return 'Left';
    if (clean === 'switch') return 'Switch';
    return fallback;
};

export const parseSeason = (seasonStr?: string) => {
    if (!seasonStr) return { year: 0, seasonOrder: 99 };
    const yearMatch = seasonStr.match(/\b(19\d\d|20\d\d)\b/) || seasonStr.match(/'?(\d{2})\b/);
    let year = 0;
    if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
        if (year < 100) year += 2000;
    }

    const s = seasonStr.toLowerCase();
    let seasonOrder = 99;
    if (s.includes('spring')) seasonOrder = 1;
    else if (s.includes('summer')) seasonOrder = 2;
    else if (s.includes('fall') || s.includes('autumn')) seasonOrder = 3;
    else if (s.includes('winter')) seasonOrder = 4;

    return { year, seasonOrder };
};

export const parseAgeGroup = (ageStr?: string) => {
    if (!ageStr) return 999;
    const match = ageStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 999;
};

export const sortTeams = (teamsList: Team[]): Team[] => {
    return [...teamsList].sort((a, b) => {
        // 1. Active team always at the top
        const aActive = Boolean(a.is_active);
        const bActive = Boolean(b.is_active);
        if (aActive !== bActive) {
            return aActive ? -1 : 1;
        }

        // 2. Season: Year (newest year first)
        const aSeason = parseSeason(a.season);
        const bSeason = parseSeason(b.season);
        if (aSeason.year !== bSeason.year) {
            return bSeason.year - aSeason.year;
        }

        // Season within year: Chronological (Spring, Summer, Fall, Winter)
        if (aSeason.seasonOrder !== bSeason.seasonOrder) {
            return aSeason.seasonOrder - bSeason.seasonOrder;
        }

        const seasonCompare = (a.season || '').localeCompare(b.season || '');
        if (seasonCompare !== 0) {
            return seasonCompare;
        }

        // 3. Age Group: numerical order (e.g. 8U, 10U, 12U, 14U)
        const aAge = parseAgeGroup(a.age_group);
        const bAge = parseAgeGroup(b.age_group);
        if (aAge !== bAge) {
            return aAge - bAge;
        }

        const ageCompare = (a.age_group || '').localeCompare(b.age_group || '');
        if (ageCompare !== 0) {
            return ageCompare;
        }

        // 4. Team Name: Alphabetical
        return (a.team_name || '').localeCompare(b.team_name || '');
    });
};