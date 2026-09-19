import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DataFreshness } from "@/components/DataFreshness";
import { GameCard } from "@/components/GameCard";
import { Container, EmptyState } from "@/components/PageHeader";
import { SectionHero } from "@/components/SectionHero";
import { SEASON, WEEKS, currentWeek, gamesBySlot } from "@/lib/games";
import { getLiveWeek } from "@/lib/live-games";

export const metadata: Metadata = {
  title: "Game Tracker",
  description:
    "Every NFL week with live scores, the market's line and implied totals, the forecast for open-air games, and key players.",
};

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const parsed = Number(params.week);
  const week = WEEKS.includes(parsed) ? parsed : currentWeek();

  // Pulled at request time and merged over the committed schedule, like the
  // news and injury wires. It never throws: a source that is down is reported
  // on the page below, and the week falls back to its fixtures.
  const live = await getLiveWeek(week);
  const slots = gamesBySlot(live.games);

  return (
    <>
      <SectionHero
        image="/img/bg/game-tracker.jpg"
        objectPosition="center 8%"
        eyebrow="Week by week"
        title="Game Tracker"
        lede="Every matchup with its kickoff, roof and venue, the market's number, the forecast where there is one, and key positional players for each team."
      />

      {/* The same band the rankings tabs sit in, directly under the hero: the
          week is the one choice this page exists to make, so it comes before
          the slate rather than after a screen of it. */}
      <div
        className="border-b"
        style={{
          background: "var(--surface-sunken)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <Container className="py-6">
          <WeekTabs current={week} />
        </Container>
      </div>

      <Container className="py-16 sm:py-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-3xl uppercase tracking-wide"
              style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
            >
              Week {week}
            </h2>
            <span
              className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                background: "var(--text-primary)",
                color: "var(--surface-page)",
              }}
            >
              {SEASON}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DataFreshness
              updated={live.updated}
              label={live.live ? "Scores updated" : "Schedule"}
              staleAfterDays={live.live ? 2 : 30}
            />
            {live.pulledAt && (
              <span className="text-xs tnum" style={{ color: "var(--text-muted)" }}>
                {live.pulledAt}
              </span>
            )}
            {/* Every minute while a game in this week is on; every five
                otherwise. Either way the sources are polled no faster than the
                cache in live-games.ts allows, so an open tab is not a scraper. */}
            <AutoRefresh seconds={live.inWindow ? 60 : 300} />
          </div>
        </div>

        {/* Each source reported separately, as the news page does: scores and
            weather failing are different problems for a reader (§6). */}
        {(!live.scores.ok || !live.weather.ok) && (
          <ul className="mt-3 flex flex-col gap-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {!live.scores.ok && (
              <li>
                Live scores and lines unavailable ({live.scores.error}). Showing the
                committed schedule.
              </li>
            )}
            {!live.weather.ok && (
              <li>Forecasts unavailable ({live.weather.error}).</li>
            )}
          </ul>
        )}

        {slots.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={`No games scheduled for week ${week}.`}
              direction="Add entries to src/data/schedule.json."
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-10">
            {slots.map((slot) => (
              <section key={slot.label}>
                <h3
                  className="text-xl uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
                >
                  {slot.label}
                </h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {slot.games.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

/** Tabs are links, so the week lives in the URL and a slate is shareable —
 *  the same reason the rankings position tabs are links. */
function WeekTabs({ current }: { current: number }) {
  return (
    <nav aria-label="Week">
      <ul className="flex flex-wrap items-center gap-1.5">
        <li className="eyebrow mr-1">Week</li>
        {WEEKS.map((w) => {
          const active = w === current;
          return (
            <li key={w}>
              <Link
                href={`/games?week=${w}`}
                aria-current={active ? "page" : undefined}
                aria-label={`Week ${w}`}
                className="block min-w-9 rounded px-3 py-2 text-center text-sm font-bold tnum transition-colors"
                style={{
                  fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                  background: active ? "var(--text-primary)" : "transparent",
                  color: active ? "var(--surface-page)" : "var(--text-secondary)",
                  boxShadow: active
                    ? undefined
                    : "inset 0 0 0 1px var(--border-strong)",
                }}
              >
                {w}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
