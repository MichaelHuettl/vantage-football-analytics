import { Term } from "@/components/prediction/Term";
import {
  UNCHARTED_TOP_FEATURES, metricImportance, rankMetrics,
} from "@/lib/predictions";
import type { FeatureComparison as FC, MetricSide } from "@/lib/predictions";

/**
 * The two teams held against each other, one metric at a time.
 *
 * **Bars are drawn from `*_rating`, never from `*_percentile`.** The pipeline
 * pre-orients ratings so 100 is always good; the raw percentiles are not
 * oriented and mean opposite things by column. Seattle's defence sits at the
 * 1.7th raw percentile in EPA allowed — because allowing little is the point —
 * and charting that figure would draw the league's best defence as its worst.
 * The raw number is still shown, in the tooltip, where its literal meaning is
 * explained rather than implied.
 */
export function FeatureComparison({ rows }: { rows: FC[] }) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          className="text-2xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          How the teams compare
        </h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          heaviest model weight first · 0–100, oriented so higher is always better
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-7">
        {rankMetrics(rows).map((row) => (
          <div key={row.metric}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h3 className="eyebrow">
                <Term label={row.label} definition={row.definition} />
              </h3>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {row.short}
              </span>
              {metricImportance(row.metric) !== null && (
                <span
                  className="text-xs tnum"
                  style={{ color: "var(--text-muted)" }}
                  title="share of the model's total feature weight"
                >
                  · weight {metricImportance(row.metric)!.toFixed(1)}
                </span>
              )}
            </div>

            {row.data_available === false ? (
              /* Not an error and not a gap in the UI — the pipeline has no
                 values yet. Injury reports for a September slate are not
                 published in August, so saying so beats an empty chart. */
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                No data yet for this metric — nothing has been published for these
                teams at this point in the week. It will fill in once it exists.
              </p>
            ) : (
            <div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Pair side="Offense" home={row.home} away={row.away} which="offense" />
              {hasSide(row, "defense") ? (
                <Pair
                  side={row.defense_metric_label || "Defense"}
                  home={row.home}
                  away={row.away}
                  which="defense"
                />
              ) : (
                <p className="self-center text-xs" style={{ color: "var(--text-muted)" }}>
                  Offense only — the model does not compute a defensive figure for this
                  metric, so there is nothing to compare rather than nothing to show.
                </p>
              )}
            </div>
            )}
          </div>
        ))}
      </div>

      {UNCHARTED_TOP_FEATURES.length > 0 && (
        <p className="mt-8 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
          <strong>This chart is not the model.</strong> It shows the inputs that read
          well as a side-by-side. {UNCHARTED_TOP_FEATURES.length} of the model&rsquo;s
          heaviest-weighted inputs have no head-to-head form and are not drawn here —{" "}
          {UNCHARTED_TOP_FEATURES.slice(0, 4).map((f) => f.label.toLowerCase()).join(", ")}{" "}
          among them. The full list of all 55 is on the methodology tab.
        </p>
      )}
    </section>
  );
}

/**
 * Whether a metric has a side at all.
 *
 * `explosive_pass_rate` carries no defensive value for any team in any game —
 * 32 of 32 null — so it is absent by design rather than missing by accident.
 * Drawing an empty bar would imply a team allowed zero explosive passes, which
 * is the opposite of true; saying so is the only honest option.
 */
function hasSide(row: FC, which: "offense" | "defense"): boolean {
  const k = which === "offense" ? "offense_rating" : "defense_rating";
  return row.home[k] !== null && row.away[k] !== null;
}

function Pair({
  side, home, away, which,
}: {
  side: string;
  home: MetricSide;
  away: MetricSide;
  which: "offense" | "defense";
}) {
  const rk = which === "offense" ? "offense_rating" : "defense_rating";
  const pk = which === "offense" ? "offense_percentile" : "defense_percentile";
  const vk = which;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {side}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {[away, home].map((t) => (
          <div key={t.team} className="flex items-center gap-3">
            <span
              className="w-10 shrink-0 text-xs font-bold uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {t.team}
            </span>
            <span
              className="relative h-3 flex-1 overflow-hidden rounded-sm"
              style={{ background: "var(--border-subtle)" }}
              title={
                t[vk] === null || t[pk] === null
                  ? "not computed for this metric"
                  : `raw value ${t[vk].toFixed(3)} · ${t[pk].toFixed(1)}th percentile of the league distribution`
              }
            >
              <span
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${t[rk] ?? 0}%`,
                  background:
                    (t[rk] ?? 0) >= 66
                      ? "var(--color-status-full)"
                      : (t[rk] ?? 0) >= 33
                        ? "var(--color-status-questionable)"
                        : "var(--color-status-out)",
                }}
              />
            </span>
            <span
              className="w-10 shrink-0 text-right text-xs tnum"
              style={{ color: "var(--text-secondary)" }}
            >
              {t[rk] === null ? "—" : Math.round(t[rk])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
