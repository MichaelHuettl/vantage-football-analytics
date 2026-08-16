import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import positionsFile from "@/data/positions.json";
import { ChartFigure } from "@/components/ChartFigure";
import { DataFreshness } from "@/components/DataFreshness";
import { Container } from "@/components/PageHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { DefenseAnalysis } from "@/components/DefenseAnalysis";
import { KickerAnalysis } from "@/components/KickerAnalysis";
import { RunningBackAnalysis } from "@/components/RunningBackAnalysis";
import { PLAYERS, getRankingList } from "@/lib/content";
import { POSITIONS } from "@/lib/types";
import type { Envelope, Position } from "@/lib/types";

interface PositionDoc {
  position: Position;
  chart_title: string;
  chart_x: string;
  chart_y: string;
  caption: string;
  methodology: string;
  chart?: string;
}

const docs = (positionsFile as Envelope<PositionDoc[]>).data;

/**
 * Positions with their own worked-up analysis. These run as a single column —
 * straight into the evidence. The rest keep the two-column layout, where the
 * ranked list beside an empty chart slot is the only real content the page has.
 */
const BUILT = new Set<Position>(["RB", "K", "DST"]);

/**
 * Positions still carrying the placeholder methodology paragraph and the
 * strapline under the title. Both describe a chart that was never built, so a
 * page whose analysis is real drops them rather than contradicting itself.
 */
const PLACEHOLDER_COPY = new Set<Position>(["QB", "WR", "TE", "RB"]);

const FULL_NAME: Record<Position, string> = {
  QB: "Quarterback",
  RB: "Running back",
  WR: "Wide receiver",
  TE: "Tight end",
  K: "Kicker",
  DST: "Defense / special teams",
};

export function generateStaticParams() {
  return POSITIONS.map((p) => ({ position: p.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ position: string }>;
}): Promise<Metadata> {
  const { position } = await params;
  const upper = position.toUpperCase() as Position;
  return {
    title: FULL_NAME[upper] ? `${FULL_NAME[upper]} analysis` : "Position",
  };
}

export default async function PositionPage({
  params,
}: {
  params: Promise<{ position: string }>;
}) {
  const { position } = await params;
  const upper = position.toUpperCase() as Position;
  const doc = docs.find((d) => d.position === upper);
  if (!doc) notFound();

  const list = getRankingList(upper);
  const pool = PLAYERS.filter((p) => p.position === upper);

  return (
    <>
      {/*
        A typographic hero rather than a photograph. A player portrait cropped
        to a wide band is a soft, upscaled sliver; the position abbreviation set
        enormous is sharp at any width and makes each page instantly distinct
        from its five siblings.
      */}
      <header
        className="relative isolate overflow-hidden"
        style={{ background: "var(--color-vantage-panel)" }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 select-none leading-none"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(12rem, 34vw, 26rem)",
            color: "var(--color-ink-900)",
          }}
        >
          {upper}
        </span>
        <div className="absolute inset-0 -z-10 yardlines-inverse opacity-15" />

        <Container className="relative pt-28 pb-12">
          <nav aria-label="Breadcrumb">
            <Link
              href="/positions"
              className="eyebrow hover:underline"
              style={{ color: "var(--color-ink-400)" }}
            >
              ← All positions
            </Link>
          </nav>

          <p
            className="eyebrow mt-5 flex items-center gap-2.5"
            style={{ color: "var(--color-vantage-amber)" }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5"
              style={{ background: "var(--color-vantage-amber)" }}
            />
            Position framework
          </p>

          <h1
            className="mt-3 text-5xl sm:text-7xl uppercase tracking-wide leading-[0.9]"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-vantage-white)",
            }}
          >
            {FULL_NAME[upper]}
          </h1>
          {PLACEHOLDER_COPY.has(upper) && (
            <p
              className="mt-4 max-w-xl text-lg"
              style={{ color: "var(--color-ink-300)" }}
            >
              {doc.chart_title}
            </p>
          )}
        </Container>
      </header>

      <Container className="py-12">
        {/*
          A position with its own charts runs as one column: methodology, then
          straight into the evidence. The two-column layout below exists to
          give a page with nothing in it something to show — a ranked list
          beside an empty chart slot — and once the charts are real it is
          furniture between the reader and the argument.
        */}
        {BUILT.has(upper) ? (
          <>
            <DataFreshness updated={list.updated} />
            {PLACEHOLDER_COPY.has(upper) && (
              <section className="mt-8 max-w-3xl">
                <h2 className="eyebrow mb-3">Methodology</h2>
                <p className="text-lg leading-relaxed">{doc.methodology}</p>
              </section>
            )}
            {upper === "RB" && <RunningBackAnalysis />}
            {upper === "K" && <KickerAnalysis />}
            {upper === "DST" && <DefenseAnalysis />}
          </>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div>
              <DataFreshness updated={list.updated} />

              <section className="mt-8">
                <h2 className="eyebrow mb-3">Methodology</h2>
                <p className="text-lg leading-relaxed">{doc.methodology}</p>
              </section>

              <ChartFigure
                src={doc.chart || undefined}
                featured
                caption={doc.caption}
                source={`x: ${doc.chart_x} · y: ${doc.chart_y}`}
              />
            </div>

            <aside>
              <h2
                className="text-2xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The pool
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                Every {upper} currently carried. Advanced splits land here as you
                add them.
              </p>
              <ul
                className="mt-5 border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                {pool.map((player) => (
                  <li
                    key={player.id}
                    className="border-b py-3"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <PlayerLink player={player} />
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}
      </Container>
    </>
  );
}
