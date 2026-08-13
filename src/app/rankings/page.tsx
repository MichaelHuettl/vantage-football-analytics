import type { Metadata } from "next";
import Link from "next/link";
import { DataFreshness } from "@/components/DataFreshness";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { SectionHero } from "@/components/SectionHero";
import { TeamChip } from "@/components/TeamChip";
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
    "PPR rankings, 1-20 by position, with team and 2026 bye week.",
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
        objectPosition="center 30%"
        eyebrow="Draft and in-season"
        title="Rankings"
        lede="PPR scoring, twenty deep at every position. Team and 2026 bye week alongside each name."
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

      <Container className="py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-3xl uppercase tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {POSITION_LABEL[position]}
            </h2>
            {/* Neutral, not amber: the format is a caveat on how to read the
                list, not the focal value on the page (§7). */}
            <span
              className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-condensed)",
                color: "var(--text-secondary)",
                boxShadow: "inset 0 0 0 1px var(--border-strong)",
              }}
            >
              {list.format} scoring
            </span>
          </div>
          <DataFreshness updated={list.updated} label="Rankings updated" staleAfterDays={21} />
        </div>

        {list.source && (
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {list.source}
          </p>
        )}

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
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {entry.rank}
                    </td>
                    <td className="px-4 py-3">
                      <PlayerLink player={player} showTeam={false} />
                    </td>
                    <td className="px-4 py-3">
                      {player.team ? (
                        <TeamChip abbr={player.team} />
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          —
                        </span>
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
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          {list.format} scoring. Bye weeks are for the {BYE_SEASON} season.
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
                  fontFamily: "var(--font-condensed)",
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
        fontFamily: "var(--font-condensed)",
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
            <code>{p.file}</code> — {p.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
