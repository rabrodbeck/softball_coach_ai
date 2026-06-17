def add_fractional_innings(val1: float, val2: float) -> float:
    """Correctly adds two softball fractional innings values.
    Example: 4.2 + 2.1 = 7.0 and not 6.3 (4 full innings and 2 outs + 2 full innings and 1 out = 7 full innings)
    """
    def to_outs(val: float) -> int:
        whole = int(val)
        fraction = round(val - whole, 1)
        outs = whole * 3
        if fraction == 0.1:
            outs += 1
        elif fraction == 0.2:
            outs += 2
        return outs

    total_outs = to_outs(val1) + to_outs(val2)
    whole_innings = total_outs // 3
    remaining_outs = total_outs % 3

    if remaining_outs == 0:
        return float(whole_innings)
    elif remaining_outs == 1:
        return whole_innings + 0.1
    elif remaining_outs == 2:
        return whole_innings + 0.2
    return 0.0

def convert_ip_to_actual(ip: float) -> float:
    """Converts scoring notation (ex: 4.1, 4.2) to actual decimal innings (ex: 4.333, 4.667)."""
    whole = int(ip)
    fraction = round(ip - whole, 1)
    if fraction == 0.1:
        return whole + 0.333
    elif fraction == 0.2:
        return whole + 0.667
    return float(whole)

def calculate_derived_pitching_stats(stats: dict, innings_per_game: int = 7):
    """Calculates ERA, WHIP, K/7, BB/7, pitches per inning, and K/BB ratio based on 7-inning game."""
    ip = float(stats.get("innings_pitched", 0.0))
    er = stats.get("earned_runs", 0)
    bb = stats.get("walks_allowed", 0)
    hits = stats.get("hits_allowed", 0)
    so = stats.get("strikeouts_thrown", 0)
    pitches = stats.get("number_of_pitches", 0)

    # 1. Convert innings pitches to actual float value using helper (converting fractions to decimals)
    actual_ip = convert_ip_to_actual(ip)

    # 2. Calculate ERA, WHIP, K/7, BB/7, and Pitches/Inning
    if actual_ip > 0:
        era = (er * innings_per_game) / actual_ip
        whip = (bb + hits) / actual_ip
        k7 = (so * innings_per_game) / actual_ip
        bb7 = (bb * innings_per_game) / actual_ip
        pitches_per_inning = pitches / actual_ip
    else:
        era = 0.0
        whip = 0.0
        k7 = 0.0
        bb7 = 0.0
        pitches_per_inning = 0.0

    # 3. Calculate strikeout to walk ratio
    k_bb_ratio = so / bb if bb > 0 else float(so)

    result = dict(stats)
    result["era"] = round(era, 2)
    result["whip"] = round(whip, 2)
    result["k7"] = round(k7, 2)
    result["bb7"] = round(bb7, 2)
    result["pitches_per_inning"] = round(pitches_per_inning, 1)
    result["k_bb_ratio"] = round(k_bb_ratio, 1)
    return result

def calculate_derived_defensive_stats(stats: dict):
    """Calculates fielding percentage and caught stealing percentages for catcher."""
    tc = stats.get("total_chances", 0)
    po = stats.get("putouts", 0)
    ast = stats.get("assists", 0)

    # Fielding Percentage = (PO + A) / TC
    fielding_pct = (po + ast) / tc if tc > 0 else 0.0

    # Catcher Caught Stealing Percentage = CS / (SB + CS)
    sb = stats.get("runners_stolen_bases", 0)
    cs = stats.get("runners_caught_stealing", 0)
    attempts = sb + cs
    cs_pct = cs / attempts if attempts > 0 else 0.0

    result = dict(stats)
    result["fielding_percentage"] = round(fielding_pct, 3)
    result["caught_stealing_percentage"] = round(cs_pct, 3)
    return result

def calculate_derived_stats(player: dict):
    """Calculates htis, batting average, and on base percentage dynamically from raw stats."""
    # 1. Calculate hits
    singles = player.get("singles", 0)
    doubles = player.get("doubles", 0)
    triples = player.get("triples", 0)
    home_runs = player.get("home_runs", 0)
    hits = singles + doubles + triples + home_runs

    # 2. Calculate batting average (hits/at-bats)
    ab = player.get("at_bats", 0)
    avg = hits / ab if ab > 0 else 0.0

    # 3. Calculate on base percentage ((hits + walks + hbp) / plate appearances)
    bb = player.get("walks", 0)
    hbp = player.get("hit_by_pitches", 0)
    pa = player.get("plate_appearances", 0)
    obp = (hits + bb + hbp) / pa if pa > 0 else 0.0

    # 4. Calculate slugging percentage
    slg = (singles + 2 * doubles + 3 * triples + 4 * home_runs) / ab if ab > 0 else 0.0

    # 5. Calculate on base plus slugging
    ops = obp + slg

    # 6. Calculate isloated power
    iso = slg - avg

    # 7. Calculate walk-to-strikeout ratio
    k = player.get("strikeouts", 0)
    bb_k = bb / k if k > 0 else float(bb)

    # 8. Calculate stolen base success rate (stolen base percentage)
    sb = player.get("stolen_bases", 0)
    cs = player.get("caught_stealing", 0)
    attempts = sb + cs
    sb_pct = sb / attempts if attempts > 0 else 0.0

    # Return copies of the dict containing calculated fields
    result = dict(player)
    result["hits"] = hits
    result["batting_average"] = round(avg, 3)
    result["on_base_percentage"] = round(obp, 3)
    result["slugging_percentage"] = round(slg, 3)
    result["ops"] = round(ops, 3)
    result["isolated_power"] = round(iso, 3)
    result["bb_k_ratio"] = round(bb_k, 2)
    result["stolen_base_percentage"] = round(sb_pct, 3)

    
    # Chain pitching and defensive derivations together
    pitching_stats = calculate_derived_pitching_stats(result, result.get("innings_per_game", 7))
    return calculate_derived_defensive_stats(pitching_stats)

