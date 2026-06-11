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
    batting_average: number;
    on_base_percentage: number;
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