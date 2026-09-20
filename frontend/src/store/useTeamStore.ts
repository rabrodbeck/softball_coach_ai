import { create } from 'zustand';
import type { Team, Player } from '../components/TeamManager/types';
import { apiFetch } from '../utils/api';

async function extractErrorMessage(response: Response, defaultMessage: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (typeof data?.detail === 'object' && Array.isArray(data.detail) && data.detail[0]?.msg) {
      return data.detail[0].msg;
    }
    if (typeof data?.message === 'string') return data.message;
  } catch {
    // Response body not JSON
  }
  return defaultMessage;
}

interface TeamState {
  teams: Team[];
  players: Player[];
  playerDirectory: Player[];
  selectedTeam: Team | null;
  selectedTeamId: number | null;
  userRole: 'Head Coach' | 'Assistant Coach' | null;
  isLoading: boolean;
  error: string | null;
  activeTeamCoaches: { head_coaches: string; assistant_coaches: string } | null;

  // Actions
  fetchTeams: (coachId: number, selectedTeamId?: number | null, onSelectTeam?: (team: Team) => void) => Promise<void>;
  selectTeam: (team: Team | null) => void;
  fetchPlayers: (teamId: number, scope?: 'season' | 'career') => Promise<void>;
  fetchPlayerDirectory: () => Promise<void>;
  fetchTeamCoaches: (teamId: number) => Promise<void>;
  createTeam: (
    coachId: number,
    teamName: string,
    season: string,
    ageGroup: string,
    inningsPerGame: number,
    onSelectTeam?: (team: Team) => void
  ) => Promise<void>;
  updateTeam: (
    coachId: number,
    teamId: number,
    teamName: string,
    season: string,
    wins: number,
    losses: number,
    ties: number,
    ageGroup: string,
    isActive: boolean,
    inningsPerGame: number
  ) => Promise<void>;
  createPlayer: (
    coachId: number,
    teamId: number,
    playerName: string,
    playerNumber: number,
    battingHand: string,
    throwingHand: string
  ) => Promise<void>;
  addReturningPlayer: (
    coachId: number,
    teamId: number,
    playerId: number,
    playerNumber: number
  ) => Promise<void>;
  updatePlayer: (
    coachId: number,
    playerId: number,
    playerData: Partial<Player>
  ) => Promise<void>;
  deletePlayer: (coachId: number, playerId: number) => Promise<void>;
  searchPlayers: (query: string) => Promise<Player[]>;
  setSelectedTeamId: (teamId: number | null) => void;
  setUserRole: (role: 'Head Coach' | 'Assistant Coach' | null) => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  players: [],
  playerDirectory: [],
  selectedTeam: null,
  selectedTeamId: null,
  userRole: null,
  isLoading: false,
  error: null,
  activeTeamCoaches: null,

  selectTeam: (team) => {
    set({
      selectedTeam: team,
      selectedTeamId: team ? team.id : null,
      userRole: (team?.role as 'Head Coach' | 'Assistant Coach') || null,
    });
  },

  fetchTeams: async (coachId, selectedTeamId, onSelectTeam) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`/api/teams/${coachId}`);
      if (response.ok) {
        const data: Team[] = await response.json();
        set({ teams: data });

        const targetId = selectedTeamId !== undefined ? selectedTeamId : get().selectedTeamId;
        let chosenTeam: Team | null = null;
        if (targetId) {
          chosenTeam = data.find((t: Team) => t.id === targetId) || null;
        }
        if (!chosenTeam) {
          chosenTeam = data.find((t: Team) => t.is_active) || (data.length > 0 ? data[0] : null);
        }

        if (chosenTeam) {
          if (onSelectTeam) onSelectTeam(chosenTeam);
          set({
            selectedTeam: chosenTeam,
            selectedTeamId: chosenTeam.id,
            userRole: (chosenTeam.role as 'Head Coach' | 'Assistant Coach') || null
          });
        }
      } else {
        const errMsg = await extractErrorMessage(response, 'Failed to fetch teams');
        set({ error: errMsg });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error fetching teams' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPlayers: async (teamId, scope) => {
    set({ isLoading: true, error: null });
    try {
      const scopeParam = scope || 'season';
      const response = await apiFetch(`/api/players/${teamId}?scope=${scopeParam}`);
      if (response.ok) {
        const data = await response.json();
        set({ players: data });
      } else {
        const errMsg = await extractErrorMessage(response, 'Failed to fetch players');
        set({ error: errMsg });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error fetching players' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTeamCoaches: async (teamId) => {
    try {
      const response = await apiFetch(`/api/teams/${teamId}/coaches`);
      if (response.ok) {
        const data = await response.json();
        set({ activeTeamCoaches: data });
      } else {
        set ({ activeTeamCoaches: null});
      }
    } catch (err) {
      console.error("Failed to fetch team coaches:", err);
      set({ activeTeamCoaches: null });
    }
  },

  fetchPlayerDirectory: async () => {
    try {
      const response = await apiFetch(`/api/players/directory`);
      if (response.ok) {
        const data = await response.json();
        set({ playerDirectory: data });
      }
    } catch (err) {
      console.error("Error fetching player directory:", err);
    }
  },

  createTeam: async (coachId, teamName, season, ageGroup, inningsPerGame, onSelectTeam) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`/api/teams`, {
        method: "POST",
        body: JSON.stringify({
          coach_id: coachId,
          team_name: teamName,
          season,
          age_group: ageGroup,
          innings_per_game: inningsPerGame
        })
      });
      if (response.ok) {
        const newTeam = await response.json();
        if (onSelectTeam) onSelectTeam(newTeam);
        set({ selectedTeam: newTeam, selectedTeamId: newTeam.id, userRole: 'Head Coach' });
        await get().fetchTeams(coachId, newTeam.id, onSelectTeam);
      } else {
        const errMsg = await extractErrorMessage(response, 'Failed to create team');
        set({ error: errMsg });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error creating team' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateTeam: async (coachId, teamId, teamName, season, wins, losses, ties, ageGroup, isActive, inningsPerGame) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`/api/teams/${teamId}`, {
        method: "PUT",
        body: JSON.stringify({
          coach_id: coachId,
          team_name: teamName,
          season,
          wins,
          losses,
          ties,
          age_group: ageGroup,
          is_active: isActive,
          innings_per_game: inningsPerGame
        })
      });
      if (response.ok) {
        // Refresh teams and keep selectedTeam synced
        const teamsResponse = await apiFetch(`/api/teams/${coachId}`);
        if (teamsResponse.ok) {
          const data: Team[] = await teamsResponse.json();
          const currentId = get().selectedTeamId;
          const updatedSelected = data.find((t: Team) => t.id === currentId) || null;
          set({
            teams: data,
            selectedTeam: updatedSelected,
            userRole: (updatedSelected?.role as 'Head Coach' | 'Assistant Coach') || null
          });
        }
      } else {
        const errMsg = await extractErrorMessage(response, 'Failed to update team');
        set({ error: errMsg });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error updating team' });
    } finally {
      set({ isLoading: false });
    }
  },

  createPlayer: async (coachId, teamId, playerName, playerNumber, battingHand, throwingHand) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`/api/players`, {
        method: "POST",
        body: JSON.stringify({
          coach_id: coachId,
          team_id: teamId,
          player_name: playerName,
          player_number: playerNumber,
          batting_hand: battingHand,
          throwing_hand: throwingHand
        })
      });
      if (response.ok) {
        await get().fetchPlayers(teamId);
      } else {
        const errMsg = await extractErrorMessage(response, 'Failed to create player');
        set({ error: errMsg });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error creating player' });
    } finally {
      set({ isLoading: false });
    }
  },

  addReturningPlayer: async (coachId, teamId, playerId, playerNumber) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`/api/players/returning`, {
        method: "POST",
        body: JSON.stringify({
          coach_id: coachId,
          team_id: teamId,
          player_id: playerId,
          player_number: playerNumber
        })
      });
      if (response.ok) {
        await get().fetchPlayers(teamId);
      } else {
        const errMsg = await extractErrorMessage(response, 'Failed to add returning player');
        set({ error: errMsg });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error adding returning player' });
    } finally {
      set({ isLoading: false });
    }
  },

  updatePlayer: async (coachId, playerId, playerData) => {
    set({ isLoading: true, error: null });
    try {
      const teamId = playerData.team_id || get().selectedTeamId;
      const response = await apiFetch(`/api/players/${playerId}`, {
        method: "PUT",
        body: JSON.stringify({
          coach_id: coachId,
          team_id: teamId,
          ...playerData
        })
      });
      if (response.ok) {
        if (teamId) {
          await get().fetchPlayers(teamId);
        }
      } else {
        const errMsg = await extractErrorMessage(response, 'Failed to update player');
        set({ error: errMsg });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error updating player' });
    } finally {
      set({ isLoading: false });
    }
  },

  deletePlayer: async (coachId, playerId) => {
    set({ isLoading: true, error: null });
    try {
      const teamId = get().selectedTeamId;
      const response = await apiFetch(`/api/players/${playerId}?coach_id=${coachId}&team_id=${teamId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        if (teamId) {
          await get().fetchPlayers(teamId);
        }
      } else {
        const errMsg = await extractErrorMessage(response, 'Failed to delete player');
        set({ error: errMsg });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error deleting player' });
    } finally {
      set({ isLoading: false });
    }
  },

  searchPlayers: async (query) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const response = await apiFetch(`/api/players/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error("Failed to search players:", err);
    }
    return [];
  },

  setSelectedTeamId: (teamId) => {
    if (teamId === null) {
      set({ selectedTeamId: null, selectedTeam: null, userRole: null });
      return;
    }
    const team = get().teams.find(t => t.id === teamId) || null;
    set({
      selectedTeamId: teamId,
      selectedTeam: team,
      userRole: (team?.role as 'Head Coach' | 'Assistant Coach') || null,
    });
  },
  setUserRole: (role) => set({ userRole: role }),
}));