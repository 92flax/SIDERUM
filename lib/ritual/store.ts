// ============================================================
// ÆONIS – Ritual Engine Store (State Machine)
// Fetches rituals from Sanity CMS, falls back to local DB
// ============================================================

import { create } from 'zustand';
import { Ritual, RitualStep, RitualPlayerState } from './types';
import { getRituals as fetchCmsRituals } from '../cms/sanity';
import localRitualsData from './rituals_db.json';

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
  isLoadingRituals: boolean;
  ritualsSource: 'cms' | 'local' | 'none';
  cycleCount: number;

  // Actions
  loadRituals: () => Promise<void>;
  selectRitual: (id: string) => void;
  setIntent: (intent: RitualIntent) => void;
  setDynamicChoice: (choice: string | null) => void;
  startRitual: () => void;
  nextStep: () => void;
  prevStep: () => void;
  pauseRitual: () => void;
  resumeRitual: () => void;
  resetRitual: () => void;
  jumpToStep: (stepOrder: number) => void;
  setDirectionLocked: (locked: boolean) => void;
  setTracingDetected: (detected: boolean) => void;
  getCurrentStep: () => RitualStep | null;
}

/**
 * Map a CMS ritual document to our app Ritual type.
 * CMS uses `_id` / `title` / `steps` (array with order, action_type, etc.).
 * Local DB uses `id` / `name` / `steps`.
 */
function mapCmsRitualToLocal(cms: any): Ritual | null {
  // Must have steps to be usable
  const steps: RitualStep[] = Array.isArray(cms.steps)
    ? cms.steps
        .map((s: any) => ({
          order: s.order ?? 0,
          action_type: s.action_type ?? 'VISUALIZATION',
          instruction_text: s.instruction_text ?? '',
          compass_direction: s.compass_direction ?? undefined,
          ar_element: s.ar_element ?? undefined,
          audio_vibration: s.audio_vibration ?? undefined,
        }))
        .sort((a: RitualStep, b: RitualStep) => a.order - b.order)
    : [];

  if (steps.length === 0) return null; // Skip rituals without steps

  return {
    id: cms._id ?? cms.id ?? '',
    name: cms.title ?? cms.name ?? 'Unnamed Ritual',
    description: cms.description ?? '',
    tradition: cms.tradition ?? cms.element ?? 'General',
    intention: cms.intention ?? undefined,
    traditionTag: cms.traditionTag ?? undefined,
    supportsIntent: cms.supportsIntent ?? false,
    dynamicSelection: cms.dynamicSelection ?? 'none',
    isRepeatable: cms.isRepeatable ?? false,
    repeatFromStep: cms.repeatFromStep ?? undefined,
    steps,
  };
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
  isLoadingRituals: false,
  ritualsSource: 'none' as 'cms' | 'local' | 'none',
  cycleCount: 0,

  loadRituals: async () => {
    // Don't reload if already loaded
    if (get().rituals.length > 0) return;

    set({ isLoadingRituals: true });

    try {
      // 1) Try fetching from Sanity CMS first
      const cmsRituals = await fetchCmsRituals();

      if (cmsRituals && cmsRituals.length > 0) {
        // Fetch full ritual documents with steps (the GROQ query already fetches all fields)
        // But the SanityRitual type doesn't include steps – we need to fetch the full documents
        const fullRituals = await fetchFullCmsRituals();

        if (fullRituals.length > 0) {
          // Map CMS rituals to our Ritual type, filter out those without steps
          const mapped = fullRituals
            .map(mapCmsRitualToLocal)
            .filter((r): r is Ritual => r !== null);

          if (mapped.length > 0) {
            // Merge: CMS rituals take priority, add local-only rituals that aren't in CMS
            const cmsIds = new Set(mapped.map(r => r.name.toLowerCase()));
            const localOnly = (localRitualsData as Ritual[]).filter(
              r => !cmsIds.has(r.name.toLowerCase())
            );

            console.log(`[RitualStore] Loaded ${mapped.length} rituals from CMS, ${localOnly.length} local-only`);
            set({
              rituals: [...mapped, ...localOnly],
              isLoadingRituals: false,
              ritualsSource: 'cms',
            });
            return;
          }
        }
      }
    } catch (error) {
      console.warn('[RitualStore] CMS fetch failed, falling back to local:', error);
    }

    // 2) Fallback to local JSON
    console.log('[RitualStore] Using local rituals_db.json fallback');
    set({
      rituals: localRitualsData as Ritual[],
      isLoadingRituals: false,
      ritualsSource: 'local',
    });
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
      cycleCount: 0,
    });
  },

  jumpToStep: (stepOrder: number) => {
    const { currentRitual } = get();
    if (!currentRitual) return;

    // Find the step index where step.order === stepOrder
    const targetIndex = currentRitual.steps.findIndex(s => s.order === stepOrder);
    if (targetIndex === -1) {
      // Fallback: jump to first step if repeatFromStep not found
      const fallbackStep = currentRitual.steps[0];
      let state: RitualPlayerState = 'running';
      if (fallbackStep?.compass_direction) state = 'compass_lock';
      if (fallbackStep?.action_type === 'TRACE') state = 'tracing';
      set({
        currentStepIndex: 0,
        playerState: state,
        isDirectionLocked: false,
        isTracingDetected: false,
        cycleCount: get().cycleCount + 1,
      });
      return;
    }

    const targetStep = currentRitual.steps[targetIndex];
    let nextState: RitualPlayerState = 'running';
    if (targetStep.compass_direction) nextState = 'compass_lock';
    if (targetStep.action_type === 'TRACE') nextState = 'tracing';

    set({
      currentStepIndex: targetIndex,
      playerState: nextState,
      isDirectionLocked: false,
      isTracingDetected: false,
      cycleCount: get().cycleCount + 1,
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

// ─── Helper: Fetch full ritual documents from CMS (including steps) ───

import { sanityClient } from '../cms/sanity';

async function fetchFullCmsRituals(): Promise<any[]> {
  const query = `*[_type == "ritual"] | order(level_required asc) {
    _id,
    _type,
    title,
    slug,
    description,
    duration_minutes,
    element,
    level_required,
    xp_reward,
    instructions,
    planetary_association,
    tags,
    audio_url,
    supportsIntent,
    dynamicSelection,
    tradition,
    intention,
    traditionTag,
    isRepeatable,
    repeatFromStep,
    steps,
    "image": image { asset-> { _ref, url } }
  }`;

  try {
    const results = await sanityClient.fetch(query);
    return results || [];
  } catch (error) {
    console.warn('[RitualStore] Failed to fetch full CMS rituals:', error);
    return [];
  }
}
