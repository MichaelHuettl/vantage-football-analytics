import type { LastUpdate } from "@/lib/injury-tracker";
import { parseLocalDate, relativeAge, shortDate } from "@/lib/dates";
import type { GameStatus, PracticeStatus } from "@/lib/types";

const STATUS_TOKEN: Record<GameStatus, string> = {
  Out: "var(--color-status-out)",
  Doubtful: "var(--color-status-doubtful)",
  Questionable: "var(--color-status-questionable)",
  Active: "var(--color-status-full)",
  IR: "var(--color-ink-600)",
};

/**
 * Designation as a filled pill. The word is always present — §7 forbids colour
 * being the only carrier of meaning, which matters more here than anywhere
 * else on the site.
 */
export function StatusPill({ status }: { status: GameStatus }) {
  return (
    <span
      className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wide text-white whitespace-nowrap"
      style={{
        fontFamily: "var(--font-condensed)",
        background: STATUS_TOKEN[status],
      }}
    >
      {status}
    </span>
  );
}

const PRACTICE_TOKEN: Record<PracticeStatus, { bg: string; label: string }> = {
  DNP: { bg: "var(--color-status-out)", label: "Did not practice" },
  LP: { bg: "var(--color-status-questionable)", label: "Limited" },
  FP: { bg: "var(--color-status-full)", label: "Full" },
  "—": { bg: "var(--color-ink-300)", label: "No practice held" },
};

/**
 * Wed / Thu / Fri as three cells read left to right.
 *
 * §5.3 is explicit that the trend is the signal and the Friday designation
 * alone is not, so the three days are always shown together and never
 * collapsed into a single summary value.
 */
export function PracticeStrip({
  practice,
  size = "md",
}: {
  practice: { wed: PracticeStatus; thu: PracticeStatus; fri: PracticeStatus };
  size?: "sm" | "md";
}) {
  const days: [string, PracticeStatus][] = [
    ["W", practice.wed],
    ["T", practice.thu],
    ["F", practice.fri],
  ];
  const dim = size === "sm" ? "h-5 w-5 text-[0.6rem]" : "h-7 w-7 text-xs";

  return (
    <span className="inline-flex gap-1" role="img" aria-label={practiceLabel(practice)}>
      {days.map(([day, value]) => (
        <span
          key={day}
          className={`inline-flex items-center justify-center rounded font-bold text-white ${dim}`}
          style={{
            fontFamily: "var(--font-condensed)",
            background: PRACTICE_TOKEN[value].bg,
          }}
          title={`${day}: ${PRACTICE_TOKEN[value].label}`}
        >
          {value === "—" ? "·" : value}
        </span>
      ))}
    </span>
  );
}

function practiceLabel(p: {
  wed: PracticeStatus;
  thu: PracticeStatus;
  fri: PracticeStatus;
}) {
  return `Wednesday ${PRACTICE_TOKEN[p.wed].label}, Thursday ${
    PRACTICE_TOKEN[p.thu].label
  }, Friday ${PRACTICE_TOKEN[p.fri].label}`;
}

/**
 * Designation history across the season. §5.3 wants the trend legible at a
 * glance, so weeks run left to right and the reader compares heights and
 * colours rather than reading a table.
 */
export function InjuryTimeline({
  history,
}: {
  history: { week: number; status: GameStatus }[];
}) {
  if (history.length === 0) return null;

  return (
    <ol className="flex items-end gap-1.5">
      {history.map((h) => (
        <li key={h.week} className="flex flex-col items-center gap-1">
          <span
            className="w-6 rounded-sm"
            style={{
              height: SEVERITY[h.status],
              background: STATUS_TOKEN[h.status],
            }}
            title={`Week ${h.week}: ${h.status}`}
          />
          <span
            className="text-[0.625rem] tnum"
            style={{
              fontFamily: "var(--font-condensed)",
              color: "var(--text-muted)",
            }}
          >
            {h.week}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Bar height encodes severity, so the shape of the season is readable
 *  without decoding the colours. */
const SEVERITY: Record<GameStatus, number> = {
  Active: 10,
  Questionable: 22,
  Doubtful: 32,
  Out: 42,
  IR: 42,
};

/**
 * When a tracker row last moved, and which source moved it.
 *
 * Three facts in one cell, because a bare date answers less than it looks like
 * it does. The day is what a reader scans for; the age is what they actually
 * want ("is this current?"); the source is what makes it auditable, which is
 * the whole premise of the site.
 *
 * **What the wire's date means, precisely.** It is Sleeper's `news_updated`:
 * the last time anything about that player was updated, not a timestamp on the
 * injury itself. For the players this page shows the two track closely — every
 * injured player inside the relevance cutoff carried the field, at a median of
 * a day old — but a contract story would move it too. Hence "last update"
 * rather than "reported", and hence naming the source in the cell.
 *
 * **This is not a return date and cannot become one** (§5.3). It says when
 * something was last said, never when anybody expects the player back.
 *
 * Age is computed during render rather than after hydration, which is the
 * opposite of `DataFreshness` and deliberate: that component appears on
 * statically prerendered pages, where a build-time `Date.now()` freezes into
 * the HTML. This cell only appears on `/injuries`, which is server-rendered per
 * request and re-rendered on a timer by `AutoRefresh`, so render time *is* the
 * reader's present. The `<time>` element carries the machine-readable stamp
 * either way, so the fact stays true even if the age ever went stale.
 */
export function LastUpdateCell({
  update,
  staleAfterDays = 14,
}: {
  update: LastUpdate | null;
  staleAfterDays?: number;
}) {
  if (!update) {
    return (
      <span
        className="text-xs uppercase tracking-wider"
        style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
      >
        Not stated
      </span>
    );
  }

  const when = parseLocalDate(update.at);
  if (Number.isNaN(when.getTime())) {
    return (
      <span
        className="text-xs uppercase tracking-wider"
        style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
      >
        Not stated
      </span>
    );
  }

  const now = new Date();
  const age = relativeAge(when, now);
  const days = Math.floor((now.getTime() - when.getTime()) / 86_400_000);
  // Orange, the token this site already uses for staleness, not amber: §7
  // reserves amber for the focal thing and §11 bars a second accent.
  const stale = days > staleAfterDays;

  return (
    <>
      <span className="block whitespace-nowrap font-semibold">
        <time dateTime={update.at}>{shortDate(update.at, now)}</time>
      </span>
      <span
        className="mt-0.5 block text-xs uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-condensed)",
          color: stale ? "var(--color-status-doubtful)" : "var(--text-muted)",
        }}
      >
        {age ?? "Just filed"} · {update.source}
      </span>
    </>
  );
}
