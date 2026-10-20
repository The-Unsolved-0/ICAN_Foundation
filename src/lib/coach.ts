import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import {
  flatChapters,
  locate,
  subjectChapters,
  subjects,
} from "@/data/curriculum";
import {
  readProgress,
  type ChapterProgress,
  type PlanConfig,
  type Session,
  type StudyPlan,
} from "@/store/study-store";

export function estimateMinutes(pages: number, review = false) {
  const base = Math.round(Math.min(120, Math.max(25, pages * 1.15)));
  return review ? Math.max(15, Math.round(base * 0.4)) : base;
}

export function counts(chapters: Record<string, ChapterProgress>) {
  let done = 0;
  let doing = 0;
  const perSubject = subjects.map((subject) => {
    const list = subjectChapters(subject);
    const d = list.filter((c) => readProgress(chapters, c.id).status === "done").length;
    const g = list.filter((c) => readProgress(chapters, c.id).status === "doing").length;
    done += d;
    doing += g;
    return { subject, total: list.length, done: d, doing: g };
  });
  const total = flatChapters().length;
  return { done, doing, todo: total - done - doing, total, perSubject };
}

export function nextPick(
  chapters: Record<string, ChapterProgress>,
  subjectId?: string,
  skip?: Set<string>,
) {
  const ranked = [...counts(chapters).perSubject].sort(
    (a, b) => a.done / a.total - b.done / b.total || a.subject.kicker.localeCompare(b.subject.kicker),
  );
  for (const row of ranked) {
    if (subjectId && row.subject.id !== subjectId) continue;
    const list = subjectChapters(row.subject).filter((chapter) => !skip?.has(chapter.id));
    const doing = list.find((chapter) => readProgress(chapters, chapter.id).status === "doing");
    const todo = list
      .filter((chapter) => readProgress(chapters, chapter.id).status === "todo")
      .sort((a, b) => {
        const confidence = readProgress(chapters, a.id).confidence - readProgress(chapters, b.id).confidence;
        return confidence || a.number - b.number;
      })[0];
    const chapter = doing ?? todo;
    if (!chapter) continue;
    const progress = readProgress(chapters, chapter.id);
    return {
      subjectId: row.subject.id,
      subjectTitle: row.subject.title,
      strandTitle:
        row.subject.strands.find((strand) => strand.chapters.some((item) => item.id === chapter.id))
          ?.title ?? "",
      chapter,
      status: progress.status === "doing" ? ("doing" as const) : ("todo" as const),
      confidence: progress.confidence,
    };
  }
  return null;
}

function studyLine(subjectId: string) {
  if (subjectId === "accounting") {
    return "Write the entry, formula, or statement this chapter turns on, and the one figure you mix up.";
  }
  if (subjectId === "business") {
    return "Write the definition in a sentence you could say aloud, then the exception.";
  }
  if (subjectId === "assurance") {
    return "Write who the work is for, and what would break ethics, independence, or confidentiality.";
  }
  return "Write the Act or section, who it binds, and the consequence of getting it wrong.";
}

type Pick = NonNullable<ReturnType<typeof nextPick>>;

function describe(pick: Pick) {
  const state = pick.status === "doing" ? "already in progress" : "not started";
  const whale =
    pick.chapter.id === "law-3"
      ? " This is the long Civil Code chapter — about 172 pages. Give it whole days. Do not tuck it between short tax topics."
      : "";
  return `${pick.chapter.title} — ${pick.subjectTitle}, ${pick.strandTitle}. About ${pick.chapter.pages} pages, ${state}.${whale}`;
}

export function buildPlan(
  chapters: Record<string, ChapterProgress>,
  config: PlanConfig,
  now = new Date(),
): StudyPlan {
  const empty = (note: string): StudyPlan => ({
    createdAt: Date.now(),
    note,
    days: [],
    unplaced: [],
  });
  if (!config.examDate) return empty("Choose the exam date first.");
  const exam = startOfDay(parseISO(config.examDate));
  const today = startOfDay(now);
  const horizon = differenceInCalendarDays(exam, today);
  if (Number.isNaN(horizon)) return empty("That date did not read. Use the date field.");
  if (horizon <= 0) {
    return empty("That date is today or already past. Pick the morning you sit the paper.");
  }

  const ratios = new Map(
    counts(chapters).perSubject.map((row) => [row.subject.id, row.done / row.total]),
  );
  const queues = new Map<string, { chapterId: string; minutes: number; review: boolean }[]>();
  for (const subject of subjects) {
    const blocks: { chapterId: string; minutes: number; review: boolean }[] = [];
    for (const chapter of subjectChapters(subject)) {
      const progress = readProgress(chapters, chapter.id);
      if (progress.status !== "done") {
        blocks.push({
          chapterId: chapter.id,
          minutes: estimateMinutes(chapter.pages, false),
          review: false,
        });
      }
    }
    blocks.sort((a, b) => {
      const pa = readProgress(chapters, a.chapterId);
      const pb = readProgress(chapters, b.chapterId);
      if (pa.status !== pb.status) return pa.status === "doing" ? -1 : 1;
      return pa.confidence - pb.confidence;
    });
    if (config.reviewDone) {
      for (const chapter of subjectChapters(subject)) {
        const progress = readProgress(chapters, chapter.id);
        if (progress.status === "done") {
          blocks.push({
            chapterId: chapter.id,
            minutes: estimateMinutes(chapter.pages, true),
            review: true,
          });
        }
      }
    }
    queues.set(subject.id, blocks);
  }

  const order = () =>
    subjects
      .map((subject) => subject.id)
      .filter((id) => (queues.get(id)?.length ?? 0) > 0)
      .sort((a, b) => (ratios.get(a) ?? 0) - (ratios.get(b) ?? 0));

  function take(used: Set<string>, room: number) {
    const ids = order();
    const fresh = ids.filter((id) => !used.has(id));
    const search = [...fresh, ...ids.filter((id) => used.has(id))];
    for (const id of search) {
      const queue = queues.get(id);
      const block = queue?.[0];
      if (!block || block.minutes > room) continue;
      queue?.shift();
      return { ...block, subjectId: id };
    }
    return null;
  }

  const cap = Math.min(horizon, 120);
  const minutesPerDay = Math.max(30, Math.min(240, config.minutesPerDay));
  const days: StudyPlan["days"] = [];
  let cursor = today;
  let guard = 0;
  while (days.length < cap && guard < 400) {
    guard += 1;
    if (order().length === 0) break;
    const used = new Set<string>();
    const blocks: StudyPlan["days"][number]["blocks"] = [];
    let room = minutesPerDay;
    for (let slot = 0; slot < 4 && room >= 15; slot += 1) {
      const block = take(used, room);
      if (!block) break;
      blocks.push({ chapterId: block.chapterId, minutes: block.minutes, review: block.review });
      room -= block.minutes;
      used.add(block.subjectId);
    }
    if (blocks.length === 0) {
      const whaleId = order()[0];
      const whale = whaleId ? queues.get(whaleId)?.shift() : undefined;
      if (!whale) break;
      blocks.push({ chapterId: whale.chapterId, minutes: whale.minutes, review: whale.review });
    }
    days.push({ date: format(cursor, "yyyy-MM-dd"), blocks });
    cursor = addDays(cursor, 1);
  }

  const unplaced: string[] = [];
  for (const queue of queues.values()) {
    for (const block of queue) {
      if (!block.review) unplaced.push(block.chapterId);
    }
  }

  let note = "The calendar is full to the exam. Protect these blocks.";
  if (days.length === 0) {
    note = "Nothing is waiting. Turn on review, or you are further along than the ticks show.";
  } else if (unplaced.length > 0) {
    note = `${unplaced.length} open chapters do not fit before the exam at ${minutesPerDay} minutes a day. Lengthen the day, or drop a paper’s revision before you drop a first pass.`;
  } else if (days.length < horizon) {
    note = `The work fits, with ${horizon - days.length} days spare before the exam. Spend the spare days on anything marked shaky, and on the Civil Code if it still feels thin.`;
  }
  return { createdAt: Date.now(), note, days, unplaced };
}

export type CoachContext = {
  chapters: Record<string, ChapterProgress>;
  planConfig: PlanConfig;
  plan: StudyPlan | null;
  sessions: Session[];
};

function paceReply(ctx: CoachContext) {
  const { done, doing, todo, total, perSubject } = counts(ctx.chapters);
  const openMinutes = flatChapters()
    .filter((row) => readProgress(ctx.chapters, row.chapter.id).status !== "done")
    .reduce((sum, row) => sum + estimateMinutes(row.chapter.pages), 0);
  if (!ctx.planConfig.examDate) {
    return `You have marked ${done} of ${total} completed and ${doing} in progress. ${todo} are still incomplete. Set an exam date in the plan maker before I talk about pace — without a date, “enough” is a feeling. The open set is about ${Math.round(openMinutes / 60)} hours of first-pass work.`;
  }
  const days = differenceInCalendarDays(startOfDay(parseISO(ctx.planConfig.examDate)), startOfDay(new Date()));
  if (days <= 0) {
    return "The exam date on the desk is today or behind you. Change it, then ask again.";
  }
  const available = days * ctx.planConfig.minutesPerDay;
  const ratio = available === 0 ? 0 : openMinutes / available;
  const weakest = [...perSubject].sort((a, b) => a.done / a.total - b.done / b.total)[0];
  let verdict = "You are level with the calendar if the minutes stay honest.";
  if (ratio > 1.15) verdict = "You are behind the calendar. The open chapters need more time than the days you have.";
  if (ratio < 0.75) verdict = "You are ahead of the calendar. Do not spend the spare days rereading what already feels easy.";
  return [
    `${days} days to the exam. ${done} completed, ${doing} in progress, ${todo} incomplete, out of ${total}.`,
    `Open chapters are about ${Math.round(openMinutes / 60)} hours. At ${ctx.planConfig.minutesPerDay} minutes a day you have about ${Math.round(available / 60)} hours.`,
    verdict,
    weakest
      ? `${weakest.subject.title} is the thin paper: ${weakest.done} of ${weakest.total} completed.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function weakestReply(chapters: Record<string, ChapterProgress>) {
  const ranked = [...counts(chapters).perSubject].sort(
    (a, b) => a.done / a.total - b.done / b.total || b.total - a.total,
  );
  const worst = ranked[0];
  if (!worst) return "No papers are loaded.";
  const pick = nextPick(chapters, worst.subject.id);
  const lines = [
    `${worst.subject.title} is slipping: ${worst.done} completed, ${worst.doing} in progress, ${worst.total - worst.done - worst.doing} incomplete.`,
  ];
  if (pick) {
    lines.push(`Start there with ${describe(pick)}`);
    lines.push(studyLine(worst.subject.id));
  } else {
    lines.push("That paper is fully ticked. Move to the next thinnest paper, or revise the shaky chapters.");
  }
  const next = ranked[1];
  if (next) {
    lines.push(`Next thinnest is ${next.subject.title} (${next.done} of ${next.total}).`);
  }
  return lines.join("\n");
}

function reviseReply(chapters: Record<string, ChapterProgress>) {
  const week = 7 * 24 * 60 * 60 * 1000;
  const stale = flatChapters()
    .map((row) => ({ row, progress: readProgress(chapters, row.chapter.id) }))
    .filter((item) => item.progress.status === "done")
    .filter((item) => item.progress.revisedAt == null || Date.now() - item.progress.revisedAt > week)
    .sort((a, b) => (a.progress.revisedAt ?? 0) - (b.progress.revisedAt ?? 0))
    .slice(0, 4);
  if (stale.length === 0) {
    const anyDone = flatChapters().some((row) => readProgress(chapters, row.chapter.id).status === "done");
    return anyDone
      ? "Completed chapters were all touched in the last week. Revise one you marked shaky before you open a new file."
      : "Nothing is completed yet, so there is nothing honest to revise. Finish one chapter and write the rule before you build a revision pile.";
  }
  const lines = ["Revise these before you open a fresh chapter. Say the rule with the book shut."];
  for (const item of stale) {
    const shaky = item.progress.confidence <= 1 ? " You marked it shaky." : "";
    lines.push(`· ${item.row.chapter.title} (${item.row.subject.title}).${shaky}`);
  }
  return lines.join("\n");
}

function sprintReply(chapters: Record<string, ChapterProgress>) {
  const skip = new Set<string>();
  const lines = ["Seven days. One chapter a day. No eighth chapter to feel busy."];
  for (let i = 0; i < 7; i += 1) {
    const ranked = [...counts(chapters).perSubject].sort(
      (a, b) => a.done / a.total - b.done / b.total,
    );
    let pick = null;
    for (const row of ranked) {
      pick = nextPick(chapters, row.subject.id, skip);
      if (pick) break;
    }
    if (!pick) pick = nextPick(chapters, undefined, skip);
    if (!pick) break;
    skip.add(pick.chapter.id);
    lines.push(`${i + 1}. ${pick.chapter.title} — ${pick.subjectTitle}, ${pick.chapter.pages} pages.`);
  }
  if (lines.length === 1) return "There is no open chapter to sprint. Use the week to rewrite notes from memory.";
  return lines.join("\n");
}

function todayReply(ctx: CoachContext) {
  const today = format(new Date(), "yyyy-MM-dd");
  const blocks = ctx.plan?.days.find((day) => day.date === today)?.blocks ?? [];
  const lines: string[] = [];
  if (blocks.length > 0) {
    lines.push("The plan already named today:");
    for (const block of blocks) {
      const row = locate(block.chapterId);
      if (!row) continue;
      lines.push(
        `· ${block.minutes} min ${block.review ? "review" : "first pass"} — ${row.chapter.title}.`,
      );
    }
    lines.push("");
  }
  const pick = nextPick(ctx.chapters);
  if (!pick && blocks.length === 0) {
    return "Nothing is incomplete. Close the book on one shaky completed chapter and write the rule from memory.";
  }
  if (pick) {
    lines.push(blocks.length ? `If you only keep one block, keep this: ${describe(pick)}` : describe(pick));
    lines.push(studyLine(pick.subjectId));
    lines.push("Run a 45-minute timer. Stop while you can still say the rule. Put that sentence in the note.");
  }
  return lines.join("\n");
}

function searchReply(query: string, chapters: Record<string, ChapterProgress>) {
  const q = query.toLowerCase();
  const words = q
    .replace(/labour/g, "labor")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  const subjectHit = subjects.find(
    (subject) => q.includes(subject.title.toLowerCase()) || subject.title.toLowerCase().includes(q.trim()),
  );
  if (subjectHit && words.length < 3) {
    const row = counts(chapters).perSubject.find((item) => item.subject.id === subjectHit.id);
    const pick = nextPick(chapters, subjectHit.id);
    return [
      `${subjectHit.title}: ${row?.done ?? 0} of ${row?.total ?? 0} completed.`,
      pick ? `Next open chapter: ${describe(pick)}` : "Every chapter in this paper is ticked.",
      studyLine(subjectHit.id),
    ].join("\n");
  }
  const hits = flatChapters()
    .filter((row) => {
      const title = row.chapter.title.toLowerCase();
      const blob = `${title} ${row.strand.title.toLowerCase()} ${row.subject.title.toLowerCase()}`;
      if (blob.includes(q.trim()) && q.trim().length > 3) return true;
      return words.some((word) => blob.includes(word));
    })
    .slice(0, 3);
  if (hits.length === 0) {
    return "I can place today, check pace, name the paper that is slipping, or build a 7-day sprint. Or name a topic — depreciation, confidentiality, Civil Code, cash budget.";
  }
  const lines = ["That sits in these chapters:"];
  for (const hit of hits) {
    const progress = readProgress(chapters, hit.chapter.id);
    const label =
      progress.status === "done" ? "completed" : progress.status === "doing" ? "in progress" : "incomplete";
    lines.push(`· ${hit.chapter.title} — ${hit.subject.title}, ${hit.strand.title}, ${label}.`);
  }
  const firstOpen = hits.find((hit) => readProgress(chapters, hit.chapter.id).status !== "done");
  if (firstOpen) lines.push(`Open ${firstOpen.chapter.title} on the current and write one examinable rule.`);
  return lines.join("\n");
}

export function advise(query: string, ctx: CoachContext) {
  const q = query.toLowerCase();
  if (/pace|on track|behind|hours left|exam date/.test(q)) return paceReply(ctx);
  if (/slip|weak|worst|ignore|behind on|thin/.test(q)) return weakestReply(ctx.chapters);
  if (/revis|forget|stale|memory/.test(q)) return reviseReply(ctx.chapters);
  if (/sprint|7-day|seven/.test(q)) return sprintReply(ctx.chapters);
  if (/today|what should i study|start|next chapter|one chapter/.test(q)) return todayReply(ctx);
  return searchReply(query, ctx.chapters);
}

export function streakCount(days: string[], today = format(new Date(), "yyyy-MM-dd")) {
  const set = new Set(days);
  const prev = (key: string) => format(addDays(parseISO(key), -1), "yyyy-MM-dd");
  let cursor = today;
  if (!set.has(cursor)) {
    cursor = prev(cursor);
    if (!set.has(cursor)) return 0;
  }
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = prev(cursor);
  }
  return count;
}
