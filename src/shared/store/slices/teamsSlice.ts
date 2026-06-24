// Teams Slice — 团队与活动管理状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { Team, TeamMember, Activity } from '../../types';
import { generateId } from '../constants';

export interface TeamsSlice {
  teams: Team[];
  currentTeam: Team | null;
  activities: Activity[];
  addTeam: (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  setCurrentTeam: (team: Team | null) => void;
  addTeamMember: (teamId: string, member: Omit<TeamMember, 'id' | 'joinedAt'>) => void;
  removeTeamMember: (teamId: string, memberId: string) => void;
  updateTeamMember: (teamId: string, memberId: string, updates: Partial<TeamMember>) => void;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => void;
}

export const createTeamsSlice: StateCreator<AppStore, [], [], TeamsSlice> = (set, get) => ({
  teams: [],
  currentTeam: null,
  activities: [],

  addTeam: (team) => {
    const id = generateId();
    const newTeam: Team = {
      ...team,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ teams: [...state.teams, newTeam] }));
    get().saveData();
    return id;
  },

  updateTeam: (id, updates) => {
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === id ? { ...team, ...updates, updatedAt: new Date() } : team
      ),
    }));
    get().saveData();
  },

  deleteTeam: (id) => {
    set((state) => ({
      teams: state.teams.filter((team) => team.id !== id),
      currentTeam: state.currentTeam?.id === id ? null : state.currentTeam,
    }));
    get().saveData();
  },

  setCurrentTeam: (team) => set({ currentTeam: team }),

  addTeamMember: (teamId, member) => {
    const team = get().teams.find((t) => t.id === teamId);
    if (team) {
      get().updateTeam(teamId, {
        members: [...team.members, { ...member, id: generateId(), joinedAt: new Date() } as TeamMember],
      });
    }
  },

  removeTeamMember: (teamId, memberId) => {
    const team = get().teams.find((t) => t.id === teamId);
    if (team) {
      get().updateTeam(teamId, {
        members: team.members.filter((m) => m.id !== memberId),
      });
    }
  },

  updateTeamMember: (teamId, memberId, updates) => {
    const team = get().teams.find((t) => t.id === teamId);
    if (team) {
      get().updateTeam(teamId, {
        members: team.members.map((m) => (m.id === memberId ? { ...m, ...updates } : m)),
      });
    }
  },

  addActivity: (activity) => {
    const newActivity: Activity = {
      ...activity,
      id: generateId(),
      createdAt: new Date(),
    };
    set((state) => ({ activities: [newActivity, ...state.activities].slice(0, 100) }));
    get().saveData();
  },
});
