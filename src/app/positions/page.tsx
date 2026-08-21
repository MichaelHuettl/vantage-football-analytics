import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import positionsFile from "@/data/positions.json";
import { Container } from "@/components/PageHeader";
import { SectionHero } from "@/components/SectionHero";
import { PositionBadge } from "@/components/PlayerLink";
import { POSITION_BUILT, POSITION_NAME } from "@/lib/types";
import type { Envelope, Position } from "@/lib/types";

export const metadata: Metadata = { title: "Positional Data" };

interface PositionDoc {
  position: Position;
  /** The family of statistics the position is judged on. */
  evaluated_on: string;
  /** Written for this card, at card length. */
  summary: string;
  photo: string;
  /** Where the subject sits, for `object-position` in the 2:1 frame. */
  photo_position: string;
  chart_title: string;
  methodology: string;
}

/**
 * The index of the six positions.
 *
 * **Each card is headed by what the position is measured on, not by one
 * chart.** It used to print `chart_title` — "Rush attempts against fantasy
 * points per game" — which was the axes of a single scatter. That was accurate
 * when a position page held one chart and became a misdescription as the built
 * pages grew to four and nine blocks: a reader was told quarterbacks are a
 * rushing-attempts plot when the page behind it argues from scramble rates,
 * efficiency per dropback and team pass rate as well. `evaluated_on` names the
 * family instead, so the card describes the page rather than its first figure.
 *
 * The body copy is written for the card rather than clamped out of
 * `methodology`. Those paragraphs run to five or six lines and `line-clamp-3`
 * cut them mid-sentence, which reads as a bug rather than a summary.
 *
 * Cards say whether the page behind them is built. Five are; wide receiver is
 * still the two-column placeholder, and sending a reader there expecting the
 * defense page's depth is a worse experience than telling them first (§8).
 */
export default function PositionsIndex() {
  const docs = (positionsFile as Envelope<PositionDoc[]>).data;

  return (
    <>
      <SectionHero
        image="/img/bg/field.jpg"
        objectPosition="center 48%"
        eyebrow="Framework"
        title="Positional Data"
        lede="What each position is actually measured on, and the evidence behind every ranking it produces."
      />
      <Container className="py-10">
        <ul className="grid gap-4 sm:grid-cols-2">
          {docs.map((doc) => {
            const built = POSITION_BUILT.has(doc.position);
            return (
              <li key={doc.position}>
                <Link
                  href={`/positions/${doc.position.toLowerCase()}`}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border transition-colors hover:border-[var(--accent)]"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  {/* One frame for all six. The photographs arrive at six
                      different shapes — the running back is a portrait, the
                      rest are landscape at three different ratios — so the
                      frame is fixed at 2:1 and each photo is positioned to it
                      rather than cropped to it. `object-position` comes from
                      the data, per photo, because "center" puts the subject's
                      chest in frame on one and the turf on another. */}
                  <div
                    className="relative aspect-[2/1] w-full overflow-hidden"
                    style={{ background: "var(--color-vantage-panel)" }}
                  >
                    <Image
                      src={doc.photo}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="transition-transform duration-300 group-hover:scale-[1.03]"
                      style={{ objectFit: "cover", objectPosition: doc.photo_position }}
                    />
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <PositionBadge position={doc.position} />
                    <span className="eyebrow">{POSITION_NAME[doc.position]}</span>
                    {!built && (
                      <span
                        className="ml-auto inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[0.65rem] font-bold uppercase tracking-wider"
                        style={{
                          fontFamily: "var(--font-condensed)",
                          color: "var(--text-muted)",
                          boxShadow: "inset 0 0 0 1px var(--border-strong)",
                        }}
                      >
                        Not yet built
                      </span>
                    )}
                  </div>

                  <span
                    className="text-xl uppercase tracking-wide"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {doc.evaluated_on}
                  </span>

                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {doc.summary}
                  </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </>
  );
}
