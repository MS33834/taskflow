// Notes Slice — 笔记管理状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { Note } from '../../types';
import { generateId } from '../constants';

export interface NotesSlice {
  notes: Note[];
  selectedNote: Note | null;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  selectNote: (note: Note | null) => void;
  archiveNote: (id: string) => void;
  pinNote: (id: string) => void;
}

export const createNotesSlice: StateCreator<AppStore, [], [], NotesSlice> = (set, get) => ({
  notes: [],
  selectedNote: null,

  addNote: (note) => {
    const id = generateId();
    const newNote: Note = {
      ...note,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ notes: [...state.notes, newNote] }));
    get().saveData();
    return id;
  },

  updateNote: (id, updates) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
      ),
    }));
    get().saveData();
  },

  deleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
    }));
    get().saveData();
  },

  selectNote: (note) => set({ selectedNote: note }),

  archiveNote: (id) => {
    get().updateNote(id, { isArchived: true });
  },

  pinNote: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (note) {
      get().updateNote(id, { isPinned: !note.isPinned });
    }
  },
});
