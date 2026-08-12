"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * §10 requires this on every data-backed page, and §6 is blunt that it is not
 * decoration: a site whose pitch is rigour must always say how old the number
 * is.
 *
 * With no pipeline, `updated` is a date you set by hand when you edit the JSON.
 * That makes it easy to forget, so anything past `staleAfterDays` is called out
 * rather than displayed quietly.
 *
 * Staleness is deliberately computed after hydration rather than during render.
 * These pages are statically prerendered, so a build-time `Date.now()` would be
 * baked into the HTML and frozen — the page would still claim to be fresh
 * months later. The date itself renders on the server (it is always true); the
 * age comparison is the part that has to happen in the reader's present.
 */
/** The date never changes under us; there is nothing to subscribe to. */
const neverChanges = () => () => {};

export function DataFreshness({
  updated,
  label = "Updated",
  staleAfterDays = 8,
}: {
  updated: string;
  label?: string;
  staleAfterDays?: number;
}) {
  const then = parseLocalDate(updated);
  const valid = !Number.isNaN(then.getTime());

  // getSnapshot is the sanctioned place to read a moving external value. It
  // returns whole days, so repeated calls within the same day are identical
  // and React has a stable value to compare.
  const getSnapshot = useCallback(
    () =>
      valid ? Math.floor((Date.now() - then.getTime()) / 86_400_000) : null,
    [valid, then],
  );

  const days = useSyncExternalStore(neverChanges, getSnapshot, () => null);
  const stale = days !== null && days > staleAfterDays;

  const formatted = valid
    ? then.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : updated;

  return (
    <p
      className="inline-flex items-center gap-1.5 text-xs"
      style={{
        color: stale ? "var(--color-status-doubtful)" : "var(--text-muted)",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: stale
            ? "var(--color-status-doubtful)"
            : "var(--color-status-full)",
        }}
      />
      <span>
        {label} <time dateTime={updated}>{formatted}</time>
        {stale && ` — ${days} days ago`}
      </span>
    </p>
  );
}

/**
 * `new Date("2026-08-11")` is parsed as UTC midnight, which renders as the
 * previous day anywhere west of Greenwich — the timestamp would read a day
 * stale in the operator's own timezone. Date-only strings are therefore built
 * as local dates; anything carrying a time is left to the normal parser.
 */
function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
