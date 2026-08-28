import type { Metadata } from "next";
import Link from "next/link";
import { DataFreshness } from "@/components/DataFreshness";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { SectionHero } from "@/components/SectionHero";
import { FreeAgentChip, TeamChip } from "@/components/TeamChip";
import {
  BYE_SEASON,
  getRankingList,
  rankedEntries,
  validateContent,
} from "@/lib/content";
import { POSITIONS } from "@/lib/types";
import type { Position } from "@/lib/types";

export const metadata: Metadata = {
  title: "Rankings",
  description:
    "2026 draft rankings, PPR, 1-20 by position, with team and bye week.",
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

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ pos?: string }>;
}) {
  const params = await searchParams;
  const position = parsePosition(params.pos);

  const list = getRankingList(position);
  const rows = rankedEntries(position);
  const problems = validateContent();

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
        lede="Draft rankings for 2026, PPR scoring, twenty deep at every position."
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
              {list.scope} rankings
            </span>
            <span
              className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                color: "var(--text-secondary)",
                boxShadow: "inset 0 0 0 1px var(--border-strong)",
              }}
            >
              {list.format} scoring
            </span>
          </div>
          <DataFreshness updated={list.updated} label="Rankings updated" staleAfterDays={21} />
        </div>

        {problems.length > 0 && <ContentProblems problems={problems} />}

        {rows.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={`No ${position} rankings published yet.`}
              direction={`Add entries to src/data/rankings/${position.toLowerCase()}.json.`}
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

        <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          {list.scope} rankings, {list.format} scoring. These are pre-season
          draft ranks and are not updated week to week, so in-season order will diverge from this. Bye weeks are for the {BYE_SEASON} season.
        </p>
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
