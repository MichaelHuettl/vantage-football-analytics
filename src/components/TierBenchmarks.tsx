import type { Tier } from "@/lib/charts";

/**
 * What a season in each tier has actually looked like.
 *
 * The two columns are the point: the gap between finishing top three and
 * finishing fourth to tenth is small on every line — about thirty carries and
 * twenty-five targets — which is why the tier is decided by opportunity rather
 * than by talent, and why it moves so much year to year.
 *
 * Values come straight from the workbook's own summary rows. Nothing is
 * recomputed here (§11).
 */
export function TierBenchmarks({ tiers }: { tiers: Tier[] }) {
  const keys = [...new Set(tiers.flatMap((t) => Object.keys(t.thresholds)))];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: 460 }}>
        <thead>
          <tr style={{ background: "var(--surface-sunken)" }}>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
            >
              Benchmark
            </th>
            {tiers.map((t) => (
              <th
                key={t.label}
                scope="col"
                className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
              >
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <td className="px-3 py-2">{k}</td>
              {tiers.map((t, i) => (
                <td
                  key={t.label}
                  className="px-3 py-2 text-right font-semibold tnum"
                  style={
                    // Amber marks the tier being aimed at, once, which is what
                    // §7 reserves it for.
                    i === 0
                      ? { color: "var(--color-vantage-amber)" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  {t.thresholds[k] !== undefined ? trim(t.thresholds[k]) : "—"}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t" style={{ borderColor: "var(--border-strong)" }}>
            <td
              className="px-3 py-2 align-top text-xs uppercase tracking-wider"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
            >
              Clearing it now
            </td>
            {tiers.map((t) => (
              <td
                key={t.label}
                className="px-3 py-2 text-right text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {t.candidates.join(", ") || "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
