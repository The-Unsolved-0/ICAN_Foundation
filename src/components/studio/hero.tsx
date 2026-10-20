import { ArrowRight } from "lucide-react";
import { chapterCount } from "@/data/curriculum";
import { counts, streakCount } from "@/lib/coach";
import { useStudy } from "@/store/study-store";
import { useMounted } from "./bits";

const WAVE = (() => {
  const steps = 72;
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = t * 720;
    const y = 70 + Math.sin(t * Math.PI * 2 * 1.5) * 34;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
})();

const BEADS = [0.12, 0.37, 0.63, 0.88].map((t) => ({
  cx: t * 720,
  cy: 70 + Math.sin(t * Math.PI * 2 * 1.5) * 34,
}));

export function Hero() {
  const openTitle = useStudy((s) => s.openTitle);
  const chapters = useStudy((s) => s.chapters);
  const studyDays = useStudy((s) => s.studyDays);
  const mounted = useMounted();
  const done = counts(chapters).done;
  const streak = mounted ? streakCount(studyDays) : 0;

  return (
    <section className="flex min-h-dvh flex-col items-center justify-center px-5 pb-28 pt-16 text-center">
      <p className="text-xs uppercase tracking-widest text-muted">
        Institute of Chartered Accountants of Nepal
      </p>
      <h1 className="mt-6">
        <button type="button" className="tap" onClick={openTitle}>
          <span className="block text-xs uppercase tracking-widest text-muted">ICAN</span>
          <span className="mt-3 block font-display text-5xl leading-none sm:text-7xl">
            CA <em className="italic">Foundation</em>
          </span>
          <span className="mt-5 inline-flex items-center gap-2 text-sm text-primary">
            Open the current
            <ArrowRight className="size-4" />
          </span>
        </button>
      </h1>
      <svg viewBox="0 0 720 140" className="mt-8 w-full max-w-3xl text-primary" aria-hidden>
        <path
          d={WAVE}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength={1}
          className="river-path"
        />
        {BEADS.map((bead) => (
          <circle key={bead.cx} cx={bead.cx} cy={bead.cy} r="4.5" fill="currentColor" />
        ))}
      </svg>
      <p className="mt-6 max-w-md text-sm text-muted">
        Accounting · Business and finance · Assurance and Information System · Law and Tax
      </p>
      <p className="mt-2 text-sm text-muted">{chapterCount} chapters along one current, not a slide deck.</p>
      {mounted && done > 0 ? (
        <p className="mt-6 font-display text-lg tabular-nums">
          {done} completed
          {streak > 0 ? <span className="text-muted"> · {streak}-day streak</span> : null}
        </p>
      ) : null}
    </section>
  );
}
