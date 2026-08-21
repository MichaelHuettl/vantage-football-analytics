import type { Metadata } from "next";
import Link from "next/link";
import { DataFreshness } from "@/components/DataFreshness";
import { GameCard } from "@/components/GameCard";
import { Container, EmptyState } from "@/components/PageHeader";
import { SectionHero } from "@/components/SectionHero";
import {
  SCHEDULE_UPDATED,
  SCHEDULE_WEEK,
  SEASON,
  WEEKS,
  gamesBySlot,
} from "@/lib/games";

export const metadata: Metadata = {
  title: "Game Tracker",
  description:
    "Week 1 matchups with kickoff, venue and roof, and the slots for lines, weather, scores and the players who decided each game.",
};

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const parsed = Number(params.week);
  const week = WEEKS.includes(parsed) ? parsed : SCHEDULE_WEEK;
  const slots = gamesBySlot(week);
  const count = slots.reduce((n, s) => n + s.games.length, 0);

  return (
    <>
      <SectionHero
        image="/img/bg/game-tracker.jpg"
        objectPosition="center 35%"
        eyebrow="Week by week"
        title="Game Tracker"
        lede="Every matchup with its kickoff, roof and venue, the market's number, the forecast where there is one, and — once it is played — the four players who decided it."
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

      <Container className="py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-3xl uppercase tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Week {week}
            </h2>
            <span
              className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-condensed)",
                background: "var(--text-primary)",
                color: "var(--surface-page)",
              }}
            >
              {SEASON}
            </span>
          </div>
          <DataFreshness updated={SCHEDULE_UPDATED} label="Schedule" staleAfterDays={30} />
        </div>

        <p className="mt-4 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          {count} games. Matchups, kickoff times, venues and roofs are the
          published schedule. Lines, forecasts, scores and the four named
          players per side are slots waiting on data — they are drawn empty so
          the shape of the page does not change once a game is played.
        </p>

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
                  style={{ fontFamily: "var(--font-display)" }}
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

        <p className="mt-16 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
          Implied team totals are stored with the lines they come from rather
          than worked out on the page, so the same number appears everywhere it
          is quoted. A blank is a number nobody has posted yet, not a zero.
        </p>
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
                  fontFamily: "var(--font-condensed)",
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
