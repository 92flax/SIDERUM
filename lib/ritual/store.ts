// ============================================================
// ÆONIS – Ritual Engine Store (State Machine)
// ============================================================

import { create } from 'zustand';
import { Ritual, RitualStep, RitualPlayerState } from './types';
import ritualsData from './rituals_db.json';

type RitualIntent = 'BANISH' | 'INVOKE';
type DynamicSelectionType = 'none' | 'element' | 'planet';

interface RitualState {
  rituals: Ritual[];
  currentRitual: Ritual | null;
  currentStepIndex: number;
  playerState: RitualPlayerState;
  isDirectionLocked: boolean;
  isTracingDetected: boolean;
  intent: RitualIntent;
  dynamicSelectionType: DynamicSelectionType;
  selectedDynamicChoice: string | null;

  // Actions
  loadRituals: () => void;
  selectRitual: (id: string) => void;
  setIntent: (intent: RitualIntent) => void;
  setDynamicChoice: (choice: string | null) => void;
  startRitual: () => void;
  nextStep: () => void;
  prevStep: () => void;
  pauseRitual: () => void;
  resumeRitual: () => void;
  resetRitual: () => void;
  setDirectionLocked: (locked: boolean) => void;
  setTracingDetected: (detected: boolean) => void;
  getCurrentStep: () => RitualStep | null;
}

export const useRitualStore = create<RitualState>((set, get) => ({
  rituals: [],
  currentRitual: null,
  currentStepIndex: 0,
  playerState: 'idle',
  isDirectionLocked: false,
  isTracingDetected: false,
  intent: 'BANISH' as RitualIntent,
  dynamicSelectionType: 'none' as DynamicSelectionType,
  selectedDynamicChoice: null as string | null,

  loadRituals: () => {
    set({ rituals: ritualsData as Ritual[] });
  },

  selectRitual: (id: string) => {
    const ritual = get().rituals.find(r => r.id === id) || null;
    const dynSel = (ritual?.dynamicSelection ?? 'none') as DynamicSelectionType;
    set({
      currentRitual: ritual,
      currentStepIndex: 0,
      playerState: 'idle',
      dynamicSelectionType: dynSel,
      selectedDynamicChoice: null,
    });
  },

  setIntent: (intent: RitualIntent) => {
    set({ intent });
  },

  setDynamicChoice: (choice: string | null) => {
    set({ selectedDynamicChoice: choice });
  },

  startRitual: () => {
    const { currentRitual } = get();
    if (!currentRitual || currentRitual.steps.length === 0) return;

    const firstStep = currentRitual.steps[0];
    const needsCompass = !!firstStep.compass_direction;
    set({
      currentStepIndex: 0,
      playerState: needsCompass ? 'compass_lock' : 'running',
      isDirectionLocked: false,
      isTracingDetected: false,
    });
  },

  nextStep: () => {
    const { currentRitual, currentStepIndex, playerState } = get();
    if (!currentRitual) return;

    // Block if compass locked and not aligned
    if (playerState === 'compass_lock' && !get().isDirectionLocked) return;
    // Block if tracing required and not detected
    if (playerState === 'tracing' && !get().isTracingDetected) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= currentRitual.steps.length) {
      set({ playerState: 'completed' });
      return;
    }

    const nextStep = currentRitual.steps[nextIndex];
    let nextState: RitualPlayerState = 'running';
    if (nextStep.compass_direction) nextState = 'compass_lock';
    if (nextStep.action_type === 'TRACE') nextState = 'tracing';

    set({
      currentStepIndex: nextIndex,
      playerState: nextState,
      isDirectionLocked: false,
      isTracingDetected: false,
    });
  },

  prevStep: () => {
    const { currentStepIndex, currentRitual } = get();
    if (!currentRitual || currentStepIndex <= 0) return;

    const prevIndex = currentStepIndex - 1;
    const prevStep = currentRitual.steps[prevIndex];
    let state: RitualPlayerState = 'running';
    if (prevStep.compass_direction) state = 'compass_lock';
    if (prevStep.action_type === 'TRACE') state = 'tracing';

    set({
      currentStepIndex: prevIndex,
      playerState: state,
      isDirectionLocked: false,
      isTracingDetected: false,
    });
  },

  pauseRitual: () => set({ playerState: 'paused' }),
  resumeRitual: () => {
    const { currentRitual, currentStepIndex } = get();
    if (!currentRitual) return;
    const step = currentRitual.steps[currentStepIndex];
    let state: RitualPlayerState = 'running';
    if (step?.compass_direction) state = 'compass_lock';
    if (step?.action_type === 'TRACE') state = 'tracing';
    set({ playerState: state });
  },

  resetRitual: () => {
    set({
      currentStepIndex: 0,
      playerState: 'idle',
      isDirectionLocked: false,
      isTracingDetected: false,
      dynamicSelectionType: 'none',
      selectedDynamicChoice: null,
    });
  },

  setDirectionLocked: (locked: boolean) => {
    set({ isDirectionLocked: locked });
    if (locked) {
      const step = get().getCurrentStep();
      if (step?.action_type === 'TRACE') {
        set({ playerState: 'tracing' });
      } else {
        set({ playerState: 'running' });
      }
    }
  },

  setTracingDetected: (detected: boolean) => {
    set({ isTracingDetected: detected });
    if (detected) {
      set({ playerState: 'running' });
    }
  },

  getCurrentStep: () => {
    const { currentRitual, currentStepIndex } = get();
    if (!currentRitual) return null;
    return currentRitual.steps[currentStepIndex] || null;
  },
}));
