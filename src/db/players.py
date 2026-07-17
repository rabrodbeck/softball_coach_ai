import psycopg2
from src.db.pool import get_db_connection
from src.db.metrics import calculate_derived_stats, add_fractional_innings
from src.db.coaches import check_is_head_coach

def add_player(coach_id: int, team_id: int, name: str, number: int, batting_hand: str, throwing_hand: str, parent_player_id: int = None):
    """Creates a brand new player and registers them on a team with corresponding empty stats rows."""
    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can add players.")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Insert core player info
        cursor.execute(
            """
            INSERT INTO players (player_name, batting_hand, throwing_hand, parent_player_id)
            VALUES (%s, %s, %s, %s)
            RETURNING *;
            """,
            (name.strip(), batting_hand, throwing_hand, parent_player_id)
        )
        player_row = cursor.fetchone()
        if not player_row:
            return None
            
        player_id = player_row["id"]
        
        # 2. Insert seasonal roster association
        cursor.execute(
            """
            INSERT INTO players_teams (player_id, team_id, player_number, games_played)
            VALUES (%s, %s, %s, 0);
            """,
            (player_id, team_id, number)
        )
        
        # 3. Insert stats rows for all categories
        cursor.execute("INSERT INTO offensive_stats (player_id, team_id) VALUES (%s, %s);", (player_id, team_id))
        cursor.execute("INSERT INTO pitching_stats (player_id, team_id) VALUES (%s, %s);", (player_id, team_id))
        cursor.execute("INSERT INTO defensive_stats (player_id, team_id) VALUES (%s, %s);", (player_id, team_id))
        cursor.execute("INSERT INTO catching_stats (player_id, team_id) VALUES (%s, %s);", (player_id, team_id))
        
        conn.commit()

        # Fetch team innings_per_game
        cursor.execute("SELECT innings_per_game FROM teams WHERE id = %s;", (team_id,))
        team_row = cursor.fetchone()
        innings_per_game = team_row["innings_per_game"] if team_row else 7
        
        full_player = {
            "id": player_id,
            "team_id": team_id,
            "player_name": player_row["player_name"],
            "player_number": number,
            "batting_hand": player_row["batting_hand"],
            "throwing_hand": player_row["throwing_hand"],
            "parent_player_id": player_row["parent_player_id"],
            "eligible_positions": player_row.get("eligible_positions") or "P,C,1B,2B,3B,SS,LF,CF,RF",
            "games_played": 0,
            "innings_per_game": innings_per_game,
            "plate_appearances": 0, "at_bats": 0, "singles": 0, "doubles": 0, "triples": 0, "home_runs": 0,
            "walks": 0, "strikeouts": 0, "hit_by_pitches": 0, "stolen_bases": 0, "caught_stealing": 0,
            "runs_scored": 0, "runs_batted_in": 0, "reached_on_error": 0,
            "games_pitched": 0, "games_started": 0, "innings_pitched": 0.0, "batters_faced": 0, "number_of_pitches": 0,
            "hits_allowed": 0, "runs_allowed": 0, "earned_runs": 0, "walks_allowed": 0, "strikeouts_thrown": 0,
            "hit_by_pitches_allowed": 0, "left_on_base": 0,
            "total_chances": 0, "assists": 0, "putouts": 0, "errors": 0,
            "innings_p": 0.0, "innings_c": 0.0, "innings_1b": 0.0, "innings_2b": 0.0, "innings_3b": 0.0,
            "innings_ss": 0.0, "innings_lf": 0.0, "innings_cf": 0.0, "innings_rf": 0.0,
            "innings_caught": 0.0, "passed_balls_allowed": 0, "runners_stolen_bases": 0, "runners_caught_stealing": 0
        }
        return calculate_derived_stats(full_player)
    finally:
        cursor.close()
        conn.close()


def add_returning_player(coach_id: int, team_id: int, player_id: int, number: int):
    """Links an existing player in the database to a new team roster."""
    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can add players.")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Create seasonal association
        cursor.execute(
            """
            INSERT INTO players_teams (player_id, team_id, player_number, games_played)
            VALUES (%s, %s, %s, 0)
            ON CONFLICT (player_id, team_id) DO UPDATE SET player_number = EXCLUDED.player_number;
            """,
            (player_id, team_id, number)
        )
        
        # Create seasonal stats rows
        cursor.execute("INSERT INTO offensive_stats (player_id, team_id) VALUES (%s, %s) ON CONFLICT (player_id, team_id) DO NOTHING;", (player_id, team_id))
        cursor.execute("INSERT INTO pitching_stats (player_id, team_id) VALUES (%s, %s) ON CONFLICT (player_id, team_id) DO NOTHING;", (player_id, team_id))
        cursor.execute("INSERT INTO defensive_stats (player_id, team_id) VALUES (%s, %s) ON CONFLICT (player_id, team_id) DO NOTHING;", (player_id, team_id))
        cursor.execute("INSERT INTO catching_stats (player_id, team_id) VALUES (%s, %s) ON CONFLICT (player_id, team_id) DO NOTHING;", (player_id, team_id))
        
        conn.commit()
        
        # Fetch full stats
        roster = get_team_players(team_id)
        return next((p for p in roster if p["id"] == player_id), None)
    finally:
        cursor.close()
        conn.close()


def get_team_players(team_id: int):
    """Retrieves all players on a team by joining players, players_teams, and team-specific stats."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT 
                p.id, pt.team_id, p.player_name, pt.player_number, p.batting_hand, p.throwing_hand, pt.games_played, p.parent_player_id, p.created_at, p.updated_at, p.eligible_positions,
                COALESCE(t.innings_per_game, 7) as innings_per_game,
                COALESCE(o.plate_appearances, 0) as plate_appearances,
                COALESCE(o.at_bats, 0) as at_bats,
                COALESCE(o.singles, 0) as singles,
                COALESCE(o.doubles, 0) as doubles,
                COALESCE(o.triples, 0) as triples,
                COALESCE(o.home_runs, 0) as home_runs,
                COALESCE(o.walks, 0) as walks,
                COALESCE(o.strikeouts, 0) as strikeouts,
                COALESCE(o.hit_by_pitches, 0) as hit_by_pitches,
                COALESCE(o.stolen_bases, 0) as stolen_bases,
                COALESCE(o.caught_stealing, 0) as caught_stealing,
                COALESCE(o.runs_scored, 0) as runs_scored,
                COALESCE(o.runs_batted_in, 0) as runs_batted_in,
                COALESCE(o.reached_on_error, 0) as reached_on_error,
                COALESCE(p_stats.games_pitched, 0) as games_pitched,
                COALESCE(p_stats.games_started, 0) as games_started,
                COALESCE(p_stats.innings_pitched, 0.0) as innings_pitched,
                COALESCE(p_stats.batters_faced, 0) as batters_faced,
                COALESCE(p_stats.number_of_pitches, 0) as number_of_pitches,
                COALESCE(p_stats.hits, 0) as hits_allowed,
                COALESCE(p_stats.runs, 0) as runs_allowed,
                COALESCE(p_stats.earned_runs, 0) as earned_runs,
                COALESCE(p_stats.walks, 0) as walks_allowed,
                COALESCE(p_stats.strikeouts, 0) as strikeouts_thrown,
                COALESCE(p_stats.hit_by_pitches, 0) as hit_by_pitches_allowed,
                COALESCE(p_stats.left_on_base, 0) as left_on_base,
                COALESCE(d.total_chances, 0) as total_chances,
                COALESCE(d.assists, 0) as assists,
                COALESCE(d.putouts, 0) as putouts,
                COALESCE(d.errors, 0) as errors,
                COALESCE(c.innings_caught, 0.0) as innings_caught,
                COALESCE(c.passed_balls_allowed, 0) as passed_balls_allowed,
                COALESCE(c.runners_stolen_bases, 0) as runners_stolen_bases,
                COALESCE(c.runners_caught_stealing, 0) as runners_caught_stealing,
                COALESCE(d.innings_p, 0.0) as innings_p,
                COALESCE(d.innings_c, 0.0) as innings_c,
                COALESCE(d.innings_1b, 0.0) as innings_1b,
                COALESCE(d.innings_2b, 0.0) as innings_2b,
                COALESCE(d.innings_3b, 0.0) as innings_3b,
                COALESCE(d.innings_ss, 0.0) as innings_ss,
                COALESCE(d.innings_lf, 0.0) as innings_lf,
                COALESCE(d.innings_cf, 0.0) as innings_cf,
                COALESCE(d.innings_rf, 0.0) as innings_rf
            FROM players p
            JOIN players_teams pt ON p.id = pt.player_id
            LEFT JOIN teams t ON pt.team_id = t.id
            LEFT JOIN offensive_stats o ON p.id = o.player_id AND pt.team_id = o.team_id
            LEFT JOIN pitching_stats p_stats ON p.id = p_stats.player_id AND pt.team_id = p_stats.team_id
            LEFT JOIN defensive_stats d ON p.id = d.player_id AND pt.team_id = d.team_id
            LEFT JOIN catching_stats c ON p.id = c.player_id AND pt.team_id = c.team_id
            WHERE pt.team_id = %s
            ORDER BY p.player_name ASC;
            """,
            (team_id,)
        )
        rows = cursor.fetchall()
        return [calculate_derived_stats(row) for row in rows]
    finally:
        cursor.close()
        conn.close()


def get_coach_players_directory(coach_id: int):
    """Retrieves all distinct players created by a coach across all their teams."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT DISTINCT p.id, p.player_name, p.batting_hand, p.throwing_hand, p.eligible_positions
            FROM players p
            JOIN players_teams pt ON p.id = pt.player_id
            JOIN team_coaches tc ON pt.team_id = tc.team_id
            WHERE tc.coach_id = %s AND tc.is_active = true
            ORDER BY p.player_name ASC;
            """,
            (coach_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        conn.close()


def update_player_stats(coach_id: int, player_id: int, stats: dict):
    """Updates core player details, seasonal jersey number/games, and stats inside a transaction."""
    team_id = stats.get("team_id")
    if not team_id:
        raise ValueError("team_id is required to update statistics.")

    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can edit player stats.")
    
    conn = get_db_connection()
    cursor = conn.conn.cursor() if hasattr(conn, 'conn') else conn.cursor()
    
    try:
        parent_id = stats.get("parent_player_id")

        # 1. Update core details in players
        cursor.execute(
            """
            UPDATE players
            SET player_name = %s, batting_hand = %s, throwing_hand = %s, parent_player_id = %s,
                eligible_positions = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *;
            """,
            (
                stats["player_name"].strip(), stats["batting_hand"], stats["throwing_hand"],
                parent_id, stats.get("eligible_positions") or "P,C,1B,2B,3B,SS,LF,CF,RF", player_id
            )
        )
        player_row = cursor.fetchone()
        if not player_row:
            return None

        # 2. Update seasonal details in players_teams
        cursor.execute(
            """
            UPDATE players_teams
            SET player_number = %s, games_played = %s
            WHERE player_id = %s AND team_id = %s
            RETURNING *;
            """,
            (stats["player_number"], stats["games_played"], player_id, team_id)
        )
        pt_row = cursor.fetchone()

        # 3. Update offensive stats
        cursor.execute(
            """
            INSERT INTO offensive_stats (
                player_id, team_id, plate_appearances, at_bats,
                singles, doubles, triples, home_runs,
                walks, strikeouts, hit_by_pitches, stolen_bases, caught_stealing,
                runs_scored, runs_batted_in, reached_on_error, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (player_id, team_id) DO UPDATE
            SET plate_appearances = EXCLUDED.plate_appearances, at_bats = EXCLUDED.at_bats,
                singles = EXCLUDED.singles, doubles = EXCLUDED.doubles, triples = EXCLUDED.triples, home_runs = EXCLUDED.home_runs,
                walks = EXCLUDED.walks, strikeouts = EXCLUDED.strikeouts, hit_by_pitches = EXCLUDED.hit_by_pitches,
                stolen_bases = EXCLUDED.stolen_bases, caught_stealing = EXCLUDED.caught_stealing,
                runs_scored = EXCLUDED.runs_scored, runs_batted_in = EXCLUDED.runs_batted_in,
                reached_on_error = EXCLUDED.reached_on_error, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
            """,
            (
                player_id, team_id, stats["plate_appearances"], stats["at_bats"],
                stats["singles"], stats["doubles"], stats["triples"], stats["home_runs"],
                stats["walks"], stats["strikeouts"], stats["hit_by_pitches"],
                stats["stolen_bases"], stats["caught_stealing"],
                stats["runs_scored"], stats["runs_batted_in"], stats.get("reached_on_error", 0)
            )
        )
        stats_row = cursor.fetchone()

        # 4. Update pitching stats
        cursor.execute(
            """
            INSERT INTO pitching_stats (
                player_id, team_id, games_pitched, games_started,
                innings_pitched, batters_faced, number_of_pitches,
                hits, runs, earned_runs, walks, strikeouts,
                hit_by_pitches, left_on_base, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (player_id, team_id) DO UPDATE
            SET games_pitched = EXCLUDED.games_pitched, games_started = EXCLUDED.games_started,
                innings_pitched = EXCLUDED.innings_pitched, batters_faced = EXCLUDED.batters_faced,
                number_of_pitches = EXCLUDED.number_of_pitches, hits = EXCLUDED.hits, runs = EXCLUDED.runs,
                earned_runs = EXCLUDED.earned_runs, walks = EXCLUDED.walks, strikeouts = EXCLUDED.strikeouts,
                hit_by_pitches = EXCLUDED.hit_by_pitches, left_on_base = EXCLUDED.left_on_base, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
            """,
            (
                player_id, team_id, stats.get("games_pitched", 0), stats.get("games_started", 0),
                stats.get("innings_pitched", 0.0), stats.get("batters_faced", 0), stats.get("number_of_pitches", 0),
                stats.get("hits_allowed", 0), stats.get("runs_allowed", 0), stats.get("earned_runs", 0),
                stats.get("walks_allowed", 0), stats.get("strikeouts_thrown", 0), stats.get("hit_by_pitches_allowed", 0),
                stats.get("left_on_base", 0)
            )
        )
        pit_row = cursor.fetchone()

        # 5. Update defensive stats
        cursor.execute(
            """
            INSERT INTO defensive_stats (
                player_id, team_id, total_chances, assists, putouts, errors,
                innings_p, innings_c, innings_1b, innings_2b, innings_3b, innings_ss, innings_lf, innings_cf, innings_rf, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (player_id, team_id) DO UPDATE
            SET total_chances = EXCLUDED.total_chances, assists = EXCLUDED.assists,
                putouts = EXCLUDED.putouts, errors = EXCLUDED.errors,
                innings_p = EXCLUDED.innings_p, innings_c = EXCLUDED.innings_c,
                innings_1b = EXCLUDED.innings_1b, innings_2b = EXCLUDED.innings_2b,
                innings_3b = EXCLUDED.innings_3b, innings_ss = EXCLUDED.innings_ss,
                innings_lf = EXCLUDED.innings_lf, innings_cf = EXCLUDED.innings_cf,
                innings_rf = EXCLUDED.innings_rf, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
            """,
            (
                player_id, team_id, stats.get("total_chances", 0), stats.get("assists", 0),
                stats.get("putouts", 0), stats.get("errors", 0),
                stats.get("innings_p", 0.0), stats.get("innings_c", 0.0), stats.get("innings_1b", 0.0),
                stats.get("innings_2b", 0.0), stats.get("innings_3b", 0.0), stats.get("innings_ss", 0.0),
                stats.get("innings_lf", 0.0), stats.get("innings_cf", 0.0), stats.get("innings_rf", 0.0)
            )
        )
        def_row = cursor.fetchone()

        # 6. Update catching stats
        cursor.execute(
            """
            INSERT INTO catching_stats (
                player_id, team_id, innings_caught, passed_balls_allowed, runners_stolen_bases, runners_caught_stealing, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (player_id, team_id) DO UPDATE
            SET innings_caught = EXCLUDED.innings_caught, passed_balls_allowed = EXCLUDED.passed_balls_allowed,
                runners_stolen_bases = EXCLUDED.runners_stolen_bases, runners_caught_stealing = EXCLUDED.runners_caught_stealing,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
            """,
            (
                player_id, team_id, stats.get("innings_caught", 0.0), stats.get("passed_balls_allowed", 0),
                stats.get("runners_stolen_bases", 0), stats.get("runners_caught_stealing", 0)
            )
        )
        cat_row = cursor.fetchone()

        conn.commit()

        # Fetch team innings_per_game
        cursor.execute("SELECT innings_per_game FROM teams WHERE id = %s;", (team_id,))
        team_row = cursor.fetchone()
        innings_per_game = team_row["innings_per_game"] if team_row else 7

        full_player = {
            **dict(stats_row),
            **dict(player_row),
            "player_number": pt_row["player_number"],
            "games_played": pt_row["games_played"],
            "games_pitched": pit_row["games_pitched"],
            "games_started": pit_row["games_started"],
            "innings_pitched": float(pit_row["innings_pitched"]),
            "batters_faced": pit_row["batters_faced"],
            "number_of_pitches": pit_row["number_of_pitches"],
            "hits_allowed": pit_row["hits"],
            "runs_allowed": pit_row["runs"],
            "earned_runs": pit_row["earned_runs"],
            "walks_allowed": pit_row["walks"],
            "strikeouts_thrown": pit_row["strikeouts"],
            "hit_by_pitches_allowed": pit_row["hit_by_pitches"],
            "left_on_base": pit_row["left_on_base"],
            "total_chances": def_row["total_chances"],
            "assists": def_row["assists"],
            "putouts": def_row["putouts"],
            "errors": def_row["errors"],
            "innings_p": float(def_row["innings_p"] or 0.0),
            "innings_c": float(def_row["innings_c"] or 0.0),
            "innings_1b": float(def_row["innings_1b"] or 0.0),
            "innings_2b": float(def_row["innings_2b"] or 0.0),
            "innings_3b": float(def_row["innings_3b"] or 0.0),
            "innings_ss": float(def_row["innings_ss"] or 0.0),
            "innings_lf": float(def_row["innings_lf"] or 0.0),
            "innings_cf": float(def_row["innings_cf"] or 0.0),
            "innings_rf": float(def_row["innings_rf"] or 0.0),
            "innings_caught": float(cat_row["innings_caught"]),
            "passed_balls_allowed": cat_row["passed_balls_allowed"],
            "runners_stolen_bases": cat_row["runners_stolen_bases"],
            "runners_caught_stealing": cat_row["runners_caught_stealing"],
            "innings_per_game": innings_per_game
        }
        return calculate_derived_stats(full_player)
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def delete_player(coach_id: int, player_id: int, team_id: int):
    """Removes a player from a specific team (deletes association and team stats)."""
    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can remove players.")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Delete team-specific stats
        cursor.execute("DELETE FROM offensive_stats WHERE player_id = %s AND team_id = %s;", (player_id, team_id))
        cursor.execute("DELETE FROM pitching_stats WHERE player_id = %s AND team_id = %s;", (player_id, team_id))
        cursor.execute("DELETE FROM defensive_stats WHERE player_id = %s AND team_id = %s;", (player_id, team_id))
        cursor.execute("DELETE FROM catching_stats WHERE player_id = %s AND team_id = %s;", (player_id, team_id))
        
        # Delete seasonal roster association
        cursor.execute("DELETE FROM players_teams WHERE player_id = %s AND team_id = %s RETURNING player_id;", (player_id, team_id))
        ret_row = cursor.fetchone()
        
        conn.commit()
        return ret_row is not None
    finally:
        cursor.close()
        conn.close()


def bulk_update_player_stats(coach_id: int, team_id: int, updates: list):
    """Updates multiple players stats inside the team-split players structure."""
    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can import bulk stats.")
    
    conn = get_db_connection()
    cursor = conn.conn.cursor() if hasattr(conn, 'conn') else conn.cursor()
    try:
        cursor.execute("SELECT innings_per_game FROM teams WHERE id = %s;", (team_id,))
        team_row = cursor.fetchone()
        innings_per_game = team_row["innings_per_game"] if team_row else 7

        updated_players = []
        for p in updates:
            number = p.get("player_number")
            name = p.get("player_name", "").strip()
            
            # Find player ID using join table
            if number >= 0:
                cursor.execute(
                    """
                    SELECT p.id, pt.games_played 
                    FROM players p 
                    JOIN players_teams pt ON p.id = pt.player_id 
                    WHERE pt.team_id = %s AND pt.player_number = %s LIMIT 1;
                    """,
                    (team_id, number)
                )
            else:
                cursor.execute(
                    """
                    SELECT p.id, pt.games_played 
                    FROM players p 
                    JOIN players_teams pt ON p.id = pt.player_id 
                    WHERE pt.team_id = %s AND LOWER(p.player_name) = LOWER(%s) LIMIT 1;
                    """,
                    (team_id, name)
                )
            row = cursor.fetchone()
            if not row:
                continue
                
            player_id = row["id"]
            games_played = p.get("games_played", row["games_played"])

            # Update seasonal games played
            cursor.execute(
                "UPDATE players_teams SET games_played = %s WHERE player_id = %s AND team_id = %s RETURNING *;",
                (games_played, player_id, team_id)
            )
            pt_row = cursor.fetchone()
            
            # Fetch core player row
            cursor.execute("SELECT * FROM players WHERE id = %s;", (player_id,))
            player_row = cursor.fetchone()

            # Update offensive stats
            cursor.execute(
                """
                INSERT INTO offensive_stats (
                    player_id, team_id, plate_appearances, at_bats,
                    singles, doubles, triples, home_runs,
                    walks, strikeouts, hit_by_pitches, stolen_bases, caught_stealing,
                    runs_scored, runs_batted_in, reached_on_error, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (player_id, team_id) DO UPDATE
                SET plate_appearances = EXCLUDED.plate_appearances, at_bats = EXCLUDED.at_bats,
                    singles = EXCLUDED.singles, doubles = EXCLUDED.doubles, triples = EXCLUDED.triples, home_runs = EXCLUDED.home_runs,
                    walks = EXCLUDED.walks, strikeouts = EXCLUDED.strikeouts, hit_by_pitches = EXCLUDED.hit_by_pitches,
                    stolen_bases = EXCLUDED.stolen_bases, caught_stealing = EXCLUDED.caught_stealing,
                    runs_scored = EXCLUDED.runs_scored, runs_batted_in = EXCLUDED.runs_batted_in,
                    reached_on_error = EXCLUDED.reached_on_error, updated_at = CURRENT_TIMESTAMP
                RETURNING *;
                """,
                (
                    player_id, team_id, p["plate_appearances"], p["at_bats"],
                    p["singles"], p["doubles"], p["triples"], p["home_runs"],
                    p["walks"], p["strikeouts"], p["hit_by_pitches"],
                    p["stolen_bases"], p["caught_stealing"],
                    p["runs_scored"], p["runs_batted_in"], p.get("reached_on_error", 0)
                )
            )
            stats_row = cursor.fetchone()

            # Update pitching stats table
            if p.get("games_pitched", 0) > 0:
                cursor.execute(
                    """
                    INSERT INTO pitching_stats (
                        player_id, team_id, games_pitched, games_started,
                        innings_pitched, batters_faced, number_of_pitches,
                        hits, runs, earned_runs, walks, strikeouts,
                        hit_by_pitches, left_on_base, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (player_id, team_id) DO UPDATE
                    SET games_pitched = EXCLUDED.games_pitched, games_started = EXCLUDED.games_started,
                        innings_pitched = EXCLUDED.innings_pitched, batters_faced = EXCLUDED.batters_faced,
                        number_of_pitches = EXCLUDED.number_of_pitches, hits = EXCLUDED.hits, runs = EXCLUDED.runs,
                        earned_runs = EXCLUDED.earned_runs, walks = EXCLUDED.walks, strikeouts = EXCLUDED.strikeouts,
                        hit_by_pitches = EXCLUDED.hit_by_pitches, left_on_base = EXCLUDED.left_on_base, updated_at = CURRENT_TIMESTAMP
                    RETURNING *;
                    """,
                    (
                        player_id, team_id, p["games_pitched"], p["games_started"],
                        p["innings_pitched"], p["batters_faced"], p["number_of_pitches"],
                        p["hits_allowed"], p["runs_allowed"], p["earned_runs"], p["walks_allowed"], p["strikeouts_thrown"],
                        p["hit_by_pitches_allowed"], p["left_on_base"]
                    )
                )
                pit_row = cursor.fetchone()
            else:
                cursor.execute("SELECT * FROM pitching_stats WHERE player_id = %s AND team_id = %s LIMIT 1;", (player_id, team_id))
                pit_row = cursor.fetchone()
                if not pit_row:
                    pit_row = {
                        "games_pitched": 0, "games_started": 0, "innings_pitched": 0.0, "batters_faced": 0,
                        "number_of_pitches": 0, "hits": 0, "runs": 0, "earned_runs": 0, "walks": 0,
                        "strikeouts": 0, "hit_by_pitches": 0, "left_on_base": 0
                    }

            # Update defensive stats
            new_inn_p = float(p.get("innings_p") or 0.0)
            new_inn_c = float(p.get("innings_c") or 0.0)
            new_inn_1b = float(p.get("innings_1b") or 0.0)
            new_inn_2b = float(p.get("innings_2b") or 0.0)
            new_inn_3b = float(p.get("innings_3b") or 0.0)
            new_inn_ss = float(p.get("innings_ss") or 0.0)
            new_inn_lf = float(p.get("innings_lf") or 0.0)
            new_inn_cf = float(p.get("innings_cf") or 0.0)
            new_inn_rf = float(p.get("innings_rf") or 0.0)

            cursor.execute(
                """
                INSERT INTO defensive_stats (
                    player_id, team_id, total_chances, assists, putouts, errors,
                    innings_p, innings_c, innings_1b, innings_2b, innings_3b, innings_ss, innings_lf, innings_cf, innings_rf, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (player_id, team_id) DO UPDATE
                SET total_chances = EXCLUDED.total_chances, assists = EXCLUDED.assists,
                    putouts = EXCLUDED.putouts, errors = EXCLUDED.errors,
                    innings_p = EXCLUDED.innings_p, innings_c = EXCLUDED.innings_c,
                    innings_1b = EXCLUDED.innings_1b, innings_2b = EXCLUDED.innings_2b,
                    innings_3b = EXCLUDED.innings_3b, innings_ss = EXCLUDED.innings_ss,
                    innings_lf = EXCLUDED.innings_lf, innings_cf = EXCLUDED.innings_cf,
                    innings_rf = EXCLUDED.innings_rf, updated_at = CURRENT_TIMESTAMP
                RETURNING *;
                """,
                (
                    player_id, team_id, p.get("total_chances", 0), p.get("assists", 0), p.get("putouts", 0), p.get("errors", 0),
                    new_inn_p, new_inn_c, new_inn_1b, new_inn_2b, new_inn_3b, new_inn_ss, new_inn_lf, new_inn_cf, new_inn_rf
                )
            )
            def_row = cursor.fetchone()

            # Update catching stats
            cursor.execute(
                """
                INSERT INTO catching_stats (
                    player_id, team_id, innings_caught, passed_balls_allowed, runners_stolen_bases, runners_caught_stealing, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (player_id, team_id) DO UPDATE
                SET innings_caught = EXCLUDED.innings_caught, passed_balls_allowed = EXCLUDED.passed_balls_allowed,
                    runners_stolen_bases = EXCLUDED.runners_stolen_bases, runners_caught_stealing = EXCLUDED.runners_caught_stealing,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *;
                """,
                (
                    player_id, team_id, p.get("innings_caught", 0.0), p.get("passed_balls_allowed", 0),
                    p.get("runners_stolen_bases", 0), p.get("runners_caught_stealing", 0)
                )
            )
            cat_row = cursor.fetchone()

            if player_row and stats_row and pit_row and def_row and cat_row:
                full_player = {
                    **dict(stats_row),
                    "games_pitched": pit_row["games_pitched"],
                    "games_started": pit_row["games_started"],
                    "innings_pitched": float(pit_row["innings_pitched"]),
                    "batters_faced": pit_row["batters_faced"],
                    "number_of_pitches": pit_row["number_of_pitches"],
                    "hits_allowed": pit_row["hits"],
                    "runs_allowed": pit_row["runs"],
                    "earned_runs": pit_row["earned_runs"],
                    "walks_allowed": pit_row["walks"],
                    "strikeouts_thrown": pit_row["strikeouts"],
                    "hit_by_pitches_allowed": pit_row["hit_by_pitches"],
                    "left_on_base": pit_row["left_on_base"],
                    "total_chances": def_row["total_chances"],
                    "assists": def_row["assists"],
                    "putouts": def_row["putouts"],
                    "errors": def_row["errors"],
                    "innings_p": float(def_row["innings_p"] or 0.0),
                    "innings_c": float(def_row["innings_c"] or 0.0),
                    "innings_1b": float(def_row["innings_1b"] or 0.0),
                    "innings_2b": float(def_row["innings_2b"] or 0.0),
                    "innings_3b": float(def_row["innings_3b"] or 0.0),
                    "innings_ss": float(def_row["innings_ss"] or 0.0),
                    "innings_lf": float(def_row["innings_lf"] or 0.0),
                    "innings_cf": float(def_row["innings_cf"] or 0.0),
                    "innings_rf": float(def_row["innings_rf"] or 0.0),
                    "innings_caught": float(cat_row["innings_caught"]),
                    "passed_balls_allowed": cat_row["passed_balls_allowed"],
                    "runners_stolen_bases": cat_row["runners_stolen_bases"],
                    "runners_caught_stealing": cat_row["runners_caught_stealing"],
                    "innings_per_game": innings_per_game,
                    **dict(player_row),
                    "player_number": pt_row["player_number"]
                }
                updated_players.append(calculate_derived_stats(full_player))
                
        conn.commit()
        return updated_players
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def update_player_eligibility(player_id: int, eligible_positions: str):
    """Updates the allowed positions list for a specific player."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE players SET eligible_positions = %s WHERE id = %s;",
            (eligible_positions, player_id)
        )
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()

def search_players_global(query_str: str) -> list:
    """Searches all players in the database matching a name, returning them with their latest team context."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        search_pattern = f"%{query_str.strip()}%"
        cursor.execute(
            """
            SELECT p.id, p.player_name, p.batting_hand, p.throwing_hand, p.eligible_positions, t.team_name, t.season
            FROM players p
            LEFT JOIN LATERAL (
                SELECT pt.team_id
                FROM players_teams pt
                WHERE pt.player_id = p.id
                ORDER BY pt.team_id DESC
                LIMIT 1
            ) latest ON TRUE
            LEFT JOIN teams t ON latest.team_id = t.id
            WHERE p.player_name ILIKE %s
            ORDER BY p.player_name ASC
            LIMIT 20;
            """,
            (search_pattern,)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        conn.close()

def get_team_players_career(team_id: int) -> list:
    """Retrieves all players on a team with their career-aggregated statistics across all seasons/teams.
    Optimized to run in a single SQL query instead of sequential loop queries.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Helper to generate SQL snippet for fractional innings summation
        def sql_sum_fractional(col_name: str) -> str:
            return f"""
            COALESCE(
                FLOOR(SUM(FLOOR(COALESCE({col_name}, 0)) * 3 + ROUND((COALESCE({col_name}, 0) - FLOOR(COALESCE({col_name}, 0))) * 10)) / 3) + 
                (CAST(SUM(FLOOR(COALESCE({col_name}, 0)) * 3 + ROUND((COALESCE({col_name}, 0) - FLOOR(COALESCE({col_name}, 0))) * 10)) AS INTEGER) %% 3) / 10.0,
                0.0
            )
            """

        query = f"""
        SELECT 
            p.id, pt.team_id, p.player_name, pt.player_number, p.batting_hand, p.throwing_hand, p.parent_player_id, p.created_at, p.updated_at, p.eligible_positions,
            COALESCE(t.innings_per_game, 7) as innings_per_game,
            COALESCE(gp_agg.games_played, 0) as games_played,
            
            COALESCE(o.plate_appearances, 0) as plate_appearances,
            COALESCE(o.at_bats, 0) as at_bats,
            COALESCE(o.singles, 0) as singles,
            COALESCE(o.doubles, 0) as doubles,
            COALESCE(o.triples, 0) as triples,
            COALESCE(o.home_runs, 0) as home_runs,
            COALESCE(o.walks, 0) as walks,
            COALESCE(o.strikeouts, 0) as strikeouts,
            COALESCE(o.hit_by_pitches, 0) as hit_by_pitches,
            COALESCE(o.stolen_bases, 0) as stolen_bases,
            COALESCE(o.caught_stealing, 0) as caught_stealing,
            COALESCE(o.runs_scored, 0) as runs_scored,
            COALESCE(o.runs_batted_in, 0) as runs_batted_in,
            COALESCE(o.reached_on_error, 0) as reached_on_error,
            
            COALESCE(ps.games_pitched, 0) as games_pitched,
            COALESCE(ps.games_started, 0) as games_started,
            COALESCE(ps.batters_faced, 0) as batters_faced,
            COALESCE(ps.number_of_pitches, 0) as number_of_pitches,
            COALESCE(ps.hits_allowed, 0) as hits_allowed,
            COALESCE(ps.runs_allowed, 0) as runs_allowed,
            COALESCE(ps.earned_runs, 0) as earned_runs,
            COALESCE(ps.walks_allowed, 0) as walks_allowed,
            COALESCE(ps.strikeouts_thrown, 0) as strikeouts_thrown,
            COALESCE(ps.hit_by_pitches_allowed, 0) as hit_by_pitches_allowed,
            COALESCE(ps.left_on_base, 0) as left_on_base,
            COALESCE(ps.innings_pitched, 0.0) as innings_pitched,
            
            COALESCE(c.passed_balls_allowed, 0) as passed_balls_allowed,
            COALESCE(c.runners_stolen_bases, 0) as runners_stolen_bases,
            COALESCE(c.runners_caught_stealing, 0) as runners_caught_stealing,
            COALESCE(c.innings_caught, 0.0) as innings_caught,
            
            COALESCE(d.total_chances, 0) as total_chances,
            COALESCE(d.assists, 0) as assists,
            COALESCE(d.putouts, 0) as putouts,
            COALESCE(d.errors, 0) as errors,
            COALESCE(d.innings_p, 0.0) as innings_p,
            COALESCE(d.innings_c, 0.0) as innings_c,
            COALESCE(d.innings_1b, 0.0) as innings_1b,
            COALESCE(d.innings_2b, 0.0) as innings_2b,
            COALESCE(d.innings_3b, 0.0) as innings_3b,
            COALESCE(d.innings_ss, 0.0) as innings_ss,
            COALESCE(d.innings_lf, 0.0) as innings_lf,
            COALESCE(d.innings_cf, 0.0) as innings_cf,
            COALESCE(d.innings_rf, 0.0) as innings_rf
        FROM players p
        JOIN players_teams pt ON p.id = pt.player_id
        LEFT JOIN teams t ON pt.team_id = t.id
        LEFT JOIN (
            SELECT player_id, SUM(games_played) as games_played
            FROM players_teams
            GROUP BY player_id
        ) gp_agg ON p.id = gp_agg.player_id
        LEFT JOIN (
            SELECT player_id,
                SUM(plate_appearances) as plate_appearances,
                SUM(at_bats) as at_bats,
                SUM(singles) as singles,
                SUM(doubles) as doubles,
                SUM(triples) as triples,
                SUM(home_runs) as home_runs,
                SUM(walks) as walks,
                SUM(strikeouts) as strikeouts,
                SUM(hit_by_pitches) as hit_by_pitches,
                SUM(stolen_bases) as stolen_bases,
                SUM(caught_stealing) as caught_stealing,
                SUM(runs_scored) as runs_scored,
                SUM(runs_batted_in) as runs_batted_in,
                SUM(reached_on_error) as reached_on_error
            FROM offensive_stats
            GROUP BY player_id
        ) o ON p.id = o.player_id
        LEFT JOIN (
            SELECT player_id,
                SUM(games_pitched) as games_pitched,
                SUM(games_started) as games_started,
                SUM(batters_faced) as batters_faced,
                SUM(number_of_pitches) as number_of_pitches,
                SUM(hits) as hits_allowed,
                SUM(runs) as runs_allowed,
                SUM(earned_runs) as earned_runs,
                SUM(walks) as walks_allowed,
                SUM(strikeouts) as strikeouts_thrown,
                SUM(hit_by_pitches) as hit_by_pitches_allowed,
                SUM(left_on_base) as left_on_base,
                {sql_sum_fractional('innings_pitched')} as innings_pitched
            FROM pitching_stats
            GROUP BY player_id
        ) ps ON p.id = ps.player_id
        LEFT JOIN (
            SELECT player_id,
                SUM(passed_balls_allowed) as passed_balls_allowed,
                SUM(runners_stolen_bases) as runners_stolen_bases,
                SUM(runners_caught_stealing) as runners_caught_stealing,
                {sql_sum_fractional('innings_caught')} as innings_caught
            FROM catching_stats
            GROUP BY player_id
        ) c ON p.id = c.player_id
        LEFT JOIN (
            SELECT player_id,
                SUM(total_chances) as total_chances,
                SUM(assists) as assists,
                SUM(putouts) as putouts,
                SUM(errors) as errors,
                {sql_sum_fractional('innings_p')} as innings_p,
                {sql_sum_fractional('innings_c')} as innings_c,
                {sql_sum_fractional('innings_1b')} as innings_1b,
                {sql_sum_fractional('innings_2b')} as innings_2b,
                {sql_sum_fractional('innings_3b')} as innings_3b,
                {sql_sum_fractional('innings_ss')} as innings_ss,
                {sql_sum_fractional('innings_lf')} as innings_lf,
                {sql_sum_fractional('innings_cf')} as innings_cf,
                {sql_sum_fractional('innings_rf')} as innings_rf
            FROM defensive_stats
            GROUP BY player_id
        ) d ON p.id = d.player_id
        WHERE pt.team_id = %s
        ORDER BY p.player_name ASC;
        """
        cursor.execute(query, (team_id,))
        rows = cursor.fetchall()
        
        from src.db.metrics import calculate_derived_stats
        return [calculate_derived_stats(dict(row)) for row in rows]
    finally:
        cursor.close()
        conn.close()
