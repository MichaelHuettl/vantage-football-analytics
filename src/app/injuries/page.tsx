import type { Metadata } from "next";
import Link from "next/link";
import { CampStatusPill, Timeline } from "@/components/CampInjury";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DataFreshness } from "@/components/DataFreshness";
import {
  attachHeadlines, getInjuryHeadlines, getInjuryTracker, trackerByTeam,
} from "@/lib/injury-tracker";
import { WireStatusPill } from "@/components/WireStatus";
import { InjuryTimeline, LastUpdateCell, PracticeStrip, StatusPill } from "@/components/Injury";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerLink, PositionBadge } from "@/components/PlayerLink";
import { SectionHero } from "@/components/SectionHero";
import { TeamChip } from "@/components/TeamChip";
import { FilterLink, TeamFilterLink } from "@/components/FilterLink";
import {
  CURRENT_WEEK,
  INJURY_UPDATED,
  WEEKS,
  backlog,
  rowsByTeam,
  teamsWithInjuries,
} from "@/lib/injuries";
import { getPlayer } from "@/lib/content";
import { shortDate } from "@/lib/dates";
import { isNewerThan } from "@/lib/freshness";
import { getTeam, readableOn } from "@/lib/teams";
import type { Player, Position, Team } from "@/lib/types";

export const metadata: Metadata = {
  title: "Injury Database",
  description:
    "Training camp and weekly injury status by team. The trend is the signal.",
};

export default async function InjuriesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; team?: string }>;
}) {
  const params = await searchParams;
  const parsed = Number(params.week);
  const week = WEEKS.includes(parsed) ? parsed : CURRENT_WEEK;

  const groups = rowsByTeam(week);
  const carried = backlog();
  const teams = teamsWithInjuries();

  // Both pulled at request time; AutoRefresh re-runs this render on a timer.
  // One round trip each per window — the TTL caches inside them share an
  // in-flight promise, so a burst of readers does not become a burst of calls.
  const [tracker, headlines] = await Promise.all([
    getInjuryTracker(),
    getInjuryHeadlines(),
  ]);

  // One team filter across the whole page rather than one per section. News
  // keeps its two feeds on separate params because they cover different
  // periods, but camp and the weekly report are the same question asked at two
  // points in a season — a reader filtering to a team wants that team
  // everywhere, not in one table and not the other.
  const filterTeams = [
    // Built from the tracker as well as the schedule, so a club that only
    // appears on the wire this week is still filterable.
    ...new Set([...tracker.rows.map((r) => r.team), ...teams.map((t) => t.abbr)]),
  ].sort();
  const team = filterTeams.includes(params.team?.toUpperCase() ?? "")
    ? params.team!.toUpperCase()
    : undefined;
  const activeTeam = team ? getTeam(team) : undefined;

  /** Links that change one filter keep the other. */
  const q = (over: { week?: number; team?: string }) => {
    const next = { week, team, ...over };
    const p = new URLSearchParams();
    if (next.week !== undefined) p.set("week", String(next.week));
    if (next.team) p.set("team", next.team);
    const s = p.toString();
    return s ? `/injuries?${s}` : "/injuries";
  };

  // Tracker rows grouped by team, each group worst-first, groups ordered by
  // their most serious case so the teams in trouble surface first. The grouping
  // and the ordering both live in the library, so the page only filters (§11).
  // The headline feed is joined on here rather than inside the pull: the two
  // are on separate caches, and a row's headlines should be as fresh as the
  // headline call, not as fresh as the wire call.
  const trackerGroups = trackerByTeam(attachHeadlines(tracker.rows, headlines))
    .map((g) => ({ ...g, team: getTeam(g.abbr) }))
    .filter((g) => !team || g.abbr === team);

  const weekGroups = groups.filter((g) => !team || g.team.abbr === team);
  const carriedRows = carried.filter((c) => !team || c.team.abbr === team);

  return (
    <>
      <SectionHero
        image="/img/bg/injury-database.jpg"
        objectPosition="center 50%"
        eyebrow="Status and trend"
        title="Injury Database"
        lede="Training camp status now, practice participation once the season starts. The Friday designation alone is not the signal. The movement across the week is."
      />

      <Container className="py-10">
        {/* A page-level control, not a section one: it governs camp, the weekly
            report and the backlog together, so it sits above all three rather
            than inside whichever table it appears to belong to. */}
        <nav aria-label="Team" className="pb-8">
          <ul className="flex flex-wrap items-center gap-2">
            <li className="eyebrow mr-1">Team</li>
            <li>
              <FilterLink href={q({ team: undefined })} active={!team}>
                All
              </FilterLink>
            </li>
            {filterTeams.map((abbr) => (
              <li key={abbr}>
                <TeamFilterLink href={q({ team: abbr })} active={abbr === team}>
                  <TeamChip abbr={abbr} />
                </TeamFilterLink>
              </li>
            ))}
          </ul>
          {activeTeam && (
            <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              Showing {activeTeam.city} {activeTeam.nickname} only.{" "}
              <Link href={q({ team: undefined })} className="font-semibold underline">
                Show every team
              </Link>
            </p>
          )}
        </nav>

        {/* ================= Training camp and preseason ================= */}
        {/* ===================== Season tracker ===================== */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                className="text-3xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Season tracker
              </h2>
              <span
                className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-condensed)",
                  background: tracker.live ? "var(--text-primary)" : "var(--surface-sunken)",
                  color: tracker.live ? "var(--surface-page)" : "var(--text-muted)",
                  boxShadow: tracker.live ? undefined : "inset 0 0 0 1px var(--border-strong)",
                }}
              >
                {tracker.live ? "Live" : "Archive"}
              </span>
              <AutoRefresh />
            </div>
            <DataFreshness
              updated={tracker.updated}
              label={tracker.live ? "Wire pulled" : "Last written record"}
              staleAfterDays={tracker.live ? 1 : 4}
            />
          </div>

          <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            Every fantasy-relevant player carrying a designation, pulled when the
            page is requested and re-rendered on a timer. The written records
            below merge <em>under</em> the wire and are never overwritten by it:
            a feed status is a coarse claim, a record is reporting with a
            diagnosis behind it, and where the two cannot both be true the row
            says so rather than picking one.
          </p>

          <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            <strong>Updated</strong> is the later of two dates: the last time the
            wire moved on that player, or the day the written record was
            reported. Whichever it is, the cell names it. Sleeper stamps the
            last update to any news about a player rather than to the injury
            alone, so read it as when something was last said about him, never
            as when anyone expects him back (§5.3). Anything older than a
            fortnight is marked, because a designation the wire has stopped
            touching is the one most likely to have moved on without it.
            Headlines carry their own dates, so a row can show reporting newer
            than the designation beside it.
          </p>

          <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            <strong>Latest</strong> is the written record wherever one exists.
            Where none does, it carries other people&rsquo;s reporting instead:
            every headline naming that player, from the live sitemap and the
            committed news file, published as its publisher wrote it and
            credited to them. That is where the detail lives that a wire field
            cannot hold. Sleeper can say <em>Knee</em>; only a headline can say
            he hyperextended it and expects to be fine. Nothing here composes a
            diagnosis out of a feed, because a record is written by hand or not
            at all (§11), and a headline only ever matches a player when his
            full name appears in it.
          </p>

          {tracker.live ? (
            <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
              {tracker.pulled} players carried a designation on this pull;{" "}
              {tracker.rows.length} are shown: everyone the site ranks, plus anyone already written up however deep on a roster.{" "}
              {tracker.counts.both} of them have a written record as well,{" "}
              {tracker.counts.recordOnly} are records the wire is currently
              silent on, and{" "}
              {tracker.counts.conflicts === 0
                ? "none contradict what is written here."
                : `${tracker.counts.conflicts} contradict what is written here.`}
            </p>
          ) : (
            <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
              The wire did not answer on this render, so this is the written record alone, stale rather than empty (§8).{" "}
              {tracker.failures.map((f) => `${f.name}: ${f.reason}`).join("; ")}
            </p>
          )}

          {trackerGroups.length === 0 && (
            <div className="mt-6">
              <EmptyState
                title={`Nothing on the wire for ${activeTeam ? `the ${activeTeam.nickname}` : "any team"}.`}
                direction="Pick another team, or choose All to see the whole league."
              />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4">
            {trackerGroups.map(({ team, abbr, rows }) => (
              <TeamBlock key={abbr} team={team} abbr={abbr} history>
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[190px]" />
                    <col className="w-[240px]" />
                    <col className="w-[110px]" />
                    <col className="w-[170px]" />
                    <col className="w-[120px]" />
                    <col />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "var(--surface-sunken)" }}>
                      <Th>Player</Th>
                      <Th>Injury</Th>
                      <Th>Wire</Th>
                      <Th>Written record</Th>
                      <Th>Updated</Th>
                      <Th>Latest</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const player = r.record?.player_id
                        ? getPlayer(r.record.player_id)
                        : undefined;
                      // Was `latestNewsFor(record.player_id)`, which could
                      // only ever fire for a player who both had a written
                      // record and an id on it. Name matching covers every row,
                      // and merges the live pull with the committed feed.
                      const fresh = r.headlines[0];
                      return (
                        <tr
                          key={`${r.name}-${r.position}`}
                          className="border-t align-top"
                          style={{ borderColor: "var(--border-subtle)" }}
                        >
                          <td className="px-4 py-3">
                            <PlayerCell
                              player={player}
                              name={r.name}
                              position={r.position}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {/* With a record, its diagnosis leads. Without
                                one, the wire's own description leads rather
                                than "No diagnosis reported": Sleeper publishes
                                real detail here, "Knee - ACL + MCL" and
                                "Surgery", and burying it under a sentence
                                saying nothing was reported was throwing away
                                the one thing the row did know. */}
                            {r.record ? (
                              <>
                                <span className="block font-semibold">
                                  {r.record.diagnosis}
                                </span>
                                {r.body_part && (
                                  <span
                                    className="mt-0.5 block text-xs uppercase tracking-wider"
                                    style={{
                                      fontFamily: "var(--font-condensed)",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {r.body_part}
                                    {r.notes ? ` · ${r.notes}` : ""}
                                  </span>
                                )}
                              </>
                            ) : r.body_part || r.notes ? (
                              <>
                                <span className="block font-semibold">
                                  {[r.body_part, r.notes].filter(Boolean).join(", ")}
                                </span>
                                <span
                                  className="mt-0.5 block text-xs uppercase tracking-wider"
                                  style={{
                                    fontFamily: "var(--font-condensed)",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  As the wire lists it
                                </span>
                              </>
                            ) : (
                              <span
                                className="block"
                                style={{ color: "var(--text-muted)" }}
                              >
                                No diagnosis reported
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {r.wire ? (
                              <WireStatusPill status={r.wire} />
                            ) : (
                              <span
                                className="text-xs uppercase tracking-wider"
                                style={{
                                  fontFamily: "var(--font-condensed)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                Not listed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {r.record ? (
                              <>
                                <CampStatusPill status={r.record.status} />
                                <span className="mt-1.5 block">
                                  <Timeline injury={r.record} />
                                </span>
                              </>
                            ) : (
                              /* Nothing is written here automatically. A record
                                 carries a diagnosis and, only ever with an
                                 attribution, a timeline (§5.3); composing one
                                 from a feed would be auto-generated analysis
                                 published under the operator's name, which §11
                                 forbids. The reporting that does exist is
                                 beside it, in someone else's words. */
                              <span
                                className="text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {r.headlines.length > 0
                                  ? "Not written up. Reporting is at right."
                                  : "Not written up."}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <LastUpdateCell update={r.lastUpdate} />
                          </td>
                          <td
                            className="px-4 py-3"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {r.conflict && (
                              <span
                                className="mb-1.5 flex items-start gap-1.5 rounded px-2 py-1.5 text-xs"
                                style={{
                                  background:
                                    "color-mix(in oklab, var(--color-status-out) 16%, transparent)",
                                  color: "var(--text-primary)",
                                }}
                              >
                                <span
                                  className="shrink-0 font-bold uppercase tracking-wider"
                                  style={{ fontFamily: "var(--font-condensed)" }}
                                >
                                  Disagrees
                                </span>
                                <span>
                                  the record says {r.record?.status}, the wire has
                                  him {r.wire}
                                </span>
                              </span>
                            )}
                            {r.record?.latest}
                            {/* No record means nobody here has written this
                                player up. What exists is other people's
                                reporting, published as they wrote it and
                                credited to them (§2: headline, source and link,
                                never body text). */}
                            {!r.record &&
                              (r.headlines.length > 0 ? (
                                <ul className="flex flex-col gap-2">
                                  {r.headlines.map((h) => (
                                    <li key={h.id}>
                                      <a
                                        href={h.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline-offset-2 hover:underline"
                                      >
                                        {h.headline}
                                      </a>
                                      <span
                                        className="ml-1.5 whitespace-nowrap text-xs"
                                        style={{ color: "var(--text-muted)" }}
                                      >
                                        {h.source}, {shortDate(h.timestamp)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span
                                  className="text-xs"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  Nothing published under this name yet. The
                                  wire designation is the whole of it.
                                </span>
                              ))}
                            {r.record?.history && (
                              <span
                                className="mt-1.5 block text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                History: {r.record.history}
                              </span>
                            )}
                            {/* The feed cannot write a diagnosis, but it can say
                                something has been reported since this row was
                                written — which is what a static page gets wrong. */}
                            {r.record && isNewerThan(fresh, r.record.reported) && (
                              <span
                                className="mt-2 flex items-start gap-1.5 rounded px-2 py-1.5 text-xs"
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
                              </span>
                            )}
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

        {/* ===================== Live wire ===================== */}
        <section className="mt-20">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2
              className="text-3xl uppercase tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Injury headlines
            </h2>
            <AutoRefresh />
          </div>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
            Pulled while you are reading it. Headline, source and link only, never the article (§2), and no status here is this site&rsquo;s
            prognosis (§5.3). The reconciliation that used to sit in this section
            now happens in the tracker itself, on every row.
          </p>
          {headlines.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              Draft Sharks&rsquo; sitemap did not answer on this render. The
              tracker above is unaffected.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {headlines.map((h) => (
                <li key={h.id} className="text-sm">
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {h.headline}
                  </a>
                  <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    {h.source}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
                    href={q({ week: w })}
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

          {weekGroups.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={
                  activeTeam
                    ? `No week ${week} designations for the ${activeTeam.nickname}.`
                    : `No designations filed for week ${week}.`
                }
                direction={
                  activeTeam
                    ? "Choose another team, or All to see the full report."
                    : "Add rows to src/data/injuries.json."
                }
              />
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {weekGroups.map(({ team, rows }) => (
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
                            <PlayerCell
                              player={player}
                              name={player.name}
                              position={player.position}
                            />
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

          {carriedRows.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={
                  activeTeam
                    ? `Nothing carried over for the ${activeTeam.nickname}.`
                    : "Nothing carried over."
                }
                direction={
                  activeTeam
                    ? "Choose another team, or All to see every carried designation."
                    : "Players appearing in more than one week will collect here."
                }
              />
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {carriedRows.map((item) => (
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
          {teams.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No team reports yet."
                direction="A team appears here once it has filed a weekly injury report."
              />
            </div>
          ) : (
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
          )}
        </section>

        <p className="mt-16 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
          Every expected absence on this page is quoted from the team, a coach
          or a published report, and is attributed to whoever said it. This site
          does not estimate return dates or assign a probability of playing. That is a medical claim, and not one it is qualified to make. An
          absence shown as &ldquo;not stated&rdquo; means nobody has stated one,
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

/**
 * One player cell for both report tables.
 *
 * Previously a rostered player rendered a 36px avatar tile while anyone
 * without a player page rendered a small position pill, so the first column
 * had two different shapes down the same list. Both now use the pill: with
 * headshots off it carried no information the pill does not, and it was three
 * times the height.
 */
function PlayerCell({
  player,
  name,
  position,
}: {
  player: Player | undefined;
  name: string;
  position: Position;
}) {
  return (
    <span className="flex items-center gap-2">
      <PositionBadge position={position} />
      {player ? (
        <Link
          href={`/players/${player.id}`}
          className="font-semibold hover:underline"
        >
          {name}
        </Link>
      ) : (
        <span className="font-semibold">{name}</span>
      )}
    </span>
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
