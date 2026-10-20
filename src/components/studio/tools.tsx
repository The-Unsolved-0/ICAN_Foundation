import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { z } from "zod";
import { flatChapters, locate, subjects } from "@/data/curriculum";
import { advise, buildPlan, counts, nextPick, streakCount } from "@/lib/coach";
import { cn } from "@/lib/cn";
import {
  readProgress,
  useStudy,
  type ChapterProgress,
  type PlanConfig,
  type Session,
  type StudyPlan,
  type ThemeId,
  type TodoItem,
} from "@/store/study-store";
import { ChapterPanel } from "./chapter-panel";
import { DeskTabs, Meter, PanelHead, useMounted } from "./bits";

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function DeskStack() {
  const desk = useStudy((s) => s.desk);
  return (
    <div>
      <DeskTabs />
      <div className="mt-4">
        {desk === "chapter" ? <ChapterPanel /> : null}
        {desk === "now" ? <NowPanel /> : null}
        {desk === "timer" ? <TimerPanel /> : null}
        {desk === "plan" ? <PlanPanel /> : null}
        {desk === "strategy" ? <StrategyPanel /> : null}
        {desk === "tasks" ? <TasksPanel /> : null}
        {desk === "studio" ? <StudioPanel /> : null}
      </div>
    </div>
  );
}

function NowPanel() {
  const studioName = useStudy((s) => s.studioName);
  const chapters = useStudy((s) => s.chapters);
  const studyDays = useStudy((s) => s.studyDays);
  const plan = useStudy((s) => s.plan);
  const openChapter = useStudy((s) => s.openChapter);
  const mounted = useMounted();
  const { done, doing, total, perSubject } = counts(chapters);
  const pick = nextPick(chapters);
  const streak = mounted ? streakCount(studyDays) : 0;
  const today = mounted ? format(new Date(), "yyyy-MM-dd") : "";
  const blocks = plan?.days.find((day) => day.date === today)?.blocks ?? [];
  const hour = mounted ? new Date().getHours() : 12;
  const greeting = hour < 12 ? "Morning current" : hour < 17 ? "Afternoon current" : "Evening current";

  return (
    <div>
      <PanelHead title={studioName} detail={mounted ? greeting : "Your current"} />
      <p className="font-display text-4xl tabular-nums leading-none">
        {done}
        <span className="text-xl text-muted">/{total}</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        completed · {doing} in progress
        {streak > 0 ? ` · ${streak}-day streak` : ""}
      </p>
      <div className="mt-4 space-y-3">
        {perSubject.map((row) => (
          <div key={row.subject.id}>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>{row.subject.title}</span>
              <span className="tabular-nums">
                {row.done}/{row.total}
              </span>
            </div>
            <Meter value={row.done} max={row.total} />
          </div>
        ))}
      </div>
      {pick ? (
        <button
          type="button"
          className="tap mt-5 w-full rounded-2xl border border-line bg-surface-2 p-4 text-left"
          onClick={() => openChapter(pick.chapter.id)}
        >
          <p className="text-xs uppercase tracking-widest text-primary">Next open chapter</p>
          <p className="mt-1 font-display text-xl leading-tight">{pick.chapter.title}</p>
          <p className="mt-1 text-sm text-muted">
            {pick.subjectTitle} · {pick.chapter.pages} pages
          </p>
        </button>
      ) : (
        <p className="mt-5 text-sm text-muted">Every chapter is ticked. Revise the shaky ones.</p>
      )}
      {blocks.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-widest text-muted">On today’s plan</p>
          <ul className="mt-2 space-y-2">
            {blocks.map((block) => {
              const row = locate(block.chapterId);
              if (!row) return null;
              return (
                <li key={block.chapterId + String(block.review)}>
                  <button type="button" className="tap w-full text-left text-sm" onClick={() => openChapter(block.chapterId)}>
                    {block.minutes} min {block.review ? "review" : "first pass"} — {row.chapter.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function TimerPanel() {
  const timer = useStudy((s) => s.timer);
  const start = useStudy((s) => s.startTimer);
  const pause = useStudy((s) => s.pauseTimer);
  const reset = useStudy((s) => s.resetTimer);
  const setLengths = useStudy((s) => s.setLengths);
  const setSubject = useStudy((s) => s.setTimerSubject);
  const sound = useStudy((s) => s.sound);
  const setSound = useStudy((s) => s.setSound);
  const sessions = useStudy((s) => s.sessions);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    if (!timer.running) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [timer.running]);

  const ms =
    timer.running && timer.endsAt && now
      ? Math.max(0, timer.endsAt - now)
      : timer.remainingMs;
  const total = (timer.mode === "focus" ? timer.focusMin : timer.breakMin) * 60_000;
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const todayMinutes = useMemo(() => minutesToday(sessions), [sessions]);

  return (
    <div>
      <PanelHead
        title={timer.mode === "focus" ? "Focus" : "Break"}
        detail={timer.mode === "focus" ? "One chapter. Book open, phone elsewhere." : "Stand up. Do not open a new chapter."}
      />
      <div className="relative mx-auto grid size-40 place-items-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 size-full" aria-hidden>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--c-line)" strokeWidth="6" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--c-primary)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (ms / Math.max(1, total))}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <p className="font-display text-4xl tabular-nums">{clock(ms)}</p>
      </div>
      <p className="mt-2 text-center text-sm text-muted">{todayMinutes} focused minutes logged today</p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          className="tap inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm text-primary-fg"
          onClick={() => (timer.running ? pause() : start())}
        >
          {timer.running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {timer.running ? "Pause" : "Start"}
        </button>
        <button type="button" className="tap grid size-11 place-items-center rounded-full border border-line" aria-label="Reset timer" onClick={reset}>
          <RotateCcw className="size-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[25, 45, 50].map((minutes) => (
          <button
            key={minutes}
            type="button"
            disabled={timer.running}
            className={cn(
              "tap min-h-11 rounded-full border px-3 text-sm disabled:opacity-40",
              timer.focusMin === minutes ? "border-primary text-primary" : "border-line",
            )}
            onClick={() => setLengths(minutes, timer.breakMin)}
          >
            {minutes} min
          </button>
        ))}
        {[5, 10].map((minutes) => (
          <button
            key={minutes}
            type="button"
            disabled={timer.running}
            className={cn(
              "tap min-h-11 rounded-full border px-3 text-sm disabled:opacity-40",
              timer.breakMin === minutes ? "border-primary text-primary" : "border-line",
            )}
            onClick={() => setLengths(timer.focusMin, minutes)}
          >
            {minutes} break
          </button>
        ))}
      </div>
      <label className="mt-4 block text-xs uppercase tracking-widest text-muted" htmlFor="timer-paper">
        Paper for this block
      </label>
      <select
        id="timer-paper"
        className="field mt-2"
        value={timer.subjectId ?? ""}
        onChange={(event) => setSubject(event.target.value || null)}
      >
        <option value="">Any paper</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.title}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="tap mt-3 min-h-11 text-sm text-muted"
        aria-pressed={sound}
        onClick={() => setSound(!sound)}
      >
        {sound ? "Chime when a block ends" : "Silent when a block ends"}
      </button>
    </div>
  );
}

function minutesToday(sessions: Session[]) {
  const key = format(new Date(), "yyyy-MM-dd");
  return sessions
    .filter((session) => format(session.at, "yyyy-MM-dd") === key)
    .reduce((sum, session) => sum + session.minutes, 0);
}

function PlanPanel() {
  const config = useStudy((s) => s.planConfig);
  const setConfig = useStudy((s) => s.setPlanConfig);
  const plan = useStudy((s) => s.plan);
  const setPlan = useStudy((s) => s.setPlan);
  const chapters = useStudy((s) => s.chapters);
  const addTodo = useStudy((s) => s.addTodo);
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState("");

  function generate() {
    const next = buildPlan(chapters, config);
    setPlan(next);
    setNote(next.note);
    setShowAll(false);
  }

  function loadTasks() {
    if (!plan) return;
    const upcoming = plan.days.slice(0, 3);
    for (const day of upcoming) {
      for (const block of day.blocks) {
        const row = locate(block.chapterId);
        if (!row) continue;
        addTodo(
          `${day.date.slice(5)} · ${block.minutes}m ${block.review ? "review" : "read"} ${row.chapter.title}`,
          block.chapterId,
        );
      }
    }
    setNote("The next three days are now on the task list.");
  }

  const days = plan ? (showAll ? plan.days : plan.days.slice(0, 8)) : [];

  return (
    <div>
      <PanelHead title="Plan maker" detail="Turns the open chapters into days before the exam." />
      <label className="text-xs uppercase tracking-widest text-muted" htmlFor="exam">
        Exam date
      </label>
      <input
        id="exam"
        type="date"
        className="field mt-2"
        value={config.examDate}
        onChange={(event) => setConfig({ examDate: event.target.value })}
      />
      <label className="mt-4 block text-xs uppercase tracking-widest text-muted" htmlFor="minutes">
        Minutes a day · {config.minutesPerDay}
      </label>
      <input
        id="minutes"
        type="range"
        min={30}
        max={240}
        step={15}
        className="mt-3 w-full"
        value={config.minutesPerDay}
        onChange={(event) => setConfig({ minutesPerDay: Number(event.target.value) })}
      />
      <button
        type="button"
        className="tap mt-3 min-h-11 text-left text-sm"
        aria-pressed={config.reviewDone}
        onClick={() => setConfig({ reviewDone: !config.reviewDone })}
      >
        {config.reviewDone ? "Light review of completed chapters is included." : "First pass only. Completed chapters stay off the plan."}
      </button>
      <button type="button" className="tap mt-4 min-h-11 w-full rounded-xl bg-primary text-sm text-primary-fg" onClick={generate}>
        Build the plan
      </button>
      {note || plan?.note ? <p className="mt-3 text-sm text-muted">{note || plan?.note}</p> : null}
      {plan && plan.days.length > 0 ? (
        <>
          <button type="button" className="tap mt-3 min-h-11 text-sm text-primary" onClick={loadTasks}>
            Put the next three days on the task list
          </button>
          <ol className="mt-4 space-y-3">
            {days.map((day) => (
              <li key={day.date} className="rounded-xl border border-line p-3">
                <p className="text-xs uppercase tracking-widest text-muted">
                  {format(parseISO(day.date), "EEE d MMM")}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {day.blocks.map((block) => {
                    const row = locate(block.chapterId);
                    return (
                      <li key={`${day.date}-${block.chapterId}-${block.review}`}>
                        {block.minutes} min {block.review ? "review" : "first pass"} — {row?.chapter.title ?? "Chapter"}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
          {plan.days.length > 8 ? (
            <button type="button" className="tap mt-3 min-h-11 text-sm text-muted" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show the first week" : `Show all ${plan.days.length} days`}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const prompts = [
  "What should I study today?",
  "Am I on pace?",
  "Which paper is slipping?",
  "What should I revise?",
  "Plan a 7-day sprint",
];

function StrategyPanel() {
  const thread = useStudy((s) => s.strategyThread);
  const push = useStudy((s) => s.pushStrategy);
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread, waiting]);

  function ask(value: string) {
    const query = value.trim();
    if (!query || waiting) return;
    push("you", query);
    setText("");
    setWaiting(true);
    window.setTimeout(() => {
      const state = useStudy.getState();
      push(
        "desk",
        advise(query, {
          chapters: state.chapters,
          planConfig: state.planConfig,
          plan: state.plan,
          sessions: state.sessions,
        }),
      );
      setWaiting(false);
    }, 380);
  }

  return (
    <div>
      <PanelHead title="Strategy desk" detail="A coach that reads your ticks. It does not invent statute numbers." />
      <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
        {thread.map((message, index) => (
          <p
            key={`${message.at}-${index}`}
            className={cn(
              "whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
              message.role === "desk" ? "bg-surface-2" : "ml-6 border border-line",
            )}
          >
            {message.text}
          </p>
        ))}
        {waiting ? <p className="text-sm text-muted">Reading the current…</p> : null}
        <div ref={endRef} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" className="tap min-h-11 rounded-full border border-line px-3 text-xs" onClick={() => ask(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          ask(text);
        }}
      >
        <input
          className="field"
          value={text}
          placeholder="Ask about a chapter or a paper"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="tap min-h-11 shrink-0 rounded-xl bg-primary px-3 text-sm text-primary-fg">
          Ask
        </button>
      </form>
    </div>
  );
}

function TasksPanel() {
  const todos = useStudy((s) => s.todos);
  const add = useStudy((s) => s.addTodo);
  const toggle = useStudy((s) => s.toggleTodo);
  const remove = useStudy((s) => s.removeTodo);
  const chapterId = useStudy((s) => s.chapterId);
  const openChapter = useStudy((s) => s.openChapter);
  const [text, setText] = useState("");

  return (
    <div>
      <PanelHead title="Tasks" detail="A short list. The plan maker can fill the next three days." />
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          add(text);
          setText("");
        }}
      >
        <input className="field" value={text} placeholder="Add a task" onChange={(event) => setText(event.target.value)} />
        <button type="submit" className="tap min-h-11 shrink-0 rounded-xl bg-primary px-3 text-sm text-primary-fg">
          Add
        </button>
      </form>
      {chapterId ? (
        <button
          type="button"
          className="tap mt-2 min-h-11 text-sm text-primary"
          onClick={() => {
            const row = locate(chapterId);
            if (row) add(`Study: ${row.chapter.title}`, chapterId);
          }}
        >
          Add the open chapter
        </button>
      ) : null}
      {todos.length === 0 ? <p className="mt-4 text-sm text-muted">Nothing queued. Add one line you can finish today.</p> : null}
      <ul className="mt-3 space-y-2">
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-start gap-2 rounded-xl border border-line p-2">
            <button
              type="button"
              className={cn(
                "tap mt-0.5 grid size-11 shrink-0 place-items-center rounded-full border",
                todo.done ? "border-primary bg-primary text-primary-fg" : "border-line",
              )}
              aria-pressed={todo.done}
              aria-label={todo.done ? "Mark incomplete" : "Mark complete"}
              onClick={() => toggle(todo.id)}
            >
              {todo.done ? <Check className="size-4" /> : null}
            </button>
            <div className="min-w-0 flex-1 py-2">
              <p className={cn("text-sm", todo.done && "text-muted line-through")}>{todo.text}</p>
              {todo.chapterId ? (
                <button type="button" className="mt-1 text-xs text-primary" onClick={() => openChapter(todo.chapterId!)}>
                  Open chapter
                </button>
              ) : null}
            </div>
            <button type="button" className="tap min-h-11 px-2 text-xs text-muted" onClick={() => remove(todo.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const themes: {
  id: ThemeId;
  name: string;
  hint: string;
  bg: string;
  fg: string;
  muted: string;
  bar: string;
}[] = [
  { id: "ink", name: "Ink", hint: "Night ledger", bg: "bg-ink-bg", fg: "text-ink-fg", muted: "text-ink-muted", bar: "bg-ink-bar" },
  { id: "paper", name: "Paper", hint: "Daylight desk", bg: "bg-paper-bg", fg: "text-paper-fg", muted: "text-paper-muted", bar: "bg-paper-bar" },
  { id: "monsoon", name: "Monsoon", hint: "Slate and copper", bg: "bg-monsoon-bg", fg: "text-monsoon-fg", muted: "text-monsoon-muted", bar: "bg-monsoon-bar" },
  { id: "temple", name: "Temple", hint: "Maroon and gold", bg: "bg-temple-bg", fg: "text-temple-fg", muted: "text-temple-muted", bar: "bg-temple-bar" },
];

const progressSchema = z.object({
  status: z.enum(["todo", "doing", "done"]),
  note: z.string().max(20000),
  alias: z.string().max(160),
  tint: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  confidence: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  pinned: z.boolean(),
  revisedAt: z.number().nullable(),
});

const importSchema = z.object({
  theme: z.enum(["ink", "paper", "monsoon", "temple"]).optional(),
  studioName: z.string().max(48).optional(),
  chapters: z.record(z.string(), progressSchema).optional(),
  todos: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        done: z.boolean(),
        chapterId: z.string().nullable(),
        createdAt: z.number(),
      }),
    )
    .optional(),
  sessions: z
    .array(
      z.object({
        id: z.string(),
        minutes: z.number(),
        subjectId: z.string().nullable(),
        at: z.number(),
      }),
    )
    .optional(),
  studyDays: z.array(z.string()).optional(),
  planConfig: z
    .object({
      examDate: z.string(),
      minutesPerDay: z.number(),
      reviewDone: z.boolean(),
    })
    .optional(),
  plan: z
    .object({
      createdAt: z.number(),
      note: z.string(),
      days: z.array(
        z.object({
          date: z.string(),
          blocks: z.array(
            z.object({
              chapterId: z.string(),
              minutes: z.number(),
              review: z.boolean(),
            }),
          ),
        }),
      ),
      unplaced: z.array(z.string()),
    })
    .nullable()
    .optional(),
});

function StudioPanel() {
  const theme = useStudy((s) => s.theme);
  const setTheme = useStudy((s) => s.setTheme);
  const studioName = useStudy((s) => s.studioName);
  const setStudioName = useStudy((s) => s.setStudioName);
  const sessions = useStudy((s) => s.sessions);
  const applyImport = useStudy((s) => s.applyImport);
  const resetProgress = useStudy((s) => s.resetProgress);
  const mounted = useMounted();
  const [message, setMessage] = useState("");
  const [armed, setArmed] = useState(false);
  const week = mounted ? lastSeven(sessions) : [];

  function exportDesk() {
    const state = useStudy.getState();
    const payload = {
      theme: state.theme,
      studioName: state.studioName,
      chapters: state.chapters,
      todos: state.todos,
      sessions: state.sessions,
      studyDays: state.studyDays,
      planConfig: state.planConfig,
      plan: state.plan,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ican-ca-foundation.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Exported. Keep the file if you change browser.");
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = importSchema.safeParse(JSON.parse(String(reader.result)));
        if (!parsed.success) {
          setMessage("That file is not a desk export.");
          return;
        }
        const known = new Set(flatChapters().map((row) => row.chapter.id));
        const chapters: Record<string, ChapterProgress> = {};
        for (const [id, value] of Object.entries(parsed.data.chapters ?? {})) {
          if (known.has(id)) chapters[id] = value;
        }
        applyImport({
          theme: parsed.data.theme,
          studioName: parsed.data.studioName,
          chapters: parsed.data.chapters ? chapters : undefined,
          todos: parsed.data.todos as TodoItem[] | undefined,
          sessions: parsed.data.sessions as Session[] | undefined,
          studyDays: parsed.data.studyDays,
          planConfig: parsed.data.planConfig as PlanConfig | undefined,
          plan: parsed.data.plan as StudyPlan | null | undefined,
        });
        setMessage("Desk restored on this device.");
      } catch {
        setMessage("That file could not be read.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <PanelHead title="Studio" detail="Colour, name, and a copy of the desk. Nothing is uploaded." />
      <label className="text-xs uppercase tracking-widest text-muted" htmlFor="studio-name">
        Desk name
      </label>
      <input
        id="studio-name"
        className="field mt-2"
        value={studioName}
        maxLength={48}
        onChange={(event) => setStudioName(event.target.value)}
      />
      <p className="mt-5 text-xs uppercase tracking-widest text-muted">Colour</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={theme === item.id}
            className={cn("tap rounded-xl border p-3 text-left", item.bg, theme === item.id ? "border-primary" : "border-line")}
            onClick={() => setTheme(item.id)}
          >
            <span className={cn("mb-3 block h-1.5 w-8 rounded-full", item.bar)} />
            <span className={cn("block text-sm", item.fg)}>{item.name}</span>
            <span className={cn("block text-xs", item.muted)}>{item.hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-5 text-xs uppercase tracking-widest text-muted">Last seven days</p>
      <div className="mt-2 flex h-20 items-end gap-2">
        {week.map((day) => (
          <div key={day.key} className="flex h-full flex-1 flex-col justify-end gap-1">
            <div className="flex h-14 items-end">
              <div
                className="w-full rounded-sm bg-primary"
                style={{ height: `${day.ratio}%`, opacity: day.minutes === 0 ? 0.25 : 1 }}
              />
            </div>
            <span className="text-center text-xs text-muted">{day.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="tap min-h-11 rounded-xl border border-line px-3 text-sm" onClick={exportDesk}>
          Export desk
        </button>
        <label className="tap inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-line px-3 text-sm">
          Import
          <input
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {message ? <p className="mt-2 text-sm text-muted">{message}</p> : null}
      <button
        type="button"
        className="tap mt-6 min-h-11 text-sm text-muted"
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          resetProgress();
          setArmed(false);
          setMessage("Progress cleared. The colour and desk name stayed.");
        }}
      >
        {armed ? "Confirm — clear ticks, notes, tasks and the plan" : "Reset progress"}
      </button>
    </div>
  );
}

function lastSeven(sessions: Session[]) {
  const days = [];
  const maxBase = 30;
  const rows = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = format(date, "yyyy-MM-dd");
    const minutes = sessions
      .filter((session) => format(session.at, "yyyy-MM-dd") === key)
      .reduce((sum, session) => sum + session.minutes, 0);
    rows.push({ key, minutes, label: format(date, "EEEEE") });
  }
  const max = Math.max(maxBase, ...rows.map((row) => row.minutes));
  for (const row of rows) {
    days.push({ ...row, ratio: Math.max(8, Math.round((row.minutes / max) * 100)) });
  }
  return days;
}
