/**
 * Date helpers shared by anything that prints how old something is.
 *
 * Extracted because `DataFreshness` had already solved the parsing trap below
 * and the injury tracker's "last update" column needed the same fix; a second
 * copy is how the two drift apart.
 */

/**
 * `new Date("2026-08-11")` is parsed as UTC midnight, which renders as the
 * previous day anywhere west of Greenwich — a timestamp would read a day stale
 * in the operator's own timezone. Date-only strings are therefore built as
 * local dates; anything carrying a time is left to the normal parser.
 */
export function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * How long ago, in the site's voice: a number and what it means, nothing else.
 *
 * Hours below a day because an injury wire moves inside one — "today" would
 * hide the difference between a designation filed at breakfast and one filed
 * ten minutes ago, and on this page that difference is the whole point.
 *
 * Returns null for a future stamp rather than printing "in 2 hours". A clock
 * skew between Sleeper and this machine is the likely cause, and a tracker
 * claiming to know tomorrow's news is worse than one saying nothing.
 */
export function relativeAge(from: Date, now: Date = new Date()): string | null {
  const ms = now.getTime() - from.getTime();
  if (Number.isNaN(ms) || ms < 0) return null;

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return "just now";

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;

  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

/**
 * `Aug 24`, or `Aug 24, 2025` when it is not the current year.
 *
 * Takes the raw string rather than a Date, because the two kinds of stamp this
 * site stores have to be formatted differently and only the string says which
 * is which:
 *
 *  - **A datetime is an absolute instant** and is pinned to Eastern, the zone
 *    this site reports in. Rendered in the server's own zone instead, an
 *    evening update stamped in UTC reads as tomorrow (§6) — Sleeper's
 *    `2026-08-24T01:25Z` is Saturday evening in the US, not Sunday, and a
 *    tracker that ages it wrongly is worse than one with no date.
 *  - **A date-only string carries no instant.** `parseLocalDate` already
 *    builds it as local midnight for exactly this reason, so pinning a zone on
 *    top would shift it a day the other way.
 */
export function shortDate(value: string, now: Date = new Date()): string {
  const d = parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return value;

  const absolute = value.includes("T");
  const zone = absolute ? { timeZone: "America/New_York" as const } : {};
  const year = (x: Date) =>
    Number(x.toLocaleDateString("en-US", { ...zone, year: "numeric" }));

  return d.toLocaleDateString("en-US", {
    ...zone,
    month: "short",
    day: "numeric",
    ...(year(d) === year(now) ? {} : { year: "numeric" }),
  });
}
