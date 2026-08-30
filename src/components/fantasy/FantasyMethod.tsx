import { Callout } from "../Callout";
import { PositionBadge } from "@/components/PlayerLink";
import {
  FM_CONFIG, FM_DRIVERS, FM_METRICS, FM_POSITION_NAME, FM_POSITIONS, FM_SCORING,
  FM_SPAN,
} from "@/lib/fantasy";
import type { Position } from "@/lib/types";

/**
 * How the projection is built, and what it is built from.
 *
 * The section leads with the scoring rules because a projection is meaningless
 * without them — twelve points in half-PPR is a different player than twelve in
 * full — and closes with the factors, because "what does it actually look at"
 * is the question every reader of a model page arrives with.
 */
/**
 * Payload keys as English.
 *
 * These were rendered with `key.replace(/_/g, " ")` until 2026-08-30, which
 * printed the key rather than a label: "rushing receiving yards" reads as a
 * run-on, and "passing td" leaves an initialism in lower case. The fallback is
 * kept for a key this map has not met yet, so a new scoring rule still renders
 * rather than disappearing.
 */
const SCORING_LABEL: Record<string, string> = {
  passing_yards: "Passing yards",
  passing_td: "Passing TD",
  interception: "Interception",
  rushing_receiving_yards: "Rushing and receiving yards",
  rushing_receiving_td: "Rushing and receiving TD",
  reception: "Reception",
  fumble_lost: "Fumble lost",
  kicking: "Kicking",
  defense: "Defense",
};

export function FantasyMethod() {
  const trainFrom = Math.min(...FM_CONFIG.train_seasons);
  const trainTo = Math.max(...FM_CONFIG.train_seasons);

  return (
    <section>
      <h2 className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}>
        How it works
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Six separate models, one per position, each predicting how many points a
        player scores in a game that has not been played, using only what was knowable before kickoff. Trained on {trainFrom}&ndash;{trainTo},
        tuned on {FM_CONFIG.valid_season}, and scored once on{" "}
        {FM_CONFIG.test_season}, which it never saw during fitting.
      </p>

      {/* ---------------- scoring ---------------- */}
      <h3 className="eyebrow mt-10">The scoring it projects</h3>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Standard 1-point PPR. These rules are implemented explicitly rather than
        taken from the source data, then checked back against nflverse&rsquo;s own
        fantasy column on all {FM_SPAN.player_weeks.toLocaleString()} player-weeks, and they now agree on every one.
      </p>
      <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {Object.entries(FM_SCORING).map(([key, rule]) => (
          <div key={key} className="flex flex-col">
            <dt className="eyebrow">{SCORING_LABEL[key] ?? key.replace(/_/g, " ")}</dt>
            <dd className="text-sm">{rule}</dd>
          </div>
        ))}
      </dl>

      {/* ---------------- factors ---------------- */}
      <h3 className="eyebrow mt-12">What goes into a projection</h3>
      <p className="mt-2 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Four families of input, all of them lagged by a game so that nothing a
        row predicts can leak into what predicts it.
      </p>
      <ul className="mt-4 flex max-w-3xl flex-col gap-3 text-sm">
        {[
          ["Recent form", "Rolling three- and five-game averages of scoring, yardage and volume, plus the player's per-game average across the whole of last season."],
          ["Usage and role", "Target share, carry share, air yards share, weighted opportunity rating, and snap share: how much of the offense actually runs through him, rather than how efficient he was with it."],
          ["Matchup", "Points that defense has allowed to this position, built from the weeks already played and falling back to last season's figure in September."],
          ["Game environment", "The betting market's spread and total, converted into how many points each team is expected to score. This is the one input from outside the box score, and for kickers and defenses it is most of the signal."],
        ].map(([title, body]) => (
          <li key={title} className="flex flex-col gap-1">
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{title}</span>
            <span style={{ color: "var(--text-secondary)" }}>{body}</span>
          </li>
        ))}
      </ul>

      <Callout className="mt-8" label="Why every feature is lagged">
        <p className="max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
          The quickest way to build a projection model that looks brilliant and is
          worthless is to let a week&rsquo;s own statistics into the features that
          predict it. Every rolling average, share and matchup rating here is
          computed one game behind, and a guard stops the pipeline if any feature
          ever correlates with same-week scoring above 0.95. The looser check is
          the accuracy itself: a leaking model does not beat a three-game average
          by six percent, it beats it by eighty.
        </p>
      </Callout>

      {/* ---------------- per-position models ---------------- */}
      <h3 className="eyebrow mt-12">A different model for each position</h3>
      <p className="mt-2 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        A kicker and a wide receiver share almost no useful inputs, so they do not
        share a model. Two families are fitted every time, a ridge regression and a gradient booster, and the one that does better on
        the tuning season is the one that ships. Which wins is a result, not a
        preference.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {FM_POSITIONS.map((pos) => {
          const m = FM_METRICS[pos];
          const drv = FM_DRIVERS[pos];
          if (!m || !drv) return null;
          const biggest = Math.max(...drv.items.map((i) => Math.abs(i.value))) || 1;
          return (
            <div key={pos} className="rounded border p-5"
                 style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <PositionBadge position={pos as Position} />
                <span className="eyebrow">{FM_POSITION_NAME[pos]}</span>
                <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                  {m.model === "hgb" ? "gradient booster" : "ridge"} · {m.features} inputs
                </span>
              </div>
              <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                {drv.kind}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {drv.items.slice(0, 5).map((it) => (
                  <li key={it.feature} className="flex items-center gap-3 text-xs">
                    <span className="w-40 shrink-0 truncate tnum"
                          style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)" }}>
                      {it.feature.replace(/_/g, " ")}
                    </span>
                    <span className="relative h-2 flex-1 rounded-sm"
                          style={{ background: "var(--border-subtle)" }}>
                      <span className="absolute inset-y-0 left-0 rounded-sm"
                            style={{
                              width: `${(Math.abs(it.value) / biggest) * 100}%`,
                              background: "var(--border-strong)",
                              opacity: it.value < 0 ? 0.45 : 1,
                            }} />
                    </span>
                    <span className="w-12 shrink-0 text-right tnum"
                          style={{ color: "var(--text-muted)" }}>
                      {it.value > 0 ? "+" : ""}{it.value.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
