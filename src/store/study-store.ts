import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { format } from "date-fns";
import { locate } from "@/data/curriculum";

export type Status = "todo" | "doing" | "done";
export type Tint = 0 | 1 | 2 | 3;
export type Confidence = 0 | 1 | 2 | 3;
export type ThemeId = "ink" | "paper" | "monsoon" | "temple";
export type Level = "sealed" | "subjects" | "strands" | "chapters";
export type DeskId = "now" | "timer" | "plan" | "strategy" | "tasks" | "studio" | "chapter";

export type ChapterProgress = {
  status: Status;
  note: string;
  alias: string;
  tint: Tint;
  confidence: Confidence;
  pinned: boolean;
  revisedAt: number | null;
};

export type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  chapterId: string | null;
  createdAt: number;
};

export type Session = {
  id: string;
  minutes: number;
  subjectId: string | null;
  at: number;
};

export type PlanBlock = {
  chapterId: string;
  minutes: number;
  review: boolean;
};

export type StudyPlan = {
  createdAt: number;
  note: string;
  days: { date: string; blocks: PlanBlock[] }[];
  unplaced: string[];
};

export type PlanConfig = {
  examDate: string;
  minutesPerDay: number;
  reviewDone: boolean;
};

export type StrategyMessage = {
  role: "you" | "desk";
  text: string;
  at: number;
};

type TimerState = {
  mode: "focus" | "break";
  running: boolean;
  endsAt: number | null;
  remainingMs: number;
  focusMin: number;
  breakMin: number;
  subjectId: string | null;
};

const emptyProgress = (): ChapterProgress => ({
  status: "todo",
  note: "",
  alias: "",
  tint: 0,
  confidence: 0,
  pinned: false,
  revisedAt: null,
});

export function readProgress(
  chapters: Record<string, ChapterProgress>,
  id: string,
): ChapterProgress {
  return chapters[id] ?? emptyProgress();
}

function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

function withDay(days: string[]) {
  const day = todayKey();
  return days.includes(day) ? days : [...days, day];
}

const seedThread: StrategyMessage[] = [
  {
    role: "desk",
    text: "Ask for today, your pace, what is slipping, or a revision list. I only read the ticks on this device.",
    at: 0,
  },
];

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

type StudyState = {
  theme: ThemeId;
  studioName: string;
  sound: boolean;
  level: Level;
  subjectId: string | null;
  strandId: string | null;
  chapterId: string | null;
  desk: DeskId;
  chapters: Record<string, ChapterProgress>;
  todos: TodoItem[];
  sessions: Session[];
  studyDays: string[];
  planConfig: PlanConfig;
  plan: StudyPlan | null;
  strategyThread: StrategyMessage[];
  timer: TimerState;
  setTheme: (theme: ThemeId) => void;
  setStudioName: (name: string) => void;
  setSound: (sound: boolean) => void;
  setDesk: (desk: DeskId) => void;
  openTitle: () => void;
  back: () => void;
  openSubject: (id: string) => void;
  openStrand: (id: string) => void;
  openChapter: (id: string) => void;
  patchChapter: (id: string, patch: Partial<ChapterProgress>) => void;
  cycleStatus: (id: string) => void;
  addTodo: (text: string, chapterId?: string | null) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  setPlanConfig: (patch: Partial<PlanConfig>) => void;
  setPlan: (plan: StudyPlan | null) => void;
  pushStrategy: (role: "you" | "desk", text: string) => void;
  setTimerSubject: (subjectId: string | null) => void;
  setLengths: (focusMin: number, breakMin: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  completeTimer: () => void;
  applyImport: (data: Partial<StudyState>) => void;
  resetProgress: () => void;
};

const baseTimer = (): TimerState => ({
  mode: "focus",
  running: false,
  endsAt: null,
  remainingMs: 45 * 60_000,
  focusMin: 45,
  breakMin: 10,
  subjectId: null,
});

export const useStudy = create<StudyState>()(
  persist(
    (set, get) => ({
      theme: "ink",
      studioName: "Foundation desk",
      sound: false,
      level: "sealed",
      subjectId: null,
      strandId: null,
      chapterId: null,
      desk: "now",
      chapters: {},
      todos: [],
      sessions: [],
      studyDays: [],
      planConfig: { examDate: "", minutesPerDay: 90, reviewDone: true },
      plan: null,
      strategyThread: seedThread,
      timer: baseTimer(),
      setTheme: (theme) => set({ theme }),
      setStudioName: (studioName) => set({ studioName: studioName.slice(0, 48) }),
      setSound: (sound) => set({ sound }),
      setDesk: (desk) => set({ desk }),
      openTitle: () =>
        set((s) => {
          if (s.level === "sealed") return { level: "subjects" };
          if (s.level === "subjects") return { level: "sealed", desk: "now" };
          return {
            level: "subjects",
            strandId: null,
            chapterId: null,
            desk: s.desk === "chapter" ? "now" : s.desk,
          };
        }),
      back: () =>
        set((s) => {
          if (s.level === "chapters") {
            return {
              level: "strands",
              chapterId: null,
              desk: s.desk === "chapter" ? "now" : s.desk,
            };
          }
          if (s.level === "strands") {
            return { level: "subjects", strandId: null, chapterId: null, desk: "now" };
          }
          return { level: "sealed", subjectId: null, desk: "now" };
        }),
      openSubject: (subjectId) =>
        set({ level: "strands", subjectId, strandId: null, chapterId: null, desk: "now" }),
      openStrand: (strandId) =>
        set((s) => ({ level: "chapters", strandId, chapterId: null, subjectId: s.subjectId, desk: "now" })),
      openChapter: (chapterId) => {
        const row = locate(chapterId);
        if (!row) return;
        set({
          level: "chapters",
          subjectId: row.subject.id,
          strandId: row.strand.id,
          chapterId,
          desk: "chapter",
        });
      },
      patchChapter: (id, patch) =>
        set((s) => {
          const prev = readProgress(s.chapters, id);
          const next: ChapterProgress = { ...prev, ...patch };
          if (patch.status === "done") next.revisedAt = Date.now();
          const studied =
            patch.status !== undefined || patch.note !== undefined || patch.confidence !== undefined;
          return {
            chapters: { ...s.chapters, [id]: next },
            studyDays: studied ? withDay(s.studyDays) : s.studyDays,
          };
        }),
      cycleStatus: (id) => {
        const order: Status[] = ["todo", "doing", "done"];
        const current = readProgress(get().chapters, id).status;
        const next = order[(order.indexOf(current) + 1) % order.length] ?? "todo";
        get().patchChapter(id, { status: next });
      },
      addTodo: (text, chapterId = null) => {
        const trimmed = text.trim().slice(0, 180);
        if (!trimmed) return;
        set((s) => ({
          todos: [
            {
              id: crypto.randomUUID(),
              text: trimmed,
              done: false,
              chapterId,
              createdAt: Date.now(),
            },
            ...s.todos,
          ].slice(0, 200),
        }));
      },
      toggleTodo: (id) =>
        set((s) => ({
          todos: s.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
        })),
      removeTodo: (id) => set((s) => ({ todos: s.todos.filter((todo) => todo.id !== id) })),
      setPlanConfig: (patch) => set((s) => ({ planConfig: { ...s.planConfig, ...patch } })),
      setPlan: (plan) => set({ plan }),
      pushStrategy: (role, text) =>
        set((s) => ({
          strategyThread: [...s.strategyThread, { role, text, at: Date.now() }].slice(-30),
        })),
      setTimerSubject: (subjectId) => set((s) => ({ timer: { ...s.timer, subjectId } })),
      setLengths: (focusMin, breakMin) =>
        set((s) => ({
          timer: {
            ...s.timer,
            focusMin,
            breakMin,
            remainingMs: s.timer.running
              ? s.timer.remainingMs
              : (s.timer.mode === "focus" ? focusMin : breakMin) * 60_000,
          },
        })),
      startTimer: () =>
        set((s) => ({
          timer: {
            ...s.timer,
            running: true,
            endsAt: Date.now() + s.timer.remainingMs,
          },
        })),
      pauseTimer: () =>
        set((s) => ({
          timer: {
            ...s.timer,
            running: false,
            endsAt: null,
            remainingMs: s.timer.endsAt
              ? Math.max(0, s.timer.endsAt - Date.now())
              : s.timer.remainingMs,
          },
        })),
      resetTimer: () =>
        set((s) => ({
          timer: {
            ...s.timer,
            running: false,
            endsAt: null,
            remainingMs: (s.timer.mode === "focus" ? s.timer.focusMin : s.timer.breakMin) * 60_000,
          },
        })),
      completeTimer: () =>
        set((s) => {
          if (s.timer.mode === "focus") {
            const session: Session = {
              id: crypto.randomUUID(),
              minutes: s.timer.focusMin,
              subjectId: s.timer.subjectId,
              at: Date.now(),
            };
            return {
              sessions: [...s.sessions, session].slice(-400),
              studyDays: withDay(s.studyDays),
              timer: {
                ...s.timer,
                mode: "break",
                running: false,
                endsAt: null,
                remainingMs: s.timer.breakMin * 60_000,
              },
            };
          }
          return {
            timer: {
              ...s.timer,
              mode: "focus",
              running: false,
              endsAt: null,
              remainingMs: s.timer.focusMin * 60_000,
            },
          };
        }),
      applyImport: (data) =>
        set((s) => ({
          ...s,
          theme: data.theme ?? s.theme,
          studioName: data.studioName ?? s.studioName,
          chapters: data.chapters ?? s.chapters,
          todos: data.todos ?? s.todos,
          sessions: data.sessions ?? s.sessions,
          studyDays: data.studyDays ?? s.studyDays,
          planConfig: data.planConfig ?? s.planConfig,
          plan: data.plan === undefined ? s.plan : data.plan,
          desk: "now",
        })),
      resetProgress: () =>
        set((s) => ({
          chapters: {},
          todos: [],
          sessions: [],
          studyDays: [],
          plan: null,
          strategyThread: seedThread,
          timer: { ...baseTimer(), subjectId: s.timer.subjectId },
          chapterId: null,
          desk: "studio",
        })),
    }),
    {
      name: "ican-current-v1",
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : localStorage,
      ),
      partialize: (s) => ({
        theme: s.theme,
        studioName: s.studioName,
        sound: s.sound,
        level: s.level,
        subjectId: s.subjectId,
        strandId: s.strandId,
        chapterId: s.chapterId,
        chapters: s.chapters,
        todos: s.todos,
        sessions: s.sessions,
        studyDays: s.studyDays,
        planConfig: s.planConfig,
        plan: s.plan,
        strategyThread: s.strategyThread,
        timer: { ...s.timer, running: false, endsAt: null },
      }),
    },
  ),
);
