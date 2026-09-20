import type { Metadata } from "next";
import Link from "next/link";
import { CampStatusPill, Timeline } from "@/components/CampInjury";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DataFreshness } from "@/components/DataFreshness";
import {
  attachHeadlines, getInjuryHeadlines, getInjuryTracker, trackerByTeam,
} from "@/lib/injury-tracker";
import type { TrackerRow } from "@/lib/injury-tracker";
import { WireStatusPill } from "@/components/WireStatus";
import { LastUpdateCell } from "@/components/Injury";
import { Container, EmptyState } from "@/components/PageHeader";
import { PositionBadge } from "@/components/PlayerLink";
import { SectionHero } from "@/components/SectionHero";
import { TeamChip } from "@/components/TeamChip";
import { FilterLink, TeamFilterLink } from "@/components/FilterLink";
import { teamsWithInjuries } from "@/lib/injuries";
import { getPlayer } from "@/lib/content";
import { isNewerThan } from "@/lib/freshness";
import { shortDate } from "@/lib/dates";
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
  searchParams: Promise<{ team?: string }>;
}) {
  const params = await searchParams;
  const teams = teamsWithInjuries();

  // Both pulled at request time; AutoRefresh re-runs this render on a timer.
  // One round trip each per window — the TTL caches inside them share an
  // in-flight promise, so a burst of readers does not become a burst of calls.
  const [tracker, headlines] = await Promise.all([
    getInjuryTracker(),
    getInjuryHeadlines(),
  ]);

  // The page is the season tracker now, so team is the only filter on it.
  // The weekly report, the backlog and the team index were removed on
  // 2026-08-28, and the `week` param went with them.
  const filterTeams = [
    // Built from the tracker as well as the schedule, so a club that only
    // appears on the wire this week is still filterable.
    ...new Set([...tracker.rows.map((r) => r.team), ...teams.map((t) => t.abbr)]),
  ].sort();
  const team = filterTeams.includes(params.team?.toUpperCase() ?? "")
    ? params.team!.toUpperCase()
    : undefined;
  const activeTeam = team ? getTeam(team) : undefined;

  const q = (over: { team?: string }) => {
    const next = over.team ?? team;
    return next ? `/injuries?team=${next}` : "/injuries";
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

  // The written-record column exists only while a record still speaks for the
  // current week. Once every club has filed its report the camp notes are
  // history and stop printing, which left the column empty in all 148 rows —
  // a header over nothing. It returns whole the moment the wire fails, because
  // then no report can date a record as historical (§8).
  const showRecord = trackerGroups.some((g) =>
    g.rows.some((r) => r.record && !r.recordHistorical),
  );


  return (
    <>
      <SectionHero
        image="/img/bg/injury-database.jpg"
        objectPosition="center 50%"
        eyebrow="Status and trend"
        title="Injury Database"
        lede="Training camp, practice, and in-season player injury status"
      />

      <Container className="py-16 sm:py-24">
        {/* The page's only filter. It governed three tables until the weekly
            report, backlog and team index were removed on 2026-08-28; now it
            governs the season tracker alone and still sits above it. */}
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

        {/* ===================== Season tracker ===================== */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                className="text-3xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
              >
                Season tracker
              </h2>
              <span
                className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
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

          {/* The page is the tracker now, with no commentary above it. This
              one line stays: §10 requires a pipeline failure to surface rather
              than the page quietly serving a stale archive as if it were
              live. */}
          {!tracker.live && (
            <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
              The wire did not answer on this render, so this is the written record alone, stale rather than empty (§8).{" "}
              {tracker.failures.map((f) => `${f.name}: ${f.reason}`).join("; ")}
            </p>
          )}

          {tracker.live && tracker.officialError && (
            <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
              The NFL injury report did not load on this render, so practice
              participation and designations are missing ({tracker.officialError}).
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
                    <col className="w-[160px]" />
                    {showRecord && <col className="w-[170px]" />}
                    <col className="w-[120px]" />
                    <col />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "var(--surface-sunken)" }}>
                      <Th>Player</Th>
                      <Th>Injury</Th>
                      <Th>Status</Th>
                      {showRecord && <Th>Written record</Th>}
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
                      // A record the current week's report has moved past is
                      // not printed. The operator's call on 2026-09-19: the
                      // tracker carries where a player stands this week, and a
                      // camp note dated August beside it was the thing making
                      // rows unreadable.
                      //
                      // This page is the only reader of camp-injuries.json, so
                      // a record hidden here is published nowhere — the team
                      // pages read injuries.json and the player pages read
                      // neither. It comes back whole the moment the wire fails,
                      // because then no report can date it as historical (§8),
                      // but that is a fallback, not a home for the writing.
                      const rec = r.recordHistorical ? null : r.record;
                      // The Injury column answers the week directly for a
                      // player carrying nothing, so the Status column must
                      // not answer it a second time in different words.
                      const carrying = !!r.currentInjury || (!!r.wire && r.wire !== "NA");
                      const noInjuryThisWeek = r.recordHistorical && !carrying;
                      // A written diagnosis still names what is wrong with a
                      // player who is still out, so it prints — undated, as
                      // one clause of this week rather than a camp bulletin.
                      // It stops printing only when the week has moved past it.
                      const diagnosis = carrying ? r.record : rec;
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
                            {noInjuryThisWeek ? (
                              /* Nothing on this week's report, and the only
                                 other thing on file is a camp note. The note
                                 does not print: leading with an old diagnosis
                                 made healthy players read as injured, and
                                 McCaffrey's row said "Out" from August 17
                                 while he practised fully in Week 2. */
                              <span className="block" style={{ color: "var(--text-secondary)" }}>
                                No injury on this week&rsquo;s report
                              </span>
                            ) : r.recordSuperseded && r.summary ? (
                              /* The record is about an earlier injury: a
                                 different body region from the one on this
                                 week's report. Only the current one prints —
                                 Jerry Jeudy's row read "Hamstring injury" from
                                 August 3 while the report listed his wrist. */
                              <span className="block font-semibold">
                                {r.summary.text}
                              </span>
                            ) : diagnosis ? (
                              <>
                                <span className="block font-semibold">
                                  {diagnosis.diagnosis}
                                </span>
                                {r.body_part && (
                                  <span
                                    className="mt-0.5 block text-xs uppercase tracking-wider"
                                    style={{
                                      fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {r.body_part}
                                    {r.notes ? ` · ${r.notes}` : ""}
                                  </span>
                                )}
                              </>
                            ) : r.summary ? (
                              /* The injury named in full ("Knee injury (ACL and
                                 MCL), surgery"), where this column used to print
                                 the wire's raw field and the next column the same
                                 thing again as a sentence. One fact twice was a
                                 large part of why rows read as vague. */
                              <span className="block font-semibold">
                                {r.summary.text}
                              </span>
                            ) : r.body_part || r.notes ? (
                              <span className="block font-semibold">
                                {[r.body_part, r.notes].filter(Boolean).join(", ")}
                              </span>
                            ) : null}
                            {r.official?.secondary && (
                              <span
                                className="mt-0.5 block text-xs uppercase tracking-wider"
                                style={{
                                  fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                Also: {r.official.secondary}
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
                                  fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                Not listed
                              </span>
                            )}
                            <OfficialWeek row={r} week={tracker.officialWeek} said={noInjuryThisWeek} />
                          </td>
                          {showRecord && (
                            <td className="px-4 py-3">
                              {rec && (
                                <>
                                  <CampStatusPill status={rec.status} />
                                  <span className="mt-1.5 block">
                                    <Timeline injury={rec} />
                                  </span>
                                </>
                              )}
                              {/* No record, nothing here: the composed
                                  description moved to the Injury column on
                                  2026-09-19, where it replaced the raw field it
                                  used to repeat. An empty cell says "not
                                  written up" (§8). */}
                            </td>
                          )}
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
                                  style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)" }}
                                >
                                  Disagrees
                                </span>
                                <span>
                                  the record says {rec?.status}, the wire has
                                  him {r.wire}
                                </span>
                              </span>
                            )}
                            {rec?.latest &&
                              (r.recordSuperseded ? (
                                <span className="block" style={{ color: "var(--text-muted)" }}>
                                  {shortDate(rec.reported)}: {rec.latest}
                                </span>
                              ) : (
                                rec.latest
                              ))}
                            {/* No record means nobody here has written this
                                player up. What exists is other people's
                                reporting, published as they wrote it and
                                credited to them (§2: headline, source and link,
                                never body text). */}
                            {!rec &&
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
                                    </li>
                                  ))}
                                </ul>
                              ) : r.board?.status ? (
                                /* No record and no headline, but a board has a
                                   status in plain words. "Questionable for
                                   Week 1 at L.A. Chargers" says more than an
                                   empty cell and is not this site's claim. */
                                <span className="block">
                                  {r.board.status}
                                  {/* Named, because these lines carry return
                                      estimates ("Expected Return - Week 5") and
                                      §5.3 allows a timeline only with the name
                                      of whoever gave it. They printed bare
                                      until 2026-09-19. */}
                                  <span
                                    className="mt-0.5 block text-xs"
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {r.board.source}
                                  </span>
                                </span>
                              ) : null)}
                            {rec?.history && (
                              <span
                                className="mt-1.5 block text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                History: {rec.history}
                              </span>
                            )}
                            {/* The feed cannot write a diagnosis, but it can say
                                something has been reported since this row was
                                written — which is what a static page gets wrong. */}
                            {rec && isNewerThan(fresh, rec.reported) && (
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
                                  style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)" }}
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

      </Container>
    </>
  );
}

const PRACTICE_TEXT = {
  DNP: "Did not practice",
  Limited: "Limited in practice",
  Full: "Full practice",
} as const;

/** Statuses for reserve lists. A player on one is never on the weekly report,
 *  so "not on this week's report" would be true and would mislead. */
const RESERVE = new Set(["IR", "PUP", "Sus", "DNR"]);

/**
 * This week's NFL injury report for one row: how he practiced and how he is
 * designated, in the league's own terms, labelled as the league's.
 *
 * Added 2026-09-19 because a row could name a knee and a status and still not
 * say whether the player was practising, which is what a reader is actually
 * asking. It states only what the report states: practice participation, game
 * designation, and when the report lists him for a rest day or a personal
 * matter, that it is not an injury. It never says how he was hurt (no source
 * the page pulls does) and never states a return date (§5.3).
 *
 * "Not on the Week N injury report" is printed only when his club filed that
 * week, and never for a player on a reserve list, who is not carried on the
 * weekly report at all.
 */
function OfficialWeek({
  row,
  week,
  said = false,
}: {
  row: Pick<TrackerRow, "official" | "offReport" | "wire">;
  week: number | null;
  /** The Injury column has already said he is not on the report. */
  said?: boolean;
}) {
  const label = (w: number) => (
    <span
      className="mt-0.5 block text-xs uppercase tracking-wider"
      style={{
        fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
        color: "var(--text-muted)",
      }}
    >
      NFL injury report, Wk {w}
    </span>
  );
  const o = row.official;
  if (o) {
    const parts = [
      o.practice ? PRACTICE_TEXT[o.practice] : null,
      o.game ? `${o.game} for Week ${o.week}` : "No game designation",
    ].filter(Boolean);
    return (
      <span className="mt-2 block text-sm">
        <span className="block" style={{ color: "var(--text-primary)" }}>
          {parts.join(" · ")}
        </span>
        {o.notInjury && (
          <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
            {o.notInjury === "rest"
              ? "Listed for a rest day, not an injury"
              : "Listed for a personal matter, not an injury"}
          </span>
        )}
        {label(o.week)}
      </span>
    );
  }
  if (!said && row.offReport && week && !(row.wire && RESERVE.has(row.wire))) {
    return (
      <span className="mt-2 block text-sm" style={{ color: "var(--text-secondary)" }}>
        Not on the Week {week} injury report
      </span>
    );
  }
  return null;
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
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
        >
          {team ? `${team.city} ${team.nickname}` : abbr}
        </span>
        {history && (
          <Link
            href={`/injuries/${abbr.toLowerCase()}`}
            className="ml-auto text-xs font-bold uppercase tracking-wider hover:underline"
            style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)" }}
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
      style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
