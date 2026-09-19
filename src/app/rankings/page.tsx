import type { Metadata } from "next";
import Link from "next/link";
import { DataFreshness } from "@/components/DataFreshness";
import { FilterLink } from "@/components/FilterLink";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { SectionHero } from "@/components/SectionHero";
import { FreeAgentChip, TeamChip } from "@/components/TeamChip";
import {
  BYE_SEASON,
  LATEST_WEEK,
  getRankingList,
  getWeeklyList,
  rankedEntries,
  validateContent,
} from "@/lib/content";
import { POSITIONS } from "@/lib/types";
import type { Position } from "@/lib/types";

export const metadata: Metadata = {
  title: "Rankings",
  description:
    "2026 draft and weekly rankings, PPR, by position, with team and bye week.",
};

const POSITION_LABEL: Record<Position, string> = {
  QB: "Quarterbacks",
  RB: "Running backs",
  WR: "Wide receivers",
  TE: "Tight ends",
  K: "Kickers",
  DST: "Defenses",
};

function parsePosition(v: string | undefined): Position {
  const up = (v ?? "QB").toUpperCase() as Position;
  return POSITIONS.includes(up) ? up : "QB";
}

/**
 * Where a ranking sits in the season, in the URL so it is linkable (§5.1).
 *
 * Two scopes. Rest of season was dropped on 2026-09-19 at the operator's
 * request: the site publishes draft and weekly rankings and nothing between
 * them. A week with no list is still an addressable empty scope, which is what
 * lets next week's list arrive without a change to this page — only a file and
 * its import in `content.ts`, which the empty state names.
 */
const SCOPES = [
  { key: "draft", label: "Draft" },
  { key: "week", label: "Weekly" },
] as const;
type Scope = (typeof SCOPES)[number]["key"];

const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ pos?: string; scope?: string; week?: string }>;
}) {
  const params = await searchParams;
  const position = parsePosition(params.pos);

  const scope: Scope =
    (SCOPES.find((s) => s.key === params.scope)?.key as Scope) ?? "draft";
  const parsedWeek = Number(params.week);
  // A bare "Weekly" link lands on the latest published week rather than
  // Week 1: once the season is under way, last week's list is the stale one.
  const week = WEEKS.includes(parsedWeek) ? parsedWeek : (LATEST_WEEK ?? 1);

  const draft = getRankingList(position);
  const weekly = scope === "week" ? getWeeklyList(week, position) : undefined;
  // The list on screen: the draft board, or this week's list if it exists.
  const list = scope === "draft" ? draft : weekly;
  const rows = list ? rankedEntries(list) : [];
  const problems = validateContent();

  const q = (over: { pos?: string; scope?: Scope; week?: number }) => {
    const next = { pos: position, scope, week, ...over };
    const p = new URLSearchParams({ pos: next.pos });
    if (next.scope !== "draft") p.set("scope", next.scope);
    if (next.scope === "week") p.set("week", String(next.week));
    return `/rankings?${p.toString()}`;
  };

  return (
    <>
      {/* A coach carried off the field is the picture of a conclusion —
          which is what a ranking is. */}
      <SectionHero
        image="/img/bg/parcells.jpg"
        alt=""
        objectPosition="center 72%"
        eyebrow="Draft board"
        title="Rankings"
        lede="2026 Fantasy Football Redraft Positional Rankings (1 Point Per Reception)"
      />

      <div
        className="border-b"
        style={{
          background: "var(--surface-sunken)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <Container className="py-6">
          <PositionTabs current={position} />
          {/* Scope sits under position because a reader picks the position
              first and then asks which list of it they want. */}
          <nav aria-label="Scope" className="mt-4">
            <ul className="flex flex-wrap items-center gap-2">
              <li className="eyebrow mr-1">List</li>
              {SCOPES.map((s) => (
                <li key={s.key}>
                  <FilterLink href={q({ scope: s.key })} active={s.key === scope}>
                    {s.label}
                  </FilterLink>
                </li>
              ))}
            </ul>
          </nav>
          {scope === "week" && (
            <nav aria-label="Week" className="mt-3">
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
                        fontStretch: "var(--stretch-condensed)",
                        background: w === week ? "var(--text-primary)" : "transparent",
                        color: w === week ? "var(--surface-page)" : "var(--text-secondary)",
                        boxShadow: w === week ? undefined : "inset 0 0 0 1px var(--border-strong)",
                      }}
                    >
                      {w}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </Container>
      </div>

      <Container className="py-16 sm:py-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-3xl uppercase tracking-wide"
              style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
            >
              {POSITION_LABEL[position]}
            </h2>
            {/* Two qualifiers, both neutral rather than amber: they say how to
                read the list, they are not the focal value on it (§7). Scope
                is filled because mistaking draft ranks for in-season ranks is
                the costlier error. */}
            <span
              className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                background: "var(--text-primary)",
                color: "var(--surface-page)",
              }}
            >
              {scope === "draft" ? `${draft.scope} rankings` : `Week ${week}`}
            </span>
            <span
              className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                color: "var(--text-secondary)",
                boxShadow: "inset 0 0 0 1px var(--border-strong)",
              }}
            >
              {(list ?? draft).format} scoring
            </span>
          </div>
          {/* Each list carries its own date, and an unpublished week shows
              none: stamping the draft file's date on an empty week would claim
              a freshness that week does not have (§6).

              A weekly list is never flagged stale. It is dated to its week by
              construction and the week is on screen, so a finished week's list
              is a record rather than an out-of-date one — Week 1's would
              otherwise read "11 days ago" in the warning colour on a list
              that is exactly as current as it will ever be. */}
          {list && (
            <DataFreshness
              updated={list.updated}
              label="Rankings updated"
              staleAfterDays={scope === "week" ? Number.POSITIVE_INFINITY : 21}
            />
          )}
        </div>

        {problems.length > 0 && <ContentProblems problems={problems} />}

        {rows.length === 0 ? (
          <div className="mt-8">
            {/* §8: a direction, not an apology. Each scope names the file it
                wants and, for the two that do not exist yet, the import in
                content.ts that makes the file reachable. */}
            <EmptyState
              title={
                scope === "draft"
                  ? `No ${position} draft rankings published yet.`
                  : `No ${position} rankings for week ${week} yet.`
              }
              direction={
                scope === "draft"
                  ? `Add entries to src/data/rankings/${position.toLowerCase()}.json.`
                  : `Fill the Week ${week} block of the workbook's Rankings sheet, date it in PUBLISHED in scripts/curated/weekly_rankings.py and run it, then import src/data/rankings/week-${week}.json in src/lib/content.ts.`
              }
            />
          </div>
        ) : (
          <div
            className="mt-6 overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--surface-sunken)" }}>
                  <Th className="w-16 text-right">Rank</Th>
                  <Th>{position === "DST" ? "Defense" : "Player"}</Th>
                  <Th className="w-24">Team</Th>
                  <Th className="w-28 text-right">Bye</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ entry, player, bye }) => (
                  <tr
                    key={entry.player_id}
                    className="border-t"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <td
                      className="px-4 py-3 text-right text-lg font-bold tnum"
                      style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)" }}
                    >
                      {entry.rank}
                    </td>
                    <td className="px-4 py-3">
                      <PlayerLink player={player} showTeam={false} />
                    </td>
                    <td className="px-4 py-3">
                      {player.team ? (
                        <TeamChip abbr={player.team} />
                      ) : player.status === "fa" ? (
                        <FreeAgentChip />
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        > n/a </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-right tnum"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {bye ? (
                        <>
                          <span className="sr-only">Bye week </span>
                          {bye}
                        </>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>n/a</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Draft-only. This paragraph exists to stop a reader taking pre-season
            ranks for in-season ones, which is the wrong caveat to print on a
            weekly list. */}
        {scope === "draft" && (
          <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {draft.scope} rankings, {draft.format} scoring. These are preseason
            draft ranks and are not updated week to week, so in-season order will diverge from this. Bye weeks are for the {BYE_SEASON} season.
          </p>
        )}
      </Container>
    </>
  );
}

/** Tabs are links, so the position lives in the URL and a list is shareable. */
function PositionTabs({ current }: { current: Position }) {
  return (
    <nav aria-label="Position">
      <ul className="flex flex-wrap gap-1.5">
        {POSITIONS.map((pos) => {
          const active = pos === current;
          return (
            <li key={pos}>
              <Link
                href={`/rankings?pos=${pos}`}
                aria-current={active ? "page" : undefined}
                className="block rounded px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors"
                style={{
                  fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                  background: active ? "var(--text-primary)" : "transparent",
                  color: active ? "var(--surface-page)" : "var(--text-secondary)",
                  boxShadow: active
                    ? undefined
                    : "inset 0 0 0 1px var(--border-strong)",
                }}
              >
                {pos}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
      className={`px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider ${className}`}
      style={{
        fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </th>
  );
}

/** §10: a bad edit must surface, not silently serve something wrong. */
function ContentProblems({
  problems,
}: {
  problems: { file: string; message: string }[];
}) {
  return (
    <div
      className="mt-6 rounded-lg border px-4 py-3"
      style={{
        borderColor: "var(--color-status-doubtful)",
        background:
          "color-mix(in oklab, var(--color-status-doubtful) 8%, transparent)",
      }}
    >
      <p className="font-semibold">
        {problems.length} content{" "}
        {problems.length === 1 ? "problem" : "problems"} found
      </p>
      <ul className="mt-1.5 space-y-0.5 text-sm">
        {problems.map((p, i) => (
          <li key={i}>
            <code>{p.file}</code>: {p.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
