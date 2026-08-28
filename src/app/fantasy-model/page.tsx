import type { Metadata } from "next";
import { Container } from "@/components/PageHeader";
import { FilterLink } from "@/components/FilterLink";
import { SectionHero } from "@/components/SectionHero";
import { FantasyAccuracy } from "@/components/fantasy/FantasyAccuracy";
import { FantasyBoard } from "@/components/fantasy/FantasyBoard";
import { FantasyMethod } from "@/components/fantasy/FantasyMethod";
import {
  FM_CONFIG, FM_METRICS, FM_POSITIONS, FM_SPAN,
} from "@/lib/fantasy";
import type { FantasyPosition } from "@/lib/fantasy";

export const metadata: Metadata = {
  title: "Fantasy Football Model",
  description:
    "A 1-point-PPR projection model over 27 seasons: how it works, what it is worth measured against a real baseline, and projected boards by position.",
};

const TABS = [
  { id: "method", label: "How it works" },
  { id: "accuracy", label: "Accuracy" },
  { id: "2025", label: "2025 tested" },
  { id: "2026", label: "2026 projections" },
] as const;

/**
 * The fantasy projection model.
 *
 * **The tabs open on the method, not the board.** The same reasoning as the
 * game prediction section: a reader who lands on a list of projected points and
 * leaves has taken the numbers on trust, and the interesting thing about this
 * model is how much it does *not* beat a three-game average by. Making the
 * working the first thing costs one click.
 *
 * **Every board is scoped to a position.** One descending list of projected
 * points is a ranking of positions rather than players — quarterbacks fill the
 * top because quarterbacks score more — so the position is part of the URL and
 * the boards never mix.
 */
export default async function FantasyModelPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; pos?: string }>;
}) {
  const params = await searchParams;
  const known = TABS.map((t) => t.id) as readonly string[];
  const active = params.tab && known.includes(params.tab) ? params.tab : "method";

  const posParam = params.pos?.toUpperCase();
  const position: FantasyPosition =
    posParam && (FM_POSITIONS as readonly string[]).includes(posParam)
      ? (posParam as FantasyPosition)
      : "RB";

  const href = (tab: string, pos?: FantasyPosition) =>
    `/fantasy-model?tab=${tab}${pos ? `&pos=${pos}` : ""}`;

  const bestLift = Math.max(...Object.values(FM_METRICS).map((m) => m.backtest_lift));
  const worstLift = Math.min(...Object.values(FM_METRICS).map((m) => m.backtest_lift));

  return (
    <>
      <SectionHero
        image="/img/bg/fantasy-model.jpg"
        objectPosition="center 30%"
        eyebrow="Projection model"
        title="Fantasy Football Model"
        lede="A 1-point-PPR projection for every position, trained on 27 seasons and measured against the only benchmark that matters."
      />

      <Container className="py-16 sm:py-24">
        {/* ---- headline numbers ---- */}
        <dl className="grid gap-px sm:grid-cols-2 lg:grid-cols-4"
            style={{ background: "var(--border-subtle)" }}>
          {[
            { k: "Player-weeks trained on", v: FM_SPAN.player_weeks.toLocaleString(),
              s: `${FM_SPAN.from}–${FM_SPAN.to}` },
            { k: "Seasons back-tested", v: "20",
              s: "each fitted only on what came before" },
            { k: "Best gain over recent form", v: `${(bestLift * 100).toFixed(0)}%`,
              s: "defense, where the market carries it" },
            { k: "Worst gain over recent form", v: `${(worstLift * 100).toFixed(0)}%`,
              s: "the honest number for a noisy target" },
          ].map((t) => (
            <div key={t.k} className="p-5" style={{ background: "var(--surface-page)" }}>
              <dt className="eyebrow">{t.k}</dt>
              <dd className="mt-1 text-3xl tnum" style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}>
                {t.v}
              </dd>
              <dd className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{t.s}</dd>
            </div>
          ))}
        </dl>

        {/* ---- tabs ---- */}
        <nav aria-label="Model sections" className="mt-12">
          <ul className="flex flex-wrap items-center gap-2 border-b pb-4"
              style={{ borderColor: "var(--border-subtle)" }}>
            {TABS.map((t) => (
              <li key={t.id}>
                <FilterLink
                  href={href(t.id, t.id === "2025" || t.id === "2026" ? position : undefined)}
                  active={active === t.id}
                >
                  {t.label}
                </FilterLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          {active === "method" && <FantasyMethod />}
          {active === "accuracy" && <FantasyAccuracy />}

          {active === "2025" && (
            <section>
              <h2 className="text-3xl uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}>
                {FM_CONFIG.test_season}, with the answers
              </h2>
              <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
                The held-out season. The model never saw a single{" "}
                {FM_CONFIG.test_season} game while it was being fitted, so this is
                the projection standing next to what actually happened, which is
                the only version of a projection worth showing.
              </p>
              <div className="mt-8">
                <FantasyBoard
                  season="season_2025"
                  position={position}
                  hrefFor={(p) => href("2025", p)}
                />
              </div>
            </section>
          )}

          {active === "2026" && (
            <section>
              <h2 className="text-3xl uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}>
                2026, before it happens
              </h2>
              <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
                Every projection here rests on a record that stops at the end of{" "}
                {FM_CONFIG.test_season}. Two limits are worth knowing before the
                board is used as a draft aid.
              </p>
              <ul className="mt-4 flex max-w-3xl flex-col gap-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}>
                <li>
                  <strong style={{ color: "var(--text-primary)" }}>No rookies.</strong>{" "}
                  A player with no prior NFL game has no history to project from,
                  so he is absent rather than guessed at. This is a board of
                  returning players.
                </li>
                <li>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Most of the schedule is not priced yet.
                  </strong>{" "}
                  The betting market has posted lines for part of the season. Where
                  it has not, the input that carries kickers and defenses is
                  missing, so those two boards are the softest here, and the
                  accuracy tab shows why.
                </li>
              </ul>
              <div className="mt-8">
                <FantasyBoard
                  season="season_2026"
                  position={position}
                  hrefFor={(p) => href("2026", p)}
                />
              </div>
            </section>
          )}
        </div>
      </Container>
    </>
  );
}
