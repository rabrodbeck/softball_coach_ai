import { create } from 'zustand';
import type { Team, Player } from '../components/TeamManager/types';
import { apiFetch } from '../utils/api';

interface TeamState {
  teams: Team[];
  players: Player[];
  playerDirectory: any[];
  selectedTeamId: number | null;
  userRole: 'Head Coach' | 'Assistant Coach' | null;
  isLoading: boolean;
  error: string | null;
  activeTeamCoaches: { head_coaches: string; asistant_coaches: string } | null;

  // Actions
  fetchTeams: (coachId: number, selectedTeamId: number | null, onSelectTeam: (team: Team) => void) => Promise<void>;
  fetchPlayers: (teamId: number) => Promise<void>;
  fetchPlayerDirectory: () => Promise<void>;
  fetchTeamCoaches: (teamId: number) => Promise<void>;
  createTeam: (
    coachId: number,
    teamName: string,
    season: string,
    ageGroup: string,
    inningsPerGame: number,
    onSelectTeam: (team: Team) => void
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
    playerData: any
  ) => Promise<void>;
  deletePlayer: (coachId: number, playerId: number) => Promise<void>;
  setSelectedTeamId: (teamId: number | null) => void;
  setUserRole: (role: 'Head Coach' | 'Assistant Coach' | null) => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  players: [],
  playerDirectory: [],
  selectedTeamId: null,
  userRole: null,
  isLoading: false,
  error: null,
  activeTeamCoaches: null,

  fetchTeams: async (coachId, selectedTeamId, onSelectTeam) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`/api/teams/${coachId}`);
      if (response.ok) {
        const data = await response.json();
        set({ teams: data });

        if (selectedTeamId) {
          const currentSelected = data.find((t: Team) => t.id === selectedTeamId);
          if (currentSelected) {
            onSelectTeam(currentSelected);
            set({ userRole: currentSelected.role || null });
          }
        } else {
          const defaultActive = data.find((t: Team) => t.is_active);
          if (defaultActive) {
            onSelectTeam(defaultActive);
            set({ selectedTeamId: defaultActive.id, userRole: defaultActive.role || null });
          }
        }
      } else {
        set({ error: 'Failed to fetch teams' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error fetching teams' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPlayers: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`/api/players/${teamId}`);
      if (response.ok) {
        const data = await response.json();
        set({ players: data });
      } else {
        set({ error: 'Failed to fetch players' });
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
        onSelectTeam(newTeam);
        set({ selectedTeamId: newTeam.id, userRole: 'Head Coach' });
        await get().fetchTeams(coachId, newTeam.id, onSelectTeam);
      } else {
        set({ error: 'Failed to create team' });
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
        // Refresh teams
        const teamsResponse = await apiFetch(`/api/teams/${coachId}`);
        if (teamsResponse.ok) {
          const data = await teamsResponse.json();
          set({ teams: data });
        }
      } else {
        set({ error: 'Failed to update team' });
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
        set({ error: 'Failed to create player' });
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
        set({ error: 'Failed to add returning player' });
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
      const teamId = get().selectedTeamId;
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
        set({ error: 'Failed to update player' });
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
        set({ error: 'Failed to delete player' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error deleting player' });
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedTeamId: (teamId) => set({ selectedTeamId: teamId }),
  setUserRole: (role) => set({ userRole: role }),
}));