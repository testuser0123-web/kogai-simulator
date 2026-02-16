import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TubeLength = 'short' | 'normal' | 'long';
export type MotionMode = 'static' | 'eight';

export interface Pattern {
  id: string;
  name: string;
  steps: number;
  data: { [tubeIndex: number]: number[] }; 
}

export interface SequenceItem {
  patternId: string;
  motionMode: MotionMode;
}

export interface ColorOption {
  id: string;
  name: string;
  value: string;
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  numTubes: number;
  tubeLengths: { [tubeIndex: number]: TubeLength };
  tubeColorIds: { [tubeIndex: number]: string };
  colorPalette: ColorOption[];
  isCircular: boolean;
  isLooping: boolean;
  brightnessMode: 'normal' | 'max';
  patterns: Pattern[];
  sequence: SequenceItem[];
  createdAt: number;
}

const sanitizePatterns = (patterns: any[]): Pattern[] => {
  if (!Array.isArray(patterns)) return [];
  return patterns.map(p => {
    const newData: { [key: number]: number[] } = {};
    if (p.data) {
      Object.entries(p.data).forEach(([tubeIdx, steps]: [string, any]) => {
        if (Array.isArray(steps)) {
          newData[parseInt(tubeIdx)] = steps.map(s => {
            if (typeof s === 'object' && s !== null) return (s as any).intensity ?? 0;
            return typeof s === 'number' ? s : 0;
          });
        }
      });
    }
    return { ...p, data: newData };
  });
};

interface SimulatorState {
  projects: Project[];
  currentProjectId: string;
  bpm: number;
  numTubes: number;
  tubeLengths: { [tubeIndex: number]: TubeLength };
  tubeColorIds: { [tubeIndex: number]: string };
  colorPalette: ColorOption[];
  isCircular: boolean;
  isLooping: boolean;
  brightnessMode: 'normal' | 'max';
  color: string;
  patterns: Pattern[];
  currentPatternId: string;
  sequence: SequenceItem[];
  currentSequenceIndex: number;
  isPlaying: boolean;
  currentStep: number;
  elapsedTime: number;
  isSettingsOpen: boolean;
  isFloating: boolean;
  isRecording: boolean;
  renderProgress: number;
  floatingPosition: { x: number; y: number } | null;

  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  switchProject: (id: string) => void;
  importProject: (projectData: any) => void;
  syncCurrentProject: () => void;
  toggleSettings: () => void;
  toggleFloating: () => void;
  setIsRecording: (isRecording: boolean) => void;
  setRenderProgress: (progress: number) => void;
  setFloatingPosition: (pos: { x: number; y: number } | null) => void;
  setElapsedTime: (t: number) => void;
  
  setBpm: (bpm: number) => void;
  setNumTubes: (n: number) => void;
  setTubeLength: (tubeIndex: number, length: TubeLength) => void;
  setTubeColorId: (tubeIndex: number, colorId: string) => void;
  addColorToPalette: (name: string, value: string) => void;
  renamePaletteColor: (id: string, name: string) => void;
  updatePaletteColorValue: (id: string, value: string) => void;
  deletePaletteColor: (id: string) => void;
  setIsCircular: (c: boolean) => void;
  setIsLooping: (l: boolean) => void;
  setBrightnessMode: (mode: 'normal' | 'max') => void;
  setColor: (color: string) => void;
  addPattern: () => void;
  setCurrentPatternId: (id: string) => void;
  insertToSequence: (patternId: string) => void;
  removeFromSequence: (index: number) => void;
  reorderSequence: (from: number, to: number) => void;
  setCurrentSequenceIndex: (index: number) => void;
  setSequenceMotionMode: (index: number, mode: MotionMode) => void;
  updatePatternStep: (patternId: string, tubeIndex: number, stepIndex: number, intensity: number) => void;
  togglePlay: () => void;
  stopPlay: () => void;
  setCurrentStep: (step: number) => void;
  renamePattern: (id: string, name: string) => void;
  deletePattern: (id: string) => void;
  copyTubeData: (patternId: string, fromIndex: number, toIndex: number) => void;
  shiftTubeData: (patternId: string, tubeIndex: number, direction: 'left' | 'right') => void;
  clearTubeData: (patternId: string, tubeIndex: number) => void;
}

const DEFAULT_PATTERN_ID = 'p1';
const DEFAULT_PATTERN: Pattern = { id: DEFAULT_PATTERN_ID, name: 'Pattern 1', steps: 32, data: {} };
const DEFAULT_COLOR: ColorOption = { id: 'c1', name: 'Default', value: '#00ffff' };

const createInitialProject = (id: string, name: string): Project => ({
  id, name, bpm: 120, numTubes: 10, tubeLengths: {}, tubeColorIds: {}, colorPalette: [{ ...DEFAULT_COLOR }],
  isCircular: false, isLooping: true, brightnessMode: 'normal', patterns: [{ ...DEFAULT_PATTERN }],
  sequence: [{ patternId: DEFAULT_PATTERN_ID, motionMode: 'static' }], createdAt: Date.now(),
});

export const useStore = create<SimulatorState>()(
  persist(
    (set, get) => ({
      projects: [createInitialProject('default-proj', 'My First Project')],
      currentProjectId: 'default-proj',
      bpm: 120, numTubes: 10, tubeLengths: {}, tubeColorIds: {}, colorPalette: [DEFAULT_COLOR],
      isCircular: false, isLooping: true, brightnessMode: 'normal', color: '#00ffff',
      patterns: [DEFAULT_PATTERN], currentPatternId: DEFAULT_PATTERN_ID,
      sequence: [{ patternId: DEFAULT_PATTERN_ID, motionMode: 'static' }],
      currentSequenceIndex: 0, isPlaying: false, currentStep: 0, elapsedTime: 0,
      isSettingsOpen: false, isFloating: false, isRecording: false, renderProgress: 0, floatingPosition: null,

      addProject: (name: string) => {
        const id = `proj-${Date.now()}`;
        const newProject = createInitialProject(id, name);
        set((state) => ({ projects: [...state.projects, newProject] }));
        get().switchProject(id);
      },
      deleteProject: (id: string) => {
        const state = get();
        if (state.projects.length <= 1) return;
        const newProjects = state.projects.filter(p => p.id !== id);
        set({ projects: newProjects });
        if (state.currentProjectId === id) get().switchProject(newProjects[0].id);
      },
      renameProject: (id: string, name: string) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, name } : p)
      })),
      switchProject: (id: string) => {
        const state = get();
        const nextProj = state.projects.find(p => p.id === id);
        if (!nextProj) return;
        set({
          currentProjectId: id,
          bpm: nextProj.bpm,
          numTubes: nextProj.numTubes,
          tubeLengths: nextProj.tubeLengths,
          tubeColorIds: nextProj.tubeColorIds,
          colorPalette: nextProj.colorPalette,
          isCircular: nextProj.isCircular,
          isLooping: nextProj.isLooping,
          brightnessMode: nextProj.brightnessMode,
          patterns: nextProj.patterns,
          sequence: nextProj.sequence,
          currentPatternId: nextProj.patterns[0].id,
          currentSequenceIndex: 0, 
          currentStep: 0, 
          isPlaying: false, 
          elapsedTime: 0
        });
      },
      importProject: (projectData: any) => {
        const id = `imported-${Date.now()}`;
        const cleanedPatterns = sanitizePatterns(projectData.patterns || []);
        const newProject: Project = { ...projectData, patterns: cleanedPatterns, id, createdAt: Date.now() };
        set((state) => ({ projects: [...state.projects, newProject] }));
        get().switchProject(id);
      },
      syncCurrentProject: () => {
        const state = get();
        set({
          projects: state.projects.map(p => p.id === state.currentProjectId ? {
            ...p, bpm: state.bpm, numTubes: state.numTubes, tubeLengths: state.tubeLengths,
            tubeColorIds: state.tubeColorIds, colorPalette: state.colorPalette, isCircular: state.isCircular,
            isLooping: state.isLooping, brightnessMode: state.brightnessMode, patterns: state.patterns, sequence: state.sequence,
          } : p)
        });
      },
      toggleSettings: () => set({ isSettingsOpen: !get().isSettingsOpen }),
      toggleFloating: () => set({ isFloating: !get().isFloating }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setRenderProgress: (renderProgress) => set({ renderProgress }),
      setFloatingPosition: (floatingPosition) => set({ floatingPosition }),
      setElapsedTime: (elapsedTime) => set({ elapsedTime }),
      setBpm: (bpm) => { set({ bpm }); get().syncCurrentProject(); },
      setNumTubes: (numTubes) => { set({ numTubes }); get().syncCurrentProject(); },
      setTubeLength: (idx, len) => { set({ tubeLengths: { ...get().tubeLengths, [idx]: len } }); get().syncCurrentProject(); },
      setTubeColorId: (idx, cid) => { set({ tubeColorIds: { ...get().tubeColorIds, [idx]: cid } }); get().syncCurrentProject(); },
      addColorToPalette: (name, value) => { set({ colorPalette: [...get().colorPalette, { id: `c${Date.now()}`, name, value }] }); get().syncCurrentProject(); },
      renamePaletteColor: (id, name) => { set({ colorPalette: get().colorPalette.map(c => c.id === id ? { ...c, name } : c) }); get().syncCurrentProject(); },
      updatePaletteColorValue: (id, value) => { set({ colorPalette: get().colorPalette.map(c => c.id === id ? { ...c, value } : c) }); get().syncCurrentProject(); },
      deletePaletteColor: (id) => {
        const newPalette = get().colorPalette.filter(c => c.id !== id);
        if (newPalette.length > 0) { set({ colorPalette: newPalette }); get().syncCurrentProject(); }
      },
      setIsCircular: (v) => { set({ isCircular: v }); get().syncCurrentProject(); },
      setIsLooping: (v) => { set({ isLooping: v }); get().syncCurrentProject(); },
      setBrightnessMode: (v) => { set({ brightnessMode: v }); get().syncCurrentProject(); },
      setColor: (v) => { set({ color: v }); get().syncCurrentProject(); },
      addPattern: () => {
        const id = `p${Date.now()}`;
        set({ patterns: [...get().patterns, { id, name: `Pattern ${get().patterns.length + 1}`, steps: 32, data: {} }], currentPatternId: id });
        get().syncCurrentProject();
      },
      setCurrentPatternId: (id) => set({ currentPatternId: id, currentStep: 0 }),
      insertToSequence: (pid) => {
        const newSeq = [...get().sequence];
        newSeq.splice(get().currentSequenceIndex + 1, 0, { patternId: pid, motionMode: 'static' });
        set({ sequence: newSeq, currentSequenceIndex: get().currentSequenceIndex + 1, currentPatternId: pid, currentStep: 0 });
        get().syncCurrentProject();
      },
      removeFromSequence: (idx) => {
        const newSeq = get().sequence.filter((_, i) => i !== idx);
        set({ sequence: newSeq, currentSequenceIndex: Math.max(0, Math.min(get().currentSequenceIndex, newSeq.length - 1)) });
        get().syncCurrentProject();
      },
      reorderSequence: (from, to) => {
        const newSeq = [...get().sequence];
        const [moved] = newSeq.splice(from, 1);
        newSeq.splice(to, 0, moved);
        set({ sequence: newSeq });
        get().syncCurrentProject();
      },
      setCurrentSequenceIndex: (idx) => {
        const item = get().sequence[idx];
        if (item) set({ currentSequenceIndex: idx, currentPatternId: item.patternId, currentStep: 0 });
      },
      setSequenceMotionMode: (idx, mode) => {
        set({ sequence: get().sequence.map((item, i) => i === idx ? { ...item, motionMode: mode } : item) });
        get().syncCurrentProject();
      },
      renamePattern: (id, name) => { set({ patterns: get().patterns.map(p => p.id === id ? { ...p, name } : p) }); get().syncCurrentProject(); },
      deletePattern: (id) => {
        if (get().patterns.length <= 1) return;
        const newPatterns = get().patterns.filter(p => p.id !== id);
        set({ patterns: newPatterns, currentPatternId: newPatterns[0].id });
        get().syncCurrentProject();
      },
      updatePatternStep: (pid, tidx, sidx, val) => {
        set({ patterns: get().patterns.map(p => {
          if (p.id !== pid) return p;
          const newData = { ...p.data };
          if (!newData[tidx]) newData[tidx] = Array(p.steps).fill(0);
          newData[tidx][sidx] = val;
          return { ...p, data: newData };
        }) });
        get().syncCurrentProject();
      },
      copyTubeData: (pid, from, to) => {
        set({ patterns: get().patterns.map(p => p.id === pid ? { ...p, data: { ...p.data, [to]: [...(p.data[from] || [])] } } : p) });
        get().syncCurrentProject();
      },
      shiftTubeData: (pid, tidx, dir) => {
        set({ patterns: get().patterns.map(p => {
          if (p.id !== pid || !p.data[tidx]) return p;
          const newSteps = [...p.data[tidx]];
          if (dir === 'right') { const last = newSteps.pop()!; newSteps.unshift(last); }
          else { const first = newSteps.shift()!; newSteps.push(first); }
          return { ...p, data: { ...p.data, [tidx]: newSteps } };
        }) });
        get().syncCurrentProject();
      },
      clearTubeData: (pid, tidx) => {
        set({ patterns: get().patterns.map(p => (p.id === pid ? { ...p, data: { ...p.data, [tidx]: Array(p.steps).fill(0) } } : p)) });
        get().syncCurrentProject();
      },
      togglePlay: () => set({ isPlaying: !get().isPlaying }),
      stopPlay: () => set({ isPlaying: false, currentStep: 0, currentSequenceIndex: 0, currentPatternId: get().sequence[0]?.patternId || get().currentPatternId }),
      setCurrentStep: (step) => set({ currentStep: step }),
    }),
    { name: 'kogai-simulator-v2', storage: createJSONStorage(() => localStorage) }
  )
);
