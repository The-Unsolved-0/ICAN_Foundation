import { useEffect, useState } from "react";
import { Compass, ListTodo, Route, Search, SlidersHorizontal, Timer } from "lucide-react";
import { flatChapters } from "@/data/curriculum";
import { counts } from "@/lib/coach";
import { cn } from "@/lib/cn";
import { useStudy, type DeskId } from "@/store/study-store";
import { Hero } from "./hero";
import { River } from "./river";
import { DeskStack } from "./tools";

const dock: { id: DeskId; label: string; icon: typeof Timer }[] = [
  { id: "timer", label: "Timer", icon: Timer },
  { id: "plan", label: "Plan", icon: Route },
  { id: "strategy", label: "Strategy", icon: Compass },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "studio", label: "Studio", icon: SlidersHorizontal },
];

function chime() {
  try {
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = 624;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35);
    osc.stop(audio.currentTime + 0.4);
    window.setTimeout(() => void audio.close(), 700);
  } catch {
    /* Autoplay can refuse the chime. The timer still completes. */
  }
}

function ThemeSync() {
  const theme = useStudy((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}

function Hydration() {
  useEffect(() => {
    void useStudy.persist.rehydrate();
  }, []);
  return null;
}

function TimerEngine() {
  const running = useStudy((s) => s.timer.running);
  const endsAt = useStudy((s) => s.timer.endsAt);
  useEffect(() => {
    if (!running || !endsAt) return;
    const tick = () => {
      if (Date.now() < endsAt) return;
      const sound = useStudy.getState().sound;
      useStudy.getState().completeTimer();
      if (sound) chime();
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, endsAt]);
  return null;
}

export function Shell() {
  const level = useStudy((s) => s.level);
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <ThemeSync />
      <Hydration />
      <TimerEngine />
      {level === "sealed" ? <Hero /> : <Workspace />}
      <SealModal />
      <MobileDock />
    </div>
  );
}

function Workspace() {
  const desk = useStudy((s) => s.desk);
  const setDesk = useStudy((s) => s.setDesk);
  return (
    <div className="mx-auto flex max-w-6xl flex-col lg:flex-row lg:items-start">
      <div className="w-full min-w-0 flex-1 px-4 pb-28 pt-2 lg:px-6 lg:pb-16">
        <TopBar />
        <River />
      </div>
      {desk !== "now" ? (
        <button
          type="button"
          className="scrim fixed inset-0 z-30 lg:hidden"
          aria-label="Close panel"
          onClick={() => setDesk("now")}
        />
      ) : null}
      <aside
        className={
          desk === "now"
            ? "hidden lg:sticky lg:top-0 lg:block lg:h-dvh lg:w-96 lg:overflow-y-auto lg:px-4 lg:py-4"
            : "fixed inset-x-3 bottom-24 z-40 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-4 lg:sticky lg:inset-auto lg:bottom-auto lg:z-auto lg:block lg:h-dvh lg:max-h-none lg:w-96 lg:overflow-y-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-4 lg:py-4"
        }
      >
        <div className={desk === "now" ? "rounded-2xl border border-line bg-surface p-4" : "lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-4"}>
          <DeskStack />
        </div>
      </aside>
    </div>
  );
}

function TopBar() {
  const openTitle = useStudy((s) => s.openTitle);
  const chapters = useStudy((s) => s.chapters);
  const openChapter = useStudy((s) => s.openChapter);
  const done = counts(chapters).done;
  const total = counts(chapters).total;
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hits =
    q.length < 2
      ? []
      : flatChapters()
          .filter((row) => {
            const blob = `${row.chapter.title} ${row.strand.title} ${row.subject.title}`.toLowerCase();
            return blob.includes(q);
          })
          .slice(0, 8);

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-line bg-bg px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="tap text-left" onClick={openTitle}>
          <span className="block text-xs uppercase tracking-widest text-muted">ICAN</span>
          <span className="font-display text-xl leading-none">
            CA <em className="italic">Foundation</em>
          </span>
        </button>
        <p className="text-right">
          <span className="font-display text-2xl tabular-nums leading-none">
            {done}
            <span className="text-base text-muted">/{total}</span>
          </span>
          <span className="mt-1 block text-xs text-muted">completed</span>
        </p>
      </div>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          className="field pl-10"
          value={query}
          placeholder="Find a chapter"
          aria-label="Find a chapter"
          onChange={(event) => setQuery(event.target.value)}
        />
        {hits.length > 0 ? (
          <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface">
            {hits.map((hit) => (
              <li key={hit.chapter.id}>
                <button
                  type="button"
                  className="tap w-full px-3 py-3 text-left"
                  onClick={() => {
                    openChapter(hit.chapter.id);
                    setQuery("");
                  }}
                >
                  <span className="block text-sm">{hit.chapter.title}</span>
                  <span className="block text-xs text-muted">
                    {hit.subject.title} · {hit.strand.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function SealModal() {
  const level = useStudy((s) => s.level);
  const desk = useStudy((s) => s.desk);
  const setDesk = useStudy((s) => s.setDesk);
  if (level !== "sealed" || desk === "now") return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center px-3 pb-24 sm:items-center lg:pb-6">
      <button type="button" className="scrim absolute inset-0" aria-label="Close panel" onClick={() => setDesk("now")} />
      <div className="relative max-h-[70vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-4">
        <DeskStack />
      </div>
    </div>
  );
}

function MobileDock() {
  const desk = useStudy((s) => s.desk);
  const setDesk = useStudy((s) => s.setDesk);
  const openTasks = useStudy((s) => s.todos.reduce((sum, todo) => sum + (todo.done ? 0 : 1), 0));
  const running = useStudy((s) => s.timer.running);
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-line bg-surface p-1 lg:hidden">
      {dock.map((item) => {
        const Icon = item.icon;
        const on = desk === item.id;
        const dot = (item.id === "tasks" && openTasks > 0) || (item.id === "timer" && running);
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={on}
            className={cn(
              "tap relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs",
              on ? "bg-primary text-primary-fg" : "text-muted",
            )}
            onClick={() => setDesk(desk === item.id ? "now" : item.id)}
          >
            <Icon className="size-4" />
            {item.label}
            {dot && !on ? <span className="absolute top-1 right-3 size-1.5 rounded-full bg-primary" /> : null}
          </button>
        );
      })}
    </nav>
  );
}
