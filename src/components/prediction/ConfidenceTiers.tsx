import { PRED_TIERS, TIER_LABEL } from "@/lib/predictions";
import type { ConfidenceTier } from "@/lib/predictions";

const TIER_TOKEN: Record<ConfidenceTier, string> = {
  high: "var(--color-status-full)",
  medium: "var(--color-status-questionable)",
  low: "var(--color-status-out)",
  coin_flip: "var(--border-strong)",
};

/**
 * What the model's confidence is actually worth, measured.
 *
 * **No accuracy figure appears here without the coverage it applies to.** That
 * is the whole point of the section: accuracy climbs past 65% only because the
 * close games are excluded, so "77.4% accurate" on its own is a false claim and
 * "77.4% on the 26% of games it calls" is a true one. Every row prints both.
 *
 * The coin-flip band is shown rather than hidden. It is 19% of a slate and hits
 * 49.8% — indistinguishable from chance — and publishing that is more useful
 * than quietly folding it into an average.
 */
export function ConfidenceTiers() {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <section>
      <h2
        className="text-2xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)" }}
      >
        What the confidence means
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        {PRED_TIERS.note}
      </p>

      {/* ---- bands: labelling one game ---- */}
      <h3 className="eyebrow mt-8">Each band, and how often it has been right</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Band</th>
              <th className="py-2 text-left">Model says</th>
              <th className="py-2 text-right">Share of games</th>
              <th className="py-2 text-right">Right this often</th>
            </tr>
          </thead>
          <tbody>
            {PRED_TIERS.bands.map((b) => (
              <tr key={b.tier} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: TIER_TOKEN[b.tier] }}
                    />
                    {TIER_LABEL[b.tier]}
                  </span>
                </td>
                <td className="py-2 tnum" style={{ color: "var(--text-secondary)" }}>
                  {b.prob_range[1] >= 1
                    ? `${pct(b.prob_range[0])} or better`
                    : `${pct(b.prob_range[0])} – ${pct(b.prob_range[1])}`}
                </td>
                <td className="py-2 text-right tnum">
                  {pct(b.share_of_slate)}
                  <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    ({b.games.toLocaleString()})
                  </span>
                </td>
                <td className="py-2 text-right tnum">{pct(b.historical_accuracy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- cumulative: how selective do you want to be ---- */}
      <h3 className="eyebrow mt-10">Being choosier buys accuracy, and costs coverage</h3>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Each row is the same model, ignoring the games below a threshold. Accuracy
        rises only because the hard games have been dropped. The modelling does not improve down the table.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {PRED_TIERS.cumulative.map((c) => (
          <li key={c.threshold} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="w-28 shrink-0 text-sm tnum">
              {pct(c.threshold)} or better
            </span>
            <span
              className="relative h-4 flex-1 overflow-hidden rounded-sm"
              style={{ background: "var(--border-subtle)" }}
              title={`${c.n.toLocaleString()} games`}
            >
              <span
                className="absolute inset-y-0 left-0"
                style={{ width: `${c.coverage * 100}%`, background: "var(--border-strong)" }}
              />
            </span>
            <span className="w-auto shrink-0 text-sm">
              <strong className="tnum">{pct(c.accuracy)}</strong>
              <span style={{ color: "var(--text-muted)" }}>
                {" "}on the {pct(c.coverage)} of games it calls
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
