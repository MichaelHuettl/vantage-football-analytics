import { TeamChip } from "@/components/TeamChip";
import type { ContextType, SituationalCard } from "@/lib/predictions";

/**
 * The circumstances around the game, as the pipeline recorded them.
 *
 * All seven card types are handled even though this slate only produces five —
 * `rest` and `injury` are defined upstream and would otherwise render as blanks
 * the first week one appears.
 */
const TYPE_LABEL: Record<ContextType, string> = {
  form: "Recent form",
  venue: "Venue",
  scheme: "Scheme",
  rest: "Rest",
  injury: "Injuries",
  weather: "Weather",
  context: "Context",
};

const IMPACT_TOKEN: Record<SituationalCard["impact"], string> = {
  positive: "var(--color-status-full)",
  negative: "var(--color-status-out)",
  neutral: "var(--border-strong)",
};

/**
 * The base-front label is inferred from roster composition and agrees with real
 * snap data at Spearman 0.50 — the ordering is right, but the modern NFL plays
 * nickel by default, so it is a weak descriptor and the model leans far more on
 * measured efficiency. Saying so on the card is cheaper than having a reader
 * conclude the front is driving the prediction.
 */
const SCHEME_CAVEAT =
  "Base front is inferred from roster composition (agrees with snap data at " +
  "Spearman 0.50). Most teams play nickel by default, so this is a weak " +
  "descriptor: measured defensive efficiency carries far more weight in the model.";

export function SituationalCards({ cards }: { cards: SituationalCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section>
      <h2
        className="text-2xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
      >
        Around the game
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <li
            key={`${c.type}-${c.team ?? "none"}-${i}`}
            className="rounded border p-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="eyebrow" style={{ color: "var(--text-muted)" }}>
                {TYPE_LABEL[c.type] ?? c.type}
              </span>
              <span className="flex items-center gap-2">
                {c.team && <TeamChip abbr={c.team} size="sm" />}
                <span
                  aria-label={`${c.impact} factor`}
                  title={`${c.impact} factor`}
                  className="h-2 w-2 rounded-full"
                  style={{ background: IMPACT_TOKEN[c.impact] }}
                />
              </span>
            </div>
            <p className="mt-2 font-semibold">{c.headline}</p>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              {c.detail}
            </p>
            {c.type === "scheme" && (
              <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                {SCHEME_CAVEAT}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
