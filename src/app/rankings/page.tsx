import type { Metadata } from "next";
import Link from "next/link";
import { ChartFigure } from "@/components/ChartFigure";
import { DataFreshness } from "@/components/DataFreshness";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { SectionHero } from "@/components/SectionHero";
import { TierBand } from "@/components/TierBand";
import { getRankingList, rankedEntries, validateContent } from "@/lib/content";
import { POSITIONS, SCORING_FORMATS } from "@/lib/types";
import type { Position, ScoringFormat } from "@/lib/types";

export const metadata: Metadata = {
  title: "Rankings",
  description:
    "Tiered positional rankings, with the opportunity metric behind each one.",
};

function parsePosition(v: string | undefined): Position {
  const up = (v ?? "RB").toUpperCase() as Position;
  return POSITIONS.includes(up) ? up : "RB";
}

function parseFormat(v: string | undefined): ScoringFormat {
  const ids = SCORING_FORMATS.map((f) => f.id);
  return ids.includes(v as ScoringFormat) ? (v as ScoringFormat) : "ppr";
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ pos?: string; format?: string }>;
}) {
  const params = await searchParams;
  const position = parsePosition(params.pos);
  const format = parseFormat(params.format);

  const list = getRankingList(position);
  const rows = rankedEntries(position, format);
  const problems = validateContent();

  const byTier = list.tiers
    .map((t) => ({ ...t, rows: rows.filter((r) => r.entry.tier === t.tier) }))
    .filter((t) => t.rows.length > 0);

  return (
    <>
      {/* A coach carried off the field is the picture of a conclusion —
          which is what a ranking is, and what this page argues you should
          be able to check rather than accept. */}
      <SectionHero
        image="/img/bg/parcells.jpg"
        alt=""
        objectPosition="center 30%"
        eyebrow="Draft and in-season"
        title="Rankings"
        lede="Ordered by tier, not by decimal places. Expand any player to see the chart the ranking rests on."
      />

      <div
        className="border-b"
        style={{
          background: "var(--surface-sunken)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <Container className="py-6">
          <div className="flex flex-col gap-4">
            <PositionTabs current={position} format={format} />
            <FormatToggle current={format} position={position} />
          </div>
        </Container>
      </div>

      <Container className="py-8">
        <div className="mb-6">
          <DataFreshness updated={list.updated} label="Rankings updated" />
        </div>

        {problems.length > 0 && <ContentProblems problems={problems} />}

        {byTier.length === 0 ? (
          <EmptyState
            title={`No ${position} rankings published yet.`}
            direction={`Add entries to src/data/rankings/${position.toLowerCase()}.json.`}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {byTier.map((tier) => (
              <TierBand
                key={tier.tier}
                tier={tier.tier}
                label={tier.label}
                count={tier.rows.length}
              >
                <ul>
                  {tier.rows.map(({ entry, player, rank }) => (
                    <li
                      key={entry.player_id}
                      className="border-b last:border-b-0"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <details className="group">
                        {/* `display` stays at the summary default — Chrome
                            drops the disclosure activation behaviour when a
                            summary is flexed directly, so the layout goes on
                            an inner wrapper instead. */}
                        <summary className="cursor-pointer list-none px-4 py-3 hover:bg-[color-mix(in_oklab,var(--text-primary)_4%,transparent)] [&::-webkit-details-marker]:hidden">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-7 shrink-0 text-right text-lg tnum font-bold"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              {rank}
                            </span>
                            <span className="min-w-0 flex-1">
                              <PlayerLink player={player} />
                            </span>
                            <span
                              className="hidden flex-1 text-sm sm:block"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {entry.note}
                            </span>
                            <span
                              aria-hidden="true"
                              className="shrink-0 text-xs uppercase tracking-wider transition-transform group-open:rotate-90"
                              style={{
                                fontFamily: "var(--font-condensed)",
                                color: "var(--text-muted)",
                              }}
                            >
                              ▸
                            </span>
                          </div>
                        </summary>

                        <div
                          className="px-4 pb-5 pt-1"
                          style={{ background: "var(--surface-sunken)" }}
                        >
                          <p
                            className="text-sm sm:hidden"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {entry.note}
                          </p>
                          <div className="max-w-3xl">
                            <ChartFigure
                              src={entry.chart || undefined}
                              caption={`The opportunity profile behind ${player.name}'s ${position}${rank} ranking.`}
                              ratio="16 / 9"
                            />
                          </div>
                          <Link
                            href={`/players/${player.id}`}
                            className="text-sm font-semibold hover:underline"
                          >
                            Full player page →
                          </Link>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </TierBand>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

/** Tabs are links, so position lives in the URL and a ranking is shareable. */
function PositionTabs({
  current,
  format,
}: {
  current: Position;
  format: ScoringFormat;
}) {
  return (
    <nav aria-label="Position">
      <ul className="flex flex-wrap gap-1.5">
        {POSITIONS.map((pos) => {
          const active = pos === current;
          return (
            <li key={pos}>
              <Link
                href={`/rankings?pos=${pos}&format=${format}`}
                aria-current={active ? "page" : undefined}
                className="block rounded px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors"
                style={{
                  fontFamily: "var(--font-condensed)",
                  background: active ? "var(--text-primary)" : "transparent",
                  color: active
                    ? "var(--surface-page)"
                    : "var(--text-secondary)",
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

function FormatToggle({
  current,
  position,
}: {
  current: ScoringFormat;
  position: Position;
}) {
  return (
    <nav aria-label="Scoring format">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <li className="eyebrow">Format</li>
        {SCORING_FORMATS.map((f) => {
          const active = f.id === current;
          return (
            <li key={f.id}>
              <Link
                href={`/rankings?pos=${position}&format=${f.id}`}
                aria-current={active ? "page" : undefined}
                className="text-sm font-semibold"
                style={{
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  textDecoration: active ? "underline" : "none",
                  textUnderlineOffset: "4px",
                }}
              >
                {f.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
      className="mb-6 rounded-lg border px-4 py-3"
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
