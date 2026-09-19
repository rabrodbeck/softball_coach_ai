from .pool import get_db_connection, PooledConnectionWrapper, init_db
from .coaches import (
    register_coach,
    authenticate_coach,
    get_coach_by_email,
    check_is_head_coach,
    add_coach_to_team,
    get_team_coaches,
    is_valid_email,
    validate_password_strength
)
from .teams import (
    create_team,
    get_coach_teams,
    set_active_team,
    update_team,
    save_team_lineup,
    get_team_lineups,
    delete_team_lineup
)
from .players import (
    add_player,
    add_returning_player,
    get_team_players,
    search_players_global,
    get_coach_players_directory,
    update_player_stats,
    delete_player,
    bulk_update_player_stats,
    update_player_eligibility
)
from .metrics import (
    add_fractional_innings,
    convert_ip_to_actual,
    calculate_derived_pitching_stats,
    calculate_derived_defensive_stats,
    calculate_derived_stats
)
from .prompts import get_system_prompt
