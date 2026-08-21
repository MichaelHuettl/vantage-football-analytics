import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState } from "@/components/PageHeader";
import { FilterLink } from "@/components/FilterLink";
import { SectionHero } from "@/components/SectionHero";
import { TeamChip } from "@/components/TeamChip";
import { ConfidenceTiers } from "@/components/prediction/ConfidenceTiers";
import { Methodology } from "@/components/prediction/Methodology";
import { ModelHonesty } from "@/components/prediction/ModelHonesty";
import { PredictionOverview } from "@/components/prediction/PredictionOverview";
import { PRED_META, PRED_WEEKS, TIER_LABEL, gamesForWeek, kickoffLabel } from "@/lib/predictions";

export const metadata: Metadata = {
  title: "Game prediction",
  description:
    "How the prediction model works, what its record is, and a win probability for every game on the slate.",
};

/**
 * The prediction section.
 *
 * **Methodology is the tab that opens**, not the picks. The model loses to the
 * market, so a reader who lands on a grid of confident-looking percentages and
 * leaves has been misled by the layout rather than by anything the page says.
 * Making them pass the working on the way to the forecasts is the honest
 * ordering, and it costs one click for anyone who only wants the numbers.
 *
 * Tabs are URL state rather than component state — the same device the news and
 * injury filters use. A week is then a link someone can send.
 */
export default async function GamePredictionIndex({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const raw = (await searchParams).tab;
  const weekTab = (w: number) => `week-${w}`;
  const known = ["methodology", "confidence", ...PRED_WEEKS.map(weekTab)];
  const active = raw && known.includes(raw) ? raw : "methodology";
  const activeWeek = PRED_WEEKS.find((w) => weekTab(w) === active) ?? null;

  return (
    <>
      <SectionHero
        image="/img/bg/whiteboard.jpg"
        eyebrow="Model output"
        title="Game prediction"
        lede="How the model works, how well it has done, and what it expects this week."
      />

      <Container className="py-10">
        <PredictionOverview />

        <div className="mt-10">
          <ModelHonesty />
        </div>

        {/* ---- tabs ---- */}
        <nav aria-label="Prediction sections" className="mt-12">
          <ul className="flex flex-wrap items-center gap-2 border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
            <li>
              <FilterLink href="/game-prediction" active={active === "methodology"}>
                Methodology
              </FilterLink>
            </li>
            <li>
              <FilterLink
                href="/game-prediction?tab=confidence"
                active={active === "confidence"}
              >
                Confidence
              </FilterLink>
            </li>
            {PRED_WEEKS.map((w) => (
              <li key={w}>
                <FilterLink
                  href={`/game-prediction?tab=${weekTab(w)}`}
                  active={active === weekTab(w)}
                >
                  Week {w}
                </FilterLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          {active === "confidence" ? (
            <ConfidenceTiers />
          ) : activeWeek === null ? (
            <Methodology />
          ) : (
            <WeekSlate week={activeWeek} />
          )}
        </div>

        <p className="mt-12 text-xs" style={{ color: "var(--text-muted)" }}>
          {PRED_META.model_name} · {PRED_META.validation}
        </p>
      </Container>
    </>
  );
}

function WeekSlate({ week }: { week: number }) {
  const games = gamesForWeek(week);
  const coinFlips = games.filter((g) => g.confidence === "coin_flip").length;
  if (games.length === 0) {
    return (
      <EmptyState
        title={`No games modelled for week ${week} yet.`}
        direction="Pick another week, or read the methodology while the slate fills in."
      />
    );
  }
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          Week {week}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {games.length} games · {coinFlips} of them land in the coin-flip band,
          where the model has no usable call
        </p>
      </div>

      <ul className="mt-6 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        {games.map((g) => {
          const homeFav = g.predicted_winner === g.home.team;
          const pct = Math.round(
            (homeFav ? g.home.win_probability : g.away.win_probability) * 100,
          );
          return (
            <li key={g.game_id} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <Link
                href={`/game-prediction/${g.game_id}`}
                className="group flex flex-wrap items-center gap-x-6 gap-y-2 py-4"
              >
                <span className="flex w-40 shrink-0 items-center gap-2">
                  <TeamChip abbr={g.away.team} size="sm" />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>at</span>
                  <TeamChip abbr={g.home.team} size="sm" />
                </span>
                <span className="w-44 shrink-0 text-sm" style={{ color: "var(--text-muted)" }}>
                  {kickoffLabel(g.kickoff)}
                </span>
                <span className="flex-1 text-sm">
                  <span
                    className="font-semibold group-hover:underline"
                    style={
                      g.confidence === "coin_flip"
                        ? { color: "var(--text-muted)" }
                        : undefined
                    }
                  >
                    {g.predicted_winner} {pct}%
                  </span>
                  <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                    {g.predicted_spread_display}
                  </span>
                </span>
                <span
                  className="eyebrow w-40 shrink-0 text-right"
                  style={{ color: "var(--text-muted)" }}
                  title={`this band has been right ${(g.confidence_historical_accuracy * 100).toFixed(1)}% of the time`}
                >
                  {TIER_LABEL[g.confidence]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
