import { Disclosure } from "@/components/prediction/Disclosure";
import { Term } from "@/components/prediction/Term";
import { TeamChip } from "@/components/TeamChip";
import {
  GAME_MARGINS, MARKET, MODEL_FEATURES, PRED_FEATURES, PRED_META, PRED_METHOD,
  PRED_PERF, PRED_REFERENCE,
} from "@/lib/predictions";

/**
 * How the number was reached, and how well it has done.
 *
 * The caveat is not in here. A disclosure a reader can leave closed is the
 * wrong home for "this does not beat the market" — that belongs above the fold,
 * beside the prediction it qualifies.
 *
 * What sits here is the working: the six pipeline steps, the glossary the model
 * itself defines, the measured scoreboard against two baselines, and which
 * features carry weight.
 */
export function Methodology() {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <section>
      <h2
        className="text-2xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)" }}
      >
        How this is worked out
      </h2>

      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        {PRED_META.model_name}, trained on {PRED_META.training_games.toLocaleString()} games
        from {PRED_META.training_seasons[0]}–{PRED_META.training_seasons[1]} and tested on{" "}
        {PRED_PERF.out_of_sample_games.toLocaleString()} it never saw. Form is a{" "}
        {PRED_META.rolling_window}, so a team is described by how it has been playing
        rather than by the season average.
      </p>

      <div className="mt-6">
        <Disclosure summary="The scoreboard — how well it actually does" defaultOpen>
          <table className="w-full max-w-2xl text-sm">
            <thead>
              <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <th className="py-2 text-left">Forecaster</th>
                <th className="py-2 text-right">Accuracy</th>
                <th className="py-2 text-right">Log loss</th>
                <th className="py-2 text-right">Calibration</th>
              </tr>
            </thead>
            <tbody>
              <Row name="The betting market" acc={MARKET.vegas.accuracy} ll={MARKET.vegas.log_loss} best />
              <Row
                name="This model"
                acc={MARKET.model.accuracy}
                ll={MARKET.model.log_loss}
                ece={PRED_PERF.calibration_error}
              />
              <Row name="Always pick the home team" acc={MARKET.home.accuracy} ll={MARKET.home.log_loss} />
            </tbody>
          </table>
          <p className="mt-3 max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
            Lower log loss is better — it rewards being confident and right, and punishes
            being confident and wrong. The market wins on both measures, and the page does
            not pretend otherwise. What the model does have is calibration: its stated
            probabilities land within about{" "}
            {(PRED_PERF.calibration_error * 100).toFixed(1)} points of what actually
            happens, so a 70% here means close to 70%. That is the property worth using,
            and it improved sharply when the training window widened to{" "}
            {PRED_META.training_seasons[0]}.
          </p>
        </Disclosure>

        <Disclosure summary={`The pipeline, in ${PRED_METHOD.steps.length} steps`}>
          <ol className="flex max-w-3xl flex-col gap-4">
            {PRED_METHOD.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span
                  className="shrink-0 text-lg tnum leading-none"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-muted)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="mt-1 block text-sm" style={{ color: "var(--text-secondary)" }}>
                    {s.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Disclosure>

        <Disclosure summary="What the words mean">
          <dl className="grid max-w-3xl gap-4 sm:grid-cols-2">
            {Object.entries(PRED_METHOD.glossary).map(([k, g]) => (
              <div key={k}>
                <dt className="eyebrow">
                  <Term label={g.label} definition={g.definition} />
                </dt>
                <dd className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {g.short}
                </dd>
              </div>
            ))}
          </dl>
        </Disclosure>

        <Disclosure summary="What an injury gap has actually looked like">
          <p className="max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
            The injury score has no values for an upcoming slate — reports are not
            published this far out, which is why that metric shows an empty state on
            each game. These are completed games, kept so the measure means something
            concrete. They are <strong>history, not predictions</strong>, and are not
            part of any forecast on this site.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <th className="py-2 text-left">Game</th>
                  <th className="py-2 text-right">Injury score</th>
                  <th className="py-2 text-right">Gap</th>
                  <th className="py-2 text-right">Final margin</th>
                </tr>
              </thead>
              <tbody>
                {PRED_REFERENCE.map((r) => {
                  const gap = r.away_inj_impact - r.home_inj_impact;
                  const hurtSide = gap > 0 ? r.away_team : r.home_team;
                  return (
                    <tr key={r.game_id} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <TeamChip abbr={r.away_team} size="sm" />
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>at</span>
                          <TeamChip abbr={r.home_team} size="sm" />
                          <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>
                            {r.season} wk {r.week}
                          </span>
                        </span>
                      </td>
                      <td className="py-2 text-right tnum">
                        {r.away_inj_impact.toFixed(1)} / {r.home_inj_impact.toFixed(1)}
                      </td>
                      <td className="py-2 text-right text-xs" style={{ color: "var(--text-muted)" }}>
                        {hurtSide} worse off
                        {(r.home_inj_qb_out || r.away_inj_qb_out) && " · QB out"}
                      </td>
                      <td className="py-2 text-right tnum">
                        {r.actual_home_win ? r.home_team : r.away_team} by{" "}
                        {Math.abs(r.actual_margin).toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
            Three games is an illustration, not evidence. The weights behind the score
            are fitted across thousands: a quarterback absence costs roughly 2.6 points
            of margin and a skill-position absence 0.7, while line, linebacker and
            secondary absences came back indistinguishable from zero.
          </p>
        </Disclosure>

        <Disclosure summary="Why this is hard — football margins are lumpy">
          <p className="max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
            Margins are not a smooth curve. A field goal and a touchdown are the
            units the game is scored in, so games pile up on those numbers and
            thin out between them. Three points alone accounts for{" "}
            <strong className="tnum">
              {(GAME_MARGINS.margin_frequency["3"] * 100).toFixed(1)}%
            </strong>{" "}
            of all games — more than three times either neighbour — while nine
            points, a margin no combination of scores lands on naturally, happens
            in {(GAME_MARGINS.margin_frequency["9"] * 100).toFixed(1)}%.
          </p>
          <ul className="mt-4 flex max-w-md flex-col gap-1.5">
            {Object.entries(GAME_MARGINS.margin_frequency).map(([pts, share]) => (
              <li key={pts} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs tnum" style={{ color: "var(--text-muted)" }}>
                  {pts} pts
                </span>
                <span
                  className="relative h-3 flex-1 overflow-hidden rounded-sm"
                  style={{ background: "var(--border-subtle)" }}
                >
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${(share / 0.15) * 100}%`,
                      background:
                        pts === "3" || pts === "7"
                          ? "var(--color-vantage-amber)"
                          : "var(--border-strong)",
                    }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right text-xs tnum">
                  {(share * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
            This explains why so many games finish close. It does not, on its own,
            help predict who wins them.
          </p>
        </Disclosure>

        <Disclosure summary={`What the model actually uses — all ${MODEL_FEATURES.total} inputs`}>
          <p className="max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
            The head-to-head chart on a game page shows nine metrics, which can read as
            though nine numbers decide the forecast. They do not. Here is the whole
            input list, grouped.
          </p>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
            {MODEL_FEATURES.note}
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MODEL_FEATURES.groups.map((g) => (
              <div key={g.name}>
                <p className="eyebrow">
                  {g.name}
                  <span className="ml-2 tnum" style={{ color: "var(--text-muted)" }}>
                    {g.features.length}
                  </span>
                </p>
                <ul
                  className="mt-2 flex flex-col gap-1 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {g.features.map((f) => (
                    <li key={f.feature}>{f.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Disclosure>

        <Disclosure summary="Which inputs carry the weight">
          <ul className="flex max-w-2xl flex-col gap-2">
            {PRED_FEATURES.map((f) => (
              <li key={f.feature} className="flex items-center gap-3">
                <span className="w-56 shrink-0 text-sm">{f.label}</span>
                <span
                  className="relative h-2.5 flex-1 overflow-hidden rounded-sm"
                  style={{ background: "var(--border-subtle)" }}
                >
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${f.share * 100}%`, background: "var(--border-strong)" }}
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
            Point differential and win rate dominate, which is worth knowing: most of what
            the model does is notice which team has been better lately. The efficiency
            terms refine that rather than replace it. Only the twelve heaviest are
            published, so a metric missing from this list is unranked rather than
            proven unimportant.
          </p>
        </Disclosure>
      </div>
      <p className="mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
        Validation: {PRED_META.validation}. Source: {PRED_META.data_source}.
      </p>
    </section>
  );

  function Row({
    name, acc, ll, ece, best,
  }: { name: string; acc: number; ll: number; ece?: number; best?: boolean }) {
    return (
      <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <td className="py-2">
          {name}
          {best && (
            <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
              best
            </span>
          )}
        </td>
        <td className="py-2 text-right tnum">{pct(acc)}</td>
        <td className="py-2 text-right tnum">{ll.toFixed(4)}</td>
        <td className="py-2 text-right tnum">
          {ece === undefined ? (
            <span style={{ color: "var(--text-muted)" }}>—</span>
          ) : (
            `±${(ece * 100).toFixed(1)} pts`
          )}
        </td>
      </tr>
    );
  }
}
