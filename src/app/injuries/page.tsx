import type { Metadata } from "next";
import Link from "next/link";
import { DataFreshness } from "@/components/DataFreshness";
import { InjuryTimeline, PracticeStrip, StatusPill } from "@/components/Injury";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { SectionHero } from "@/components/SectionHero";
import { TeamChip } from "@/components/TeamChip";
import {
  CURRENT_WEEK,
  INJURY_UPDATED,
  WEEKS,
  backlog,
  rowsByTeam,
  teamsWithInjuries,
} from "@/lib/injuries";
import { readableOn } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Injury report",
  description:
    "Practice participation across the week, by team. The trend is the signal.",
};

export default async function InjuriesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const parsed = Number(params.week);
  const week = WEEKS.includes(parsed) ? parsed : CURRENT_WEEK;

  const groups = rowsByTeam(week);
  const carried = backlog();
  const teams = teamsWithInjuries();

  return (
    <>
      <SectionHero
        image="/img/bg/hex.jpg"
        objectPosition="center"
        eyebrow="Status and trend"
        title="Injury report"
        lede="Practice participation across the whole week. The Friday designation alone is not the signal — the movement from Wednesday to Friday is."
      />

      <Container className="py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Week">
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <li className="eyebrow">Week</li>
              {WEEKS.map((w) => (
                <li key={w}>
                  <Link
                    href={`/injuries?week=${w}`}
                    aria-current={w === week ? "page" : undefined}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm font-bold tnum"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      background:
                        w === week ? "var(--text-primary)" : "transparent",
                      color:
                        w === week
                          ? "var(--surface-page)"
                          : "var(--text-secondary)",
                      boxShadow:
                        w === week
                          ? undefined
                          : "inset 0 0 0 1px var(--border-strong)",
                    }}
                  >
                    {w}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <DataFreshness updated={INJURY_UPDATED} label="Report pulled" />
        </div>

        {/* ---------- Week report, grouped by team ---------- */}
        <section className="mt-10">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Week {week} report
          </h2>

          {groups.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={`No designations filed for week ${week}.`}
                direction="Add rows to src/data/injuries.json."
              />
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {groups.map(({ team, rows }) => (
                <section
                  key={team.abbr}
                  className="overflow-hidden rounded-lg border"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  {/* The team's own colour carries the group header — this is
                      the colour-coordination the brief asks for, and it does
                      the work a logo would have done. */}
                  <header
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      background: team.primary,
                      color: readableOn(team.primary),
                      boxShadow: `inset 0 -3px 0 0 ${team.secondary}`,
                    }}
                  >
                    <span
                      className="text-lg uppercase tracking-wide"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {team.city} {team.nickname}
                    </span>
                    <Link
                      href={`/injuries/${team.abbr.toLowerCase()}`}
                      className="ml-auto text-xs font-bold uppercase tracking-wider hover:underline"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Team history →
                    </Link>
                  </header>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className="text-left"
                          style={{ background: "var(--surface-sunken)" }}
                        >
                          <Th>Player</Th>
                          <Th>Injury</Th>
                          <Th>W / T / F</Th>
                          <Th>Status</Th>
                          <Th className="hidden md:table-cell">Note</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ entry, player }) => (
                          <tr
                            key={entry.player_id}
                            className="border-t"
                            style={{ borderColor: "var(--border-subtle)" }}
                          >
                            <td className="px-4 py-3">
                              <PlayerLink player={player} showTeam={false} />
                            </td>
                            <td className="px-4 py-3">{entry.injury}</td>
                            <td className="px-4 py-3">
                              <PracticeStrip practice={entry.practice} />
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill status={entry.status} />
                            </td>
                            <td
                              className="px-4 py-3 hidden md:table-cell"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {entry.note}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        {/* ---------- Backlog ---------- */}
        <section className="mt-16">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Backlog
          </h2>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Players who have carried a designation for more than one week. A
            one-week knock and a managed condition look identical on a Friday
            report and nothing alike here.
          </p>

          {carried.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Nothing carried over."
                direction="Players appearing in more than one week will collect here."
              />
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {carried.map((item) => (
                <li
                  key={item.player.id}
                  className="rounded-lg border p-5"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <PlayerLink player={item.player} />
                    <TeamChip abbr={item.team.abbr} />
                  </div>
                  <p className="mt-4 text-sm">
                    <span className="eyebrow mr-2">{item.injury}</span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {item.weeks} weeks
                    </span>
                  </p>
                  <div className="mt-3">
                    <InjuryTimeline history={item.history} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------- Team index ---------- */}
        <section className="mt-16">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            By team
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {teams.map((team) => (
              <li key={team.abbr}>
                <Link
                  href={`/injuries/${team.abbr.toLowerCase()}`}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold transition-colors"
                  style={{
                    boxShadow: "inset 0 0 0 1px var(--border-strong)",
                  }}
                >
                  <TeamChip abbr={team.abbr} size="sm" />
                  {team.nickname}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p
          className="mt-16 max-w-2xl text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          This page reports what was filed. It does not predict return dates or
          assign a probability of playing — that is a medical claim, and not one
          this site is qualified to make.
        </p>
      </Container>
    </>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${className}`}
      style={{
        fontFamily: "var(--font-condensed)",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </th>
  );
}
