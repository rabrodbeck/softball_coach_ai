import psycopg2
import json
from src.db.pool import get_db_connection
from src.db.coaches import check_is_head_coach

def create_team(coach_id: int, team_name: str, season: str, age_group: str, innings_per_game: int = 7):
    """Creates a new team and registers the creator as the Head Coach."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Insert team
        cursor.execute(
            """
            INSERT INTO teams (team_name, season, age_group, innings_per_game)
            VALUES (%s, %s, %s, %s)
            RETURNING id, team_name, season, age_group, wins, losses, ties, innings_per_game;
            """,
            (team_name.strip(), season.strip(), age_group, innings_per_game)
        )
        new_team = cursor.fetchone()
        team_id = new_team["id"]

        # 2. Automatically make this coach the Head Coach and set it to active
        cursor.execute(
            """
            INSERT INTO team_coaches (team_id, coach_id, role, is_active)
            VALUES (%s, %s, 'Head Coach', true)
            ON CONFLICT (team_id, coach_id) DO UPDATE SET is_active = true;
            """,
            (team_id, coach_id)
        )
        
        # De-activate all other teams for this coach
        cursor.execute(
            "UPDATE team_coaches SET is_active = false WHERE coach_id = %s AND team_id != %s", 
            (coach_id, team_id)
        )
        
        conn.commit()
        team_dict = dict(new_team)
        team_dict["role"] = "Head Coach"
        team_dict["is_active"] = True
        return team_dict
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def get_coach_teams(coach_id: int):
    """Retrieves all teams associated with a specific coach, along with their role."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT t.id, t.team_name, t.season, t.age_group, t.wins, t.losses, t.ties, t.innings_per_game,
                   tc.role, tc.is_active
            FROM teams t
            JOIN team_coaches tc ON t.id = tc.team_id
            WHERE tc.coach_id = %s
            ORDER BY tc.created_at DESC;
            """,
            (coach_id,)
        )
        teams = cursor.fetchall()
        return [dict(team) for team in teams]
    finally:
        cursor.close()
        conn.close()


def set_active_team(coach_id: int, team_id: int):
    """Sets a specific team as active for this coach and deactivates others."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. De-activate all teams for this coach in join table
        cursor.execute(
            "UPDATE team_coaches SET is_active = false WHERE coach_id = %s", (coach_id,)
        )
        # 2. Activate the selected team
        cursor.execute(
            """
            UPDATE team_coaches 
            SET is_active = true 
            WHERE coach_id = %s AND team_id = %s
            RETURNING team_id;
            """,
            (coach_id, team_id)
        )
        cursor.fetchone()
        conn.commit()
        
        # Return updated team list
        return get_coach_teams(coach_id)
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def update_team(coach_id: int, team_id: int, team_name: str, season: str, wins: int, losses: int, ties: int, age_group: str, is_active: bool, innings_per_game: int = 7):
    """Updates team parameters. Refuses if the user is not a Head Coach."""
    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can edit this team.")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE teams
            SET team_name = %s, season = %s, wins = %s, losses = %s, ties = %s, age_group = %s, innings_per_game = %s
            WHERE id = %s
            RETURNING *;
            """,
            (team_name.strip(), season.strip(), wins, losses, ties, age_group, innings_per_game, team_id)
        )
        row = cursor.fetchone()
        
        # Update active state in join table
        cursor.execute(
            "UPDATE team_coaches SET is_active = %s WHERE coach_id = %s AND team_id = %s",
            (is_active, coach_id, team_id)
        )
        
        conn.commit()
        return dict(row) if row else None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def save_team_lineup(team_id: int, coach_id: int, game_date: str, opponent: str, innings_count: int, lineup_data: dict):
    """Saves or overwrites a team lineup for a specific game."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if game lineup already exists to overwrite it
        cursor.execute(
            "SELECT id FROM lineups WHERE team_id = %s AND game_date = %s AND opponent = %s LIMIT 1;",
            (team_id, game_date, opponent)
        )
        existing = cursor.fetchone()

        import json
        json_data = json.dumps(lineup_data)

        if existing:
            cursor.execute(
                "UPDATE lineups SET innings_count = %s, lineup_data = %s, created_by_coach_id = %s WHERE id = %s RETURNING id;",
                (innings_count, json_data, coach_id, existing["id"])
            )
        else:
            cursor.execute(
                "INSERT INTO lineups (team_id, created_by_coach_id, game_date, opponent, innings_count, lineup_data) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;",
                (team_id, coach_id, game_date, opponent, innings_count, json_data)
            )
        conn.commit()
        return cursor.fetchone()["id"]
    finally:
        cursor.close()
        conn.close()


def get_team_lineups(team_id: int):
    """Fetches all save lineups for a specificd team."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, game_date, opponent, innings_count, lineup_data, created_at FROM lineups where team_id = %s ORDER BY game_date DESC, created_at DESC;",
            (team_id,)
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def delete_team_lineup(lineup_id: int):
    """Deletes a saved lineup."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM lineups WHERE id = %s;", (lineup_id,))
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()
