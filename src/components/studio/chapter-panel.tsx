import { useEffect, useState } from "react";
import { Pin } from "lucide-react";
import { locate, nextInStrand } from "@/data/curriculum";
import { cn } from "@/lib/cn";
import {
  readProgress,
  useStudy,
  type Confidence,
  type Status,
  type Tint,
} from "@/store/study-store";
import { PanelHead, statusLabel, tintEdge } from "./bits";

const statuses: Status[] = ["todo", "doing", "done"];
const confidence: { id: Confidence; label: string }[] = [
  { id: 0, label: "New" },
  { id: 1, label: "Shaky" },
  { id: 2, label: "Steady" },
  { id: 3, label: "Solid" },
];
const tints: { id: Tint; label: string; swatch: string }[] = [
  { id: 0, label: "Plain", swatch: "bg-muted" },
  { id: 1, label: "Gold", swatch: "bg-primary" },
  { id: 2, label: "Ember", swatch: "bg-tintb" },
  { id: 3, label: "Leaf", swatch: "bg-tintc" },
];

const prompts: Record<string, string> = {
  accounting: "Write the entry, formula, or statement this chapter turns on, and the figure you mix up.",
  business: "Write the definition in a sentence you could say aloud, then the exception.",
  assurance: "Write who the work is for, and what would break ethics, independence, or confidentiality.",
  law: "Write the Act or section, who it binds, and the consequence of getting it wrong.",
};

export function ChapterPanel() {
  const chapterId = useStudy((s) => s.chapterId);
  const progress = useStudy((s) => (chapterId ? readProgress(s.chapters, chapterId) : null));
  const patch = useStudy((s) => s.patchChapter);
  const openChapter = useStudy((s) => s.openChapter);
  const [covered, setCovered] = useState(false);

  useEffect(() => setCovered(false), [chapterId]);

  const row = chapterId ? locate(chapterId) : null;
  if (!row || !progress || !chapterId) {
    return (
      <div>
        <PanelHead title="Chapter" detail="Choose a chapter on the current." />
      </div>
    );
  }

  const title = progress.alias || row.chapter.title;
  const nxt = nextInStrand(chapterId);

  return (
    <div>
      <PanelHead title={covered ? "Covered" : title} detail={`${row.subject.title} · ${row.strand.title}`} />
      <p className="text-sm text-muted">
        Chapter {row.chapter.number} · p. {row.chapter.page} · {row.chapter.pages} pages
      </p>
      {progress.alias && !covered ? <p className="mt-1 text-sm text-muted">{row.chapter.title}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="tap min-h-11 rounded-full border border-line px-3 text-sm" onClick={() => setCovered((v) => !v)}>
          {covered ? "Reveal title" : "Cover and recall"}
        </button>
        <button
          type="button"
          className={cn(
            "tap inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm",
            progress.pinned ? "border-primary text-primary" : "border-line",
          )}
          aria-pressed={progress.pinned}
          onClick={() => patch(chapterId, { pinned: !progress.pinned })}
        >
          <Pin className="size-3" />
          {progress.pinned ? "Pinned" : "Pin"}
        </button>
      </div>

      {covered ? (
        <p className="mt-4 text-sm text-muted">Say what this chapter is for before you look.</p>
      ) : null}

      <p className="mt-5 text-xs uppercase tracking-widest text-muted">Status</p>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={progress.status === status}
            className={cn(
              "tap min-h-11 rounded-lg px-2 text-xs",
              progress.status === status ? "bg-primary text-primary-fg" : "text-muted",
            )}
            onClick={() => patch(chapterId, { status })}
          >
            {statusLabel[status]}
          </button>
        ))}
      </div>

      <p className="mt-5 text-xs uppercase tracking-widest text-muted">How well it sits</p>
      <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
        {confidence.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={progress.confidence === item.id}
            className={cn(
              "tap min-h-11 rounded-lg text-xs",
              progress.confidence === item.id ? "bg-primary text-primary-fg" : "text-muted",
            )}
            onClick={() => patch(chapterId, { confidence: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mt-5 text-xs uppercase tracking-widest text-muted">Colour mark</p>
      <div className="mt-2 flex gap-2">
        {tints.map((tint) => (
          <button
            key={tint.id}
            type="button"
            aria-label={tint.label}
            aria-pressed={progress.tint === tint.id}
            className={cn(
              "tap size-11 rounded-full border",
              tint.swatch,
              progress.tint === tint.id ? "border-fg" : "border-transparent",
            )}
            onClick={() => patch(chapterId, { tint: tint.id })}
          />
        ))}
      </div>
      <div className={cn("mt-3 rounded-xl border border-l-4 border-line bg-surface-2 px-3 py-2 text-sm", tintEdge[progress.tint])}>
        This mark stays on the chapter bead.
      </div>

      <label className="mt-5 block text-xs uppercase tracking-widest text-muted" htmlFor="alias">
        Your name for this chapter
      </label>
      <input
        id="alias"
        className="field mt-2"
        value={progress.alias}
        placeholder={row.chapter.title}
        maxLength={120}
        onChange={(event) => patch(chapterId, { alias: event.target.value })}
      />

      <label className="mt-5 block text-xs uppercase tracking-widest text-muted" htmlFor="note">
        Note
      </label>
      <textarea
        id="note"
        className="field mt-2 min-h-36 resize-y"
        value={progress.note}
        placeholder={prompts[row.subject.id]}
        onChange={(event) => patch(chapterId, { note: event.target.value })}
      />
      <p className="mt-2 text-xs text-muted">Saved on this device as you type.</p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          className="tap min-h-11 rounded-xl bg-primary px-3 text-sm text-primary-fg"
          onClick={() => {
            patch(chapterId, { status: "done" });
            if (nxt) openChapter(nxt);
          }}
        >
          {nxt ? "Mark completed and continue" : "Mark completed"}
        </button>
        {nxt ? (
          <button type="button" className="tap min-h-11 rounded-xl border border-line px-3 text-sm" onClick={() => openChapter(nxt)}>
            Next chapter without ticking
          </button>
        ) : (
          <p className="text-sm text-muted">End of this strand.</p>
        )}
      </div>
    </div>
  );
}
