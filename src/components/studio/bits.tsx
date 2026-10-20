import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStudy, type DeskId, type Status, type Tint } from "@/store/study-store";

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export const statusLabel: Record<Status, string> = {
  todo: "Incomplete",
  doing: "In progress",
  done: "Completed",
};

export const tintEdge: Record<Tint, string> = {
  0: "border-l-muted",
  1: "border-l-primary",
  2: "border-l-tintb",
  3: "border-l-tintc",
};

export function Meter({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PanelHead({ title, detail }: { title: string; detail?: string }) {
  const desk = useStudy((s) => s.desk);
  const setDesk = useStudy((s) => s.setDesk);
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl leading-tight">{title}</h2>
        {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
      </div>
      {desk !== "now" ? (
        <button
          type="button"
          aria-label="Close"
          className="tap grid size-11 shrink-0 place-items-center rounded-full border border-line"
          onClick={() => setDesk("now")}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

const tabs: { id: DeskId; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "timer", label: "Timer" },
  { id: "plan", label: "Plan" },
  { id: "strategy", label: "Strategy" },
  { id: "tasks", label: "Tasks" },
  { id: "studio", label: "Studio" },
];

export function DeskTabs() {
  const desk = useStudy((s) => s.desk);
  const setDesk = useStudy((s) => s.setDesk);
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const on = desk === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={on}
            className={cn(
              "tap min-h-11 shrink-0 rounded-full px-3 text-sm",
              on ? "bg-primary text-primary-fg" : "text-muted",
            )}
            onClick={() => setDesk(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
