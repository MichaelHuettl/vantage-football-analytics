import type { Metadata } from "next";
import Link from "next/link";
import {
  CAMP_INJURIES,
  CAMP_SEVERITY,
  CAMP_UPDATED,
  CampStatusPill,
  Timeline,
} from "@/components/CampInjury";
import type { CampInjury } from "@/components/CampInjury";
import { DataFreshness } from "@/components/DataFreshness";
import { InjuryTimeline, PracticeStrip, StatusPill } from "@/components/Injury";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { PositionBadge } from "@/components/PlayerLink";
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
import { getPlayer } from "@/lib/content";
import { isNewerThan, latestNewsFor } from "@/lib/freshness";
import { getTeam, readableOn } from "@/lib/teams";
import type { Team } from "@/lib/types";

export const metadata: Metadata = {
  title: "Injury report",
  description:
    "Training camp and weekly injury status by team. The trend is the signal.",
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

  // Camp entries grouped by team, each group worst-first, groups ordered by
  // their most serious case so the teams in trouble surface first.
  const campByTeam = new Map<string, CampInjury[]>();
  for (const c of CAMP_INJURIES) {
    campByTeam.set(c.team, [...(campByTeam.get(c.team) ?? []), c]);
  }
  const campGroups = [...campByTeam.entries()]
    .map(([abbr, list]) => ({
      team: getTeam(abbr),
      abbr,
      list: list.sort(
        (a, b) => CAMP_SEVERITY[b.status] - CAMP_SEVERITY[a.status],
      ),
    }))
    .sort(
      (a, b) =>
        CAMP_SEVERITY[b.list[0].status] - CAMP_SEVERITY[a.list[0].status] ||
        a.abbr.localeCompare(b.abbr),
    );

  return (
    <>
      <SectionHero
        image="/img/bg/recovery.jpg"
        objectPosition="center 38%"
        eyebrow="Status and trend"
        title="Injury report"
        lede="Training camp status now, practice participation once the season starts. The Friday designation alone is not the signal — the movement across the week is."
      />

      <Container className="py-10">
        {/* ================= Training camp and preseason ================= */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                className="text-3xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Training camp
              </h2>
              <span
                className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-condensed)",
                  background: "var(--text-primary)",
                  color: "var(--surface-page)",
                }}
              >
                Preseason
              </span>
            </div>
            <DataFreshness updated={CAMP_UPDATED} label="Camp report" staleAfterDays={4} />
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {campGroups.map(({ team, abbr, list }) => (
              <TeamBlock key={abbr} team={team} abbr={abbr}>
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[190px]" />
                    <col className="w-[260px]" />
                    <col className="w-[125px]" />
                    <col className="w-[175px]" />
                    <col />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "var(--surface-sunken)" }}>
                      <Th>Player</Th>
                      <Th>Diagnosis</Th>
                      <Th>Status</Th>
                      <Th>Expected absence</Th>
                      <Th>Latest</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((c) => {
                      const player = c.player_id ? getPlayer(c.player_id) : undefined;
                      return (
                        <tr
                          key={c.name}
                          className="border-t align-top"
                          style={{ borderColor: "var(--border-subtle)" }}
                        >
                          <td className="px-4 py-3">
                            {player ? (
                              <PlayerLink player={player} showTeam={false} showPhoto={false} />
                            ) : (
                              <span className="flex items-center gap-2">
                                <PositionBadge position={c.position} />
                                <span className="font-semibold">{c.name}</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="block font-semibold">{c.diagnosis}</span>
                            <span
                              className="mt-0.5 block text-xs uppercase tracking-wider"
                              style={{
                                fontFamily: "var(--font-condensed)",
                                color: "var(--text-muted)",
                              }}
                            >
                              {c.body_part}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <CampStatusPill status={c.status} />
                          </td>
                          <td className="px-4 py-3">
                            <Timeline injury={c} />
                          </td>
                          <td
                            className="px-4 py-3"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {c.latest}
                            {c.history && (
                              <span
                                className="mt-1.5 block text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                History: {c.history}
                              </span>
                            )}
                            <span className="mt-2 flex flex-wrap items-center gap-x-2 text-xs">
                              <span style={{ color: "var(--text-muted)" }}>
                                Reported {c.reported}
                              </span>
                              {c.source_url && (
                                <a
                                  href={c.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold hover:underline"
                                >
                                  {c.source_name ?? "Source"} ↗
                                </a>
                              )}
                            </span>
                            {(() => {
                              // The feed cannot write a diagnosis, but it can
                              // say that something has been reported since this
                              // row was written — which is what a static page
                              // otherwise gets wrong.
                              const fresh = latestNewsFor(c.player_id);
                              if (!isNewerThan(fresh, c.reported)) return null;
                              return (
                                <a
                                  href={fresh!.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 flex items-start gap-1.5 rounded px-2 py-1.5 text-xs hover:underline"
                                  style={{
                                    background:
                                      "color-mix(in oklab, var(--color-vantage-amber) 16%, transparent)",
                                    color: "var(--text-primary)",
                                  }}
                                >
                                  <span
                                    className="shrink-0 font-bold uppercase tracking-wider"
                                    style={{ fontFamily: "var(--font-condensed)" }}
                                  >
                                    Newer
                                  </span>
                                  <span>{fresh!.headline}</span>
                                </a>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TeamBlock>
            ))}
          </div>
        </section>

        {/* ===================== Week-by-week report ===================== */}
        <section className="mt-20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2
              className="text-3xl uppercase tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Week {week} report
            </h2>
            <DataFreshness updated={INJURY_UPDATED} label="Report pulled" />
          </div>

          <nav aria-label="Week" className="mt-4">
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
                      background: w === week ? "var(--text-primary)" : "transparent",
                      color:
                        w === week ? "var(--surface-page)" : "var(--text-secondary)",
                      boxShadow:
                        w === week ? undefined : "inset 0 0 0 1px var(--border-strong)",
                    }}
                  >
                    {w}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

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
                <TeamBlock key={team.abbr} team={team} abbr={team.abbr} history>
                  {/* table-fixed with a shared colgroup: every team block uses
                      identical column widths, so Injury, W/T/F, Status and
                      Note line up down the whole page instead of each table
                      sizing itself to its own content. */}
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[210px]" />
                      <col className="w-[170px]" />
                      <col className="w-[130px]" />
                      <col className="w-[130px]" />
                      <col />
                    </colgroup>
                    <thead>
                      <tr style={{ background: "var(--surface-sunken)" }}>
                        <Th>Player</Th>
                        <Th>Injury</Th>
                        <Th>W / T / F</Th>
                        <Th>Status</Th>
                        <Th>Note</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ entry, player }) => (
                        <tr
                          key={entry.player_id}
                          className="border-t align-top"
                          style={{ borderColor: "var(--border-subtle)" }}
                        >
                          <td className="px-4 py-3">
                            <PlayerLink player={player} showTeam={false} showPhoto={false} />
                          </td>
                          <td className="px-4 py-3">{entry.injury}</td>
                          <td className="px-4 py-3">
                            <PracticeStrip practice={entry.practice} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={entry.status} />
                          </td>
                          <td
                            className="px-4 py-3"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {entry.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TeamBlock>
              ))}
            </div>
          )}
        </section>

        {/* =========================== Backlog =========================== */}
        <section className="mt-20">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Backlog
          </h2>
          <p className="mt-2 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
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

        {/* ========================== Team index ========================== */}
        <section className="mt-20">
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
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold"
                  style={{ boxShadow: "inset 0 0 0 1px var(--border-strong)" }}
                >
                  <TeamChip abbr={team.abbr} size="sm" />
                  {team.nickname}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-16 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
          Every expected absence on this page is quoted from the team, a coach
          or a published report, and is attributed to whoever said it. This site
          does not estimate return dates or assign a probability of playing —
          that is a medical claim, and not one it is qualified to make. An
          absence shown as &ldquo;none given&rdquo; means nobody has stated one,
          not that the injury is minor.
        </p>
      </Container>
    </>
  );
}

/** A team's rows under its own colour bar. Shared by both report sections so
 *  the two read as the same object at different points in the season. */
function TeamBlock({
  team,
  abbr,
  history = false,
  children,
}: {
  team: Team | undefined;
  abbr: string;
  history?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <header
        className="flex items-center gap-3 px-4 py-2.5"
        style={{
          background: team?.primary ?? "var(--surface-inverse)",
          color: team ? readableOn(team.primary) : "var(--text-on-inverse)",
          boxShadow: team ? `inset 0 -3px 0 0 ${team.secondary}` : undefined,
        }}
      >
        <span
          className="text-lg uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {team ? `${team.city} ${team.nickname}` : abbr}
        </span>
        {history && (
          <Link
            href={`/injuries/${abbr.toLowerCase()}`}
            className="ml-auto text-xs font-bold uppercase tracking-wider hover:underline"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Team history →
          </Link>
        )}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider"
      style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
