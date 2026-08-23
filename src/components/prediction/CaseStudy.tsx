import { TeamChip } from "@/components/TeamChip";
import {
  MISS_BANDS, MISS_BEST, MISS_BEST_VS_MARKET, MISS_DIVISIONAL, MISS_HEADLINE,
  MISS_MARGINS, MISS_QB_OUT, MISS_SCALE, MISS_SEASONS, MISS_SHARED,
  MISS_SHARED_SHARE, MISS_SOLO_SLATE_SHARE, MISS_SOURCE, MISS_SUMMARY,
  MISS_TURNOVERS, MISS_WEATHER, MISS_WINDOW, MISS_WORST, MISS_WORST_SEASON,
  MISS_WORST_VS_MARKET, bandTier,
} from "@/lib/misses";
import type { SeasonRecord } from "@/lib/misses";
import { TIER_LABEL } from "@/lib/predictions";
import type { ConfidenceTier } from "@/lib/predictions";

const TIER_TOKEN: Record<ConfidenceTier, string> = {
  high: "var(--color-status-full)",
  medium: "var(--color-status-questionable)",
  low: "var(--color-status-out)",
  coin_flip: "var(--border-strong)",
};

/**
 * Percentages, rounded half-up rather than however the float lands.
 *
 * `(0.6265 * 100).toFixed(1)` is "62.6", because the double nearest 62.65 sits
 * just below it. The extractor and the pipeline's own report both print 62.7
 * for that season, and a page that disagrees with its source in the first
 * decimal invites exactly the audit it would then fail. Scaling before the
 * round puts the two back in step.
 */
const round = (n: number, dp: number) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};
const pct = (n: number, dp = 1) => `${round(n * 100, dp).toFixed(dp)}%`;
const pts = (n: number) => `${n > 0 ? "+" : ""}${round(n * 100, 1).toFixed(1)}`;

/**
 * The case study: every game the model got wrong, and why.
 *
 * The section exists because the prediction pages make a claim the reader has
 * no way to check — that the model is honest about its limits. This is the
 * evidence for it: 292 losses examined rather than an accuracy figure quoted.
 *
 * **The order is the argument.** The raw miss count comes first and is
 * immediately reframed, because 292 wrong looks damning until you learn the
 * market lost 253 of the same games. Then where the misses sit, then the
 * seasons, then the four candidate explanations — three of which are ruled
 * *out*, which is the part that makes the fourth worth believing. A page that
 * only listed what went wrong would be a confession; this one is a diagnosis.
 *
 * Nothing here is computed. Every count, share, correlation and best/worst pick
 * arrives from `scripts/curated/model_misses.py`, which refuses to write unless
 * the pipeline's own report and the artifacts behind it agree (§11).
 */
export function CaseStudy() {
  return (
    <section>
      <h2 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
        Where the model was wrong
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Every miss from {MISS_WINDOW.from} to {MISS_WINDOW.to}, out of sample.
        The model predicted {MISS_HEADLINE.games} games over those three seasons
        and got {MISS_HEADLINE.misses} of them wrong, at{" "}
        {pct(MISS_HEADLINE.accuracy)} accuracy. What follows is the
        {" "}{MISS_HEADLINE.misses}, sorted, explained, and in one section excused.
      </p>

      <Reframing />
      <Concentration />
      <Seasons />
      <WhatItCouldNotSee />
      <WorstTwenty />
      <HonestLimit />

      <p className="mt-12 text-xs" style={{ color: "var(--text-muted)" }}>
        {MISS_SOURCE}.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ 1. the reframing */

/**
 * The number that changes how every other number here reads.
 *
 * Amber lands on the model-specific count and nowhere else in this panel. The
 * miss count is the headline, but that residue is the finding, and §7 gives
 * the colour to one thing per screen — a panel outlined in amber *and* an
 * amber number inside it spends the emphasis twice and points at neither.
 */
function Reframing() {
  return (
    <div
      className="mt-8 rounded border-l-4 p-4 sm:p-6"
      style={{ borderColor: "var(--border-strong)", background: "var(--surface-sunken)" }}
    >
      <h3 className="eyebrow">The finding that reframes the rest</h3>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Of the {MISS_HEADLINE.misses} misses, the betting market picked the same
        losing side in <strong className="tnum">{MISS_SHARED}</strong> of them
        ({pct(MISS_SHARED_SHARE, 0)}). Only{" "}
        <strong className="tnum" style={{ color: "var(--color-vantage-amber)" }}>
          {MISS_HEADLINE.model_specific} games
        </strong>{" "},
        or {pct(MISS_SOLO_SLATE_SHARE)} of the slate, are failures unique to this model. The rest are games the sharpest-priced market in sport also called
        wrong. Judging the model by its raw miss count measures the difficulty of
        predicting football, not the quality of the model.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {[
          { k: "Games predicted", v: MISS_HEADLINE.games.toLocaleString() },
          { k: "Got wrong", v: MISS_HEADLINE.misses.toLocaleString() },
          { k: "Median losing margin", v: `${MISS_HEADLINE.median_losing_margin} pts` },
          { k: "Model-specific", v: MISS_HEADLINE.model_specific.toLocaleString() },
        ].map((s) => (
          <div key={s.k}>
            <dt className="eyebrow">{s.k}</dt>
            <dd className="mt-1 text-2xl tnum" style={{ fontFamily: "var(--font-display)" }}>
              {s.v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* --------------------------------------------------------------- 2. where they sit */

function Concentration() {
  return (
    <div className="mt-12">
      <h3 className="text-xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
        Where the misses concentrate
      </h3>

      <h4 className="eyebrow mt-6">By confidence band</h4>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Band</th>
              <th className="py-2 text-right">Games</th>
              <th className="py-2 text-right">Wrong</th>
              <th className="py-2 text-right">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {MISS_BANDS.map((b) => {
              const tier = bandTier(b.band);
              return (
                <tr key={b.band} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: tier ? TIER_TOKEN[tier] : "var(--border-strong)" }}
                      />
                      {tier ? TIER_LABEL[tier] : b.band}
                    </span>
                  </td>
                  <td className="py-2 text-right tnum">{b.games}</td>
                  <td className="py-2 text-right tnum">{b.wrong}</td>
                  <td className="py-2 text-right tnum">{pct(b.accuracy)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        The bands behave as they should. The model is not confidently wrong; it is{" "}
        <em>uncertain and wrong</em>, which is the honest failure mode, and the
        one a reader can act on, by ignoring the coin flips.
      </p>

      <h4 className="eyebrow mt-8">By how badly it lost</h4>
      <ul className="mt-3 flex flex-col gap-2">
        {MISS_MARGINS.map((m) => (
          <li key={m.bucket} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="w-32 shrink-0 text-sm">{m.bucket}</span>
            <span
              className="relative h-4 flex-1 overflow-hidden rounded-sm"
              style={{ background: "var(--border-subtle)" }}
            >
              <span
                className="absolute inset-y-0 left-0"
                style={{ width: `${m.share * 100}%`, background: "var(--border-strong)" }}
              />
            </span>
            <span className="w-28 shrink-0 text-sm tnum">
              {m.misses}
              <span style={{ color: "var(--text-muted)" }}> · {pct(m.share)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        {MISS_MARGINS[0].misses} of {MISS_HEADLINE.misses} misses were lost by a
        field goal or less. Those are not misjudgements. A one-score game is near a coin flip whatever was known beforehand. The{" "}
        {MISS_MARGINS[MISS_MARGINS.length - 1].misses} lost by fifteen or more are
        the ones worth interrogating.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- 3. the seasons */

/**
 * Best and worst seasons, and why each happened.
 *
 * This is the one part of the section that is not in the pipeline's report —
 * it comes from the walk-forward folds, one per season, which is the model's
 * own record of years it had not seen when it predicted them.
 *
 * The market line beside each bar is doing the real work. Without it a reader
 * concludes the model got worse in {MISS_SUMMARY.worst}; with it, the reason is
 * plain — that was the market's worst season too.
 */
function Seasons() {
  const span = MISS_SCALE.max - MISS_SCALE.min;
  const offset = (v: number) => ((v - MISS_SCALE.min) / span) * 100;

  return (
    <div className="mt-12">
      <h3 className="text-xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
        Its best and worst seasons
      </h3>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Every season the model was tested on, {MISS_SUMMARY.span[0]} to{" "}
        {MISS_SUMMARY.span[1]}, covering {MISS_SUMMARY.total_games.toLocaleString()} games,
        each predicted by a model trained only on the seasons before it. The bar
        is the model; the tick is the market on the same games. Bars start at{" "}
        {pct(MISS_SCALE.min, 0)}, not zero, because every season lands in a
        twelve-point range and a full axis would hide the differences.
      </p>

      <ul className="mt-6 flex flex-col gap-1.5">
        {MISS_SEASONS.map((s) => {
          const focal = s.season === MISS_SUMMARY.best || s.season === MISS_SUMMARY.worst;
          return (
            <li key={s.season} className="flex items-center gap-3 text-sm">
              <span className="w-10 shrink-0 tnum" style={{ color: focal ? "var(--text-primary)" : "var(--text-muted)" }}>
                {s.season}
              </span>
              <span
                className="relative h-5 flex-1 rounded-sm"
                style={{ background: "var(--border-subtle)" }}
                title={`${s.season}: model ${pct(s.accuracy)}, market ${pct(s.market_accuracy)} over ${s.games} games`}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{
                    width: `${offset(s.accuracy)}%`,
                    background: focal ? "var(--color-vantage-amber)" : "var(--border-strong)",
                  }}
                />
                {/* The market on the same games, as a tick rather than a second
                    bar: it is a reference line, not a competing series. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-0.5"
                  style={{ left: `${offset(s.market_accuracy)}%`, background: "var(--text-primary)" }}
                />
              </span>
              <span className="w-14 shrink-0 text-right tnum">{pct(s.accuracy)}</span>
              <span
                className="w-12 shrink-0 text-right text-xs tnum"
                style={{ color: "var(--text-muted)" }}
                title="Model minus market, in points of accuracy"
              >
                {pts(s.gap)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {MISS_BEST && <SeasonCard season={MISS_BEST} kind="best" />}
        {MISS_WORST_SEASON && <SeasonCard season={MISS_WORST_SEASON} kind="worst" />}
      </div>

      <div className="mt-8">
        <h4 className="eyebrow">Why the good years are good</h4>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
          Across all {MISS_SEASONS.length} seasons, the model&rsquo;s accuracy tracks the
          market&rsquo;s at <strong className="tnum">r = {MISS_SUMMARY.market_correlation}</strong>.
          Its worst season, {MISS_SUMMARY.worst}, was also the market&rsquo;s worst
          season{MISS_SUMMARY.worst === MISS_SUMMARY.market_worst ? "" : ` (the market's own worst was ${MISS_SUMMARY.market_worst})`}.
          That is the honest reading of the chart above: a good year is mostly a
          season that was predictable, and a bad one is a season that was not.
          The same model, fit the same way, produced {MISS_SUMMARY.best} and{" "}
          {MISS_SUMMARY.worst}. What changed was the football.
        </p>
        <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
          Measured against the market instead of against itself, the picture
          changes. {MISS_BEST_VS_MARKET?.season} is the model&rsquo;s real high point, {" "}{pts(MISS_BEST_VS_MARKET?.gap ?? 0)} points clear of the market on{" "}
          {MISS_BEST_VS_MARKET?.games} games, the only season in the record it
          beat the closing line by more than a point. {MISS_WORST_VS_MARKET?.season}{" "}
          is the real low point: {pct(MISS_WORST_VS_MARKET?.accuracy ?? 0)} looks
          respectable until you see the market at{" "}
          {pct(MISS_WORST_VS_MARKET?.market_accuracy ?? 0)} on the same slate.
        </p>
      </div>
    </div>
  );
}

/**
 * One season, with the numbers that explain it.
 *
 * Both cards show the same seven measures, deliberately. A best-season card
 * listing its strengths and a worst-season card listing different weaknesses
 * would be picking whichever statistic flattered the story.
 *
 * Neither card is amber. The two seasons are already marked amber in the chart
 * directly above, and repeating it here would make the colour mean "this
 * section" rather than "look at this" (§7).
 */
function SeasonCard({ season, kind }: { season: SeasonRecord; kind: "best" | "worst" }) {
  const best = kind === "best";
  return (
    <div
      className="rounded border p-4 sm:p-5"
      style={{ borderColor: "var(--border-subtle)", background: "var(--surface-sunken)" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-lg uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          {best ? "Best season" : "Worst season"} · {season.season}
        </h4>
        <span className="text-2xl tnum" style={{ fontFamily: "var(--font-display)" }}>
          {pct(season.accuracy)}
        </span>
      </div>

      <dl className="mt-4 flex flex-col gap-2 text-sm">
        {[
          { k: "Market, same games", v: pct(season.market_accuracy) },
          { k: "Model minus market", v: `${pts(season.gap)} pts` },
          { k: "Misses", v: `${season.misses} of ${season.games}` },
          { k: "Shared with the market", v: `${season.shared_with_market} (${pct(season.shared_with_market / season.misses, 0)})` },
          { k: "Model-specific", v: `${season.model_specific}` },
          { k: "Lost by 3 or fewer", v: `${season.one_score_misses}` },
          { k: "Calibration error", v: season.calibration_error === null ? "n/a" : season.calibration_error.toFixed(3) },
        ].map((r) => (
          <div key={r.k} className="flex items-baseline justify-between gap-4">
            <dt style={{ color: "var(--text-muted)" }}>{r.k}</dt>
            <dd className="tnum">{r.v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        {best ? (
          <>
            The market was near its own best that year too, and the season was
            unusually clean: {pct(season.close_game_share, 0)} of games finished
            within a field goal, the lowest share in the record. Only{" "}
            {season.model_specific} of its {season.misses} misses were games the
            market got right. This is what the model looks like when football
            cooperates.
          </>
        ) : (
          <>
            The market fell to {pct(season.market_accuracy)} the same year, its worst season in the record, so most of this was the season, not the
            model. But not all: the model was also at its most confident
            ({pct(season.mean_confidence)} average) and its worst calibrated
            (error {season.calibration_error?.toFixed(3)}, against{" "}
            {MISS_BEST?.calibration_error?.toFixed(3)} in {MISS_BEST?.season}). Confident
            and wrong is the expensive combination, and it is the one year the
            record shows it.
          </>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------- 4. the candidate explanations */

function WhatItCouldNotSee() {
  const { div_accuracy, div_games, non_div_accuracy, non_div_games } = MISS_DIVISIONAL;
  return (
    <div className="mt-12">
      <h3 className="text-xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
        What the model could not see
      </h3>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Four candidate explanations, tested against the {MISS_HEADLINE.misses}{" "}
        misses. Three of them fail, which is what makes the fourth worth
        believing.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <Finding
          verdict="The explanation"
          title="Turnovers"
          focal
          body={
            <>
              When the model was right, its pick won the turnover battle by{" "}
              <strong className="tnum">+{MISS_TURNOVERS.when_right}</strong> per game.
              When it was wrong, that team lost it by{" "}
              <strong className="tnum">{MISS_TURNOVERS.when_wrong}</strong>, a swing of <strong className="tnum">{MISS_TURNOVERS.swing} turnovers per game</strong>{" "}
              between a correct prediction and an incorrect one, and{" "}
              {MISS_TURNOVERS.misses_losing_to} of {MISS_HEADLINE.misses} misses
              featured the picked team losing that battle. This is the largest gap
              between what the model knows and what decides games, and it is
              largely irreducible: the model carries takeaway and giveaway{" "}
              <em>rates</em> as rolling inputs, but a rate is not an event. Nothing
              pre-game predicts which Sunday a quarterback throws three picks.
            </>
          }
        />

        <Finding
          verdict="Not the culprit"
          title="Weather"
          body={
            <>
              <span className="mb-3 block">
                The intuition that bad weather breeds upsets is not supported. Ugly
                conditions appear to <em>suppress</em> variance: fewer possessions and a narrower playbook favor the better team.
              </span>
              <span className="block overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
                      <th className="py-2 text-left">Condition</th>
                      <th className="py-2 text-right">Games</th>
                      <th className="py-2 text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MISS_WEATHER.map((w) => (
                      <tr key={w.condition} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                        <td className="py-2">{w.condition}</td>
                        <td className="py-2 text-right tnum">{w.games}</td>
                        <td className="py-2 text-right tnum">{pct(w.accuracy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </span>
            </>
          }
        />

        <Finding
          verdict="Handled"
          title="Known injuries"
          body={
            <>
              In the {MISS_QB_OUT.games} games with a quarterback listed out, the
              model went <strong className="tnum">{pct(MISS_QB_OUT.accuracy)}</strong>, better than its overall rate. A <em>known</em> absence is priced
              correctly because it is on the injury report and the model reads it.
              The injuries that hurt are the ones at 1:20pm: an in-game exit has no
              pre-game feature.
            </>
          }
        />

        <Finding
          verdict="Real, but modest"
          title="Divisional games"
          body={
            <>
              Divisional games run <strong className="tnum">{pct(div_accuracy)}</strong>{" "}
              across {div_games} of them, against{" "}
              <strong className="tnum">{pct(non_div_accuracy)}</strong> on the{" "}
              {non_div_games} non-divisional. The familiarity cliché holds, but it is
              worth {((non_div_accuracy - div_accuracy) * 100).toFixed(1)} points of
              accuracy, not the mythology attached to it.
            </>
          }
        />
      </div>
    </div>
  );
}

/** One tested explanation. `focal` marks the only one that survived. */
function Finding({
  verdict, title, body, focal = false,
}: {
  verdict: string;
  title: string;
  body: React.ReactNode;
  focal?: boolean;
}) {
  return (
    <div
      className="rounded border-l-4 p-4 sm:p-5"
      style={{
        borderColor: focal ? "var(--color-vantage-amber)" : "var(--border-strong)",
        background: "var(--surface-raised)",
      }}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-lg uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h4>
        <span className="eyebrow" style={{ color: focal ? "var(--color-vantage-amber)" : "var(--text-muted)" }}>
          {verdict}
        </span>
      </div>
      <div className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        {body}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- 5. the twenty worst */

function WorstTwenty() {
  return (
    <div className="mt-12">
      <h3 className="text-xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
        The twenty worst
      </h3>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Ranked by confidence multiplied by losing margin, so these are the games where the model was both sure and badly beaten. &ldquo;TO&rdquo; is the turnover margin
        for the team it picked, and it is negative in most of them, which is the
        section above stated one game at a time.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Game</th>
              <th className="py-2 text-left">Picked</th>
              <th className="py-2 text-right">Conf</th>
              <th className="py-2 text-left">Final</th>
              <th className="py-2 text-right">TO</th>
              <th className="py-2 text-left">Leading performer</th>
            </tr>
          </thead>
          <tbody>
            {MISS_WORST.map((m) => (
              <tr key={m.game_id} className="border-b align-top" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2 tnum text-xs" style={{ color: "var(--text-muted)" }}>
                  {m.game_id}
                </td>
                <td className="py-2">
                  <TeamChip abbr={m.picked} />
                </td>
                <td className="py-2 text-right tnum">{pct(m.confidence, 0)}</td>
                <td className="py-2 tnum">{m.final}</td>
                <td className="py-2 text-right tnum">{m.turnover_margin}</td>
                <td className="py-2" style={{ color: "var(--text-secondary)" }}>
                  {m.performer}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- 6. the limit */

function HonestLimit() {
  return (
    <div className="mt-12">
      <h3 className="text-xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
        The honest limit
      </h3>
      <ul className="mt-4 flex max-w-3xl flex-col gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        {[
          `${MISS_SHARED} games the market also lost (${pct(MISS_SHARED_SHARE, 0)}): shared blind spots, not model defects.`,
          `${MISS_MARGINS[0].misses} decided by three points or fewer, outcomes no pre-game information could separate.`,
          `${MISS_TURNOVERS.misses_losing_to} where the picked team lost the turnover battle, the largest single cause and close to irreducible.`,
          `${MISS_HEADLINE.model_specific} genuine model-specific failures, and its confidence in those was modest.`,
        ].map((line) => (
          <li key={line} className="flex gap-3">
            <span aria-hidden="true" style={{ color: "var(--border-strong)" }}>n/a</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Strip out the shared market misses, the one-score games and the turnover
        luck, and what remains is a small residue. That residue, not the{" "} {MISS_HEADLINE.misses} headline number, is the model&rsquo;s real error, and it
        is not large enough to close the gap with a market that prices injury news
        and sharp money within minutes. The productive direction is not more
        features: wider sets scored <em>worse</em>. It is better probabilities on
        the games it already calls.
      </p>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Put plainly: the model is not failing to understand football. It is running
        into the fact that a quarter of NFL games are decided by a field goal, and a
        fifth turn on a bounce nobody can forecast.
      </p>
    </div>
  );
}
