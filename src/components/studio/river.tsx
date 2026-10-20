import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, Briefcase, ChevronLeft, Pin, Scale, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { flatChapters, subjects, type Subject } from "@/data/curriculum";
import { cn } from "@/lib/cn";
import { readProgress, useStudy } from "@/store/study-store";
import { Meter, statusLabel } from "./bits";

const icons: Record<string, LucideIcon> = {
  accounting: BookOpen,
  business: Briefcase,
  assurance: ShieldCheck,
  law: Scale,
};

function smoothPath(points: { x: number; y: number }[]) {
  const first = points[0];
  if (!first || points.length < 2) return "";
  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const mid = (a.y + b.y) / 2;
    d += ` C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${b.y}`;
  }
  return d;
}

function shiftFor(index: number, seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h += seed.charCodeAt(i) * (i + 2);
  return Math.sin(index * 1.15 + h / 40) * 14;
}

function StatusChip({ id, title }: { id: string; title: string }) {
  const status = useStudy((s) => readProgress(s.chapters, id).status);
  const cycle = useStudy((s) => s.cycleStatus);
  return (
    <button
      type="button"
      className={cn(
        "tap min-h-11 shrink-0 rounded-full border px-3 text-xs",
        status === "done" && "border-primary bg-primary text-primary-fg",
        status === "doing" && "border-primary text-primary",
        status === "todo" && "border-line text-muted",
      )}
      aria-label={`${title}: ${statusLabel[status]}. Change status.`}
      onClick={() => cycle(id)}
    >
      {statusLabel[status]}
    </button>
  );
}

export function River() {
  const level = useStudy((s) => s.level);
  const subjectId = useStudy((s) => s.subjectId);
  const strandId = useStudy((s) => s.strandId);
  const chapterId = useStudy((s) => s.chapterId);
  const chapters = useStudy((s) => s.chapters);
  const back = useStudy((s) => s.back);
  const openSubject = useStudy((s) => s.openSubject);
  const openStrand = useStudy((s) => s.openStrand);
  const openChapter = useStudy((s) => s.openChapter);

  const subject = subjects.find((item) => item.id === subjectId) ?? null;
  const strand = subject?.strands.find((item) => item.id === strandId) ?? null;

  const pins = flatChapters().filter((row) => readProgress(chapters, row.chapter.id).pinned);

  useEffect(() => {
    if (level === "chapters" && chapterId) {
      document.getElementById(`node-${chapterId}`)?.scrollIntoView({ block: "center" });
      return;
    }
    window.scrollTo(0, 0);
  }, [level, subjectId, strandId, chapterId]);

  return (
    <div>
      {level !== "subjects" ? (
        <button type="button" className="tap mb-5 inline-flex min-h-11 items-center gap-1 text-sm text-muted" onClick={back}>
          <ChevronLeft className="size-4" />
          {level === "chapters" ? (strand?.title ?? "Back") : "All four papers"}
        </button>
      ) : null}

      {level === "subjects" && pins.length > 0 ? (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {pins.map((pin) => (
            <button
              key={pin.chapter.id}
              type="button"
              className="tap inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-sm"
              onClick={() => openChapter(pin.chapter.id)}
            >
              <Pin className="size-3 text-primary" />
              {readProgress(chapters, pin.chapter.id).alias || pin.chapter.title}
            </button>
          ))}
        </div>
      ) : null}

      {level === "subjects" ? (
        <Flow
          seed="subjects"
          items={subjects.map((item) => ({ key: item.id, node: <SubjectCard subject={item} onOpen={() => openSubject(item.id)} /> }))}
        />
      ) : null}

      {level === "strands" && subject ? (
        <Flow
          seed={subject.id}
          items={subject.strands.map((item) => ({
            key: item.id,
            node: (
              <button
                type="button"
                data-node
                className="tap w-full rounded-2xl border border-line bg-surface p-4 text-left"
                onClick={() => openStrand(item.id)}
              >
                <p className="text-xs uppercase tracking-widest text-muted">{subject.title}</p>
                <h3 className="mt-1 font-display text-2xl leading-tight">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.blurb}</p>
                <StrandMeter strandId={item.id} />
              </button>
            ),
          }))}
        />
      ) : null}

      {level === "chapters" && strand ? (
        <Flow
          seed={strand.id}
          items={strand.chapters.map((chapter) => {
            const progress = readProgress(chapters, chapter.id);
            const title = progress.alias || chapter.title;
            const selected = chapterId === chapter.id;
            const tintBar = ["bg-muted", "bg-primary", "bg-tintb", "bg-tintc"][progress.tint] ?? "bg-muted";
            return {
              key: chapter.id,
              node: (
                <article
                  id={`node-${chapter.id}`}
                  data-node
                  className={cn(
                    "scroll-mt-24 flex overflow-hidden rounded-2xl border bg-surface",
                    selected ? "border-primary" : "border-line",
                  )}
                >
                  <span className={cn("w-1.5 shrink-0", tintBar)} aria-hidden />
                  <div className="flex min-w-0 flex-1 items-start gap-2 p-3">
                    <button type="button" className="tap min-w-0 flex-1 text-left" onClick={() => openChapter(chapter.id)}>
                      <span className="flex items-baseline gap-3">
                        <span className="font-display text-lg tabular-nums text-primary">
                          {String(chapter.number).padStart(2, "0")}
                        </span>
                        <span className="text-sm leading-snug">
                          {title}
                          {progress.pinned ? <Pin className="ml-1 inline size-3 text-primary" /> : null}
                        </span>
                      </span>
                      {progress.alias ? <span className="mt-1 block pl-9 text-xs text-muted">{chapter.title}</span> : null}
                      <span className="mt-1 block pl-9 text-xs text-muted">
                        p. {chapter.page} · {chapter.pages} pages
                      </span>
                    </button>
                    <StatusChip id={chapter.id} title={chapter.title} />
                  </div>
                </article>
              ),
            };
          })}
        />
      ) : null}
    </div>
  );
}

function StrandMeter({ strandId }: { strandId: string }) {
  const chapters = useStudy((s) => s.chapters);
  const row = locateStrand(strandId);
  if (!row) return null;
  const done = row.chapters.filter((chapter) => readProgress(chapters, chapter.id).status === "done").length;
  const doing = row.chapters.filter((chapter) => readProgress(chapters, chapter.id).status === "doing").length;
  return (
    <div className="mt-4">
      <Meter value={done} max={row.chapters.length} />
      <p className="mt-2 text-xs text-muted">
        {done} completed · {doing} in progress · {row.chapters.length - done - doing} incomplete
      </p>
    </div>
  );
}

function locateStrand(id: string) {
  for (const subject of subjects) {
    const strand = subject.strands.find((item) => item.id === id);
    if (strand) return strand;
  }
  return null;
}

function SubjectCard({ subject, onOpen }: { subject: Subject; onOpen: () => void }) {
  const chapters = useStudy((s) => s.chapters);
  const list = subject.strands.flatMap((strand) => strand.chapters);
  const done = list.filter((chapter) => readProgress(chapters, chapter.id).status === "done").length;
  const Icon = icons[subject.id] ?? BookOpen;
  return (
    <button
      type="button"
      data-node
      className="tap relative w-full overflow-hidden rounded-2xl border border-line bg-surface p-5 text-left"
      onClick={onOpen}
    >
      <span className="mark pointer-events-none absolute top-2 right-4 font-display text-5xl leading-none">
        {subject.kicker}
      </span>
      <Icon className="size-5 text-primary" />
      <h3 className="mt-4 max-w-[16rem] font-display text-3xl leading-none">{subject.title}</h3>
      <p className="mt-3 text-sm text-muted">{subject.summary}</p>
      <div className="mt-4">
        <Meter value={done} max={list.length} />
        <p className="mt-2 text-xs text-muted">
          {subject.strands.length} strands · {done}/{list.length} completed
        </p>
      </div>
    </button>
  );
}

function Flow({ seed, items }: { seed: string; items: { key: string; node: ReactNode }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState({ d: "", h: 1 });
  const key = items.map((item) => item.key).join("|");

  useEffect(() => {
    const wrap = ref.current;
    if (!wrap) return;
    const draw = () => {
      const box = wrap.getBoundingClientRect();
      const nodes = [...wrap.querySelectorAll<HTMLElement>("[data-node]")];
      const points = nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const leftSpace = rect.left - box.left;
        const rightSpace = box.right - rect.right;
        const xPx = leftSpace > rightSpace ? rect.left - 10 : rect.right + 10;
        const width = box.width || 1;
        return {
          x: Math.min(97, Math.max(3, (xPx / width) * 100)),
          y: rect.top + rect.height / 2 - box.top,
        };
      });
      const d = smoothPath(points);
      const h = Math.max(1, box.height);
      setPath((prev) => (prev.d === d && prev.h === h ? prev : { d, h }));
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [key]);

  return (
    <div ref={ref} className="relative">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-primary"
        viewBox={`0 0 100 ${path.h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {path.d ? (
          <path
            key={key}
            d={path.d}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            className="river-path"
          />
        ) : null}
      </svg>
      <ol className="relative z-10">
        {items.map((item, index) => {
          const shift = shiftFor(index, seed);
          return (
            <li
              key={item.key}
              className="pb-12"
              style={{ marginLeft: `${16 + shift}%`, marginRight: `${16 - shift}%` }}
            >
              <div className="flow-node" style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}>
                {item.node}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
