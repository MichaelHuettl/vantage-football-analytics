import Link from "next/link";

/**
 * A number with its percentile context and a route to its definition.
 *
 * Two deliberate choices:
 *
 * 1. The percentile shading is neutral, not amber. §7 reserves amber for the
 *    focal thing on screen; if every strong metric in a table were amber the
 *    accent would stop meaning anything. `emphasis` opts a single value in.
 *
 * 2. Shading is never the only signal — the number is always legible on its
 *    own, per §7's rule that colour cannot be the sole carrier of meaning.
 */
export function MetricValue({
  value,
  percentile,
  glossary,
  emphasis = false,
  suffix,
}: {
  value: number | string;
  /** 0-100. Omit when unknown; the cell then renders unshaded. */
  percentile?: number;
  /** Glossary slug. §4.2 requires every on-screen metric to resolve to one. */
  glossary?: string;
  emphasis?: boolean;
  suffix?: string;
}) {
  const p = percentile ?? null;
  const strength = p === null ? 0 : Math.max(0, (p - 40) / 60);

  const background = emphasis
    ? `color-mix(in oklab, var(--color-vantage-amber) 22%, transparent)`
    : strength > 0
      ? `color-mix(in oklab, var(--text-primary) ${Math.round(strength * 14)}%, transparent)`
      : "transparent";

  const inner = (
    <span
      className="inline-flex items-baseline gap-0.5 rounded px-1.5 py-0.5 tnum font-semibold"
      style={{
        background,
        boxShadow: emphasis
          ? "inset 0 0 0 1px var(--color-vantage-amber)"
          : undefined,
      }}
    >
      {value}
      {suffix && (
        <span
          className="text-[0.7em] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {suffix}
        </span>
      )}
    </span>
  );

  if (!glossary) return inner;

  return (
    <Link
      href={`/glossary#${glossary}`}
      className="hover:underline decoration-dotted underline-offset-4"
      title="See definition"
    >
      {inner}
    </Link>
  );
}
