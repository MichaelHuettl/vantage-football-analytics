import type { Metadata } from "next";
import { Container } from "@/components/PageHeader";
import { SectionHero } from "@/components/SectionHero";

export const metadata: Metadata = {
  title: "Film room",
  description:
    "Team film breakdowns and a play log, drawn from scratch rather than clipped from a broadcast.",
};

/**
 * The film room, held at a placeholder on the operator's instruction
 * (2026-08-28).
 *
 * Everything below the hero was stripped back to a single panel. What went was
 * the sample breakdown and the by-team index over all 32 clubs whose cards were
 * all empty — the scaffold read as a section that had failed to load rather
 * than one that has not opened yet, and saying so plainly is the better of the
 * two.
 *
 * **Nothing the section will need was deleted.** `FilmSample`, `PlayDiagram`,
 * `src/data/film-sample.json`, `src/data/concepts.json` and the
 * `/film/[concept]` route are all untouched and still build; this page simply
 * stops rendering them. Restoring the index is re-importing them, and the
 * sample play is still in the repo with its "Sample" badge intact — that label
 * is load-bearing and has to come back with it.
 *
 * §8: an empty state is a direction, not an apology. The panel says what is
 * coming rather than regretting what is missing.
 */
export default function FilmPage() {
  return (
    <>
      <SectionHero
        image="/img/bg/lombardi.jpg"
        objectPosition="center 40%"
        eyebrow="Concepts and diagrams"
        title="Film room"
        lede="A catalog of film analysis and breakdowns, and the future site of a work-in-progress statistical model."
      />

      <Container className="py-16 sm:py-24">
        {/* The field motif carries the panel rather than an icon or an
            illustration: it is the site's own structural device, it needs no
            asset, and it reads at any width. The goalpost frame is deliberately
            not used here — §7 reserves it for the featured figure on a page,
            and a placeholder is not a figure. */}
        <section
          className="relative isolate overflow-hidden rounded-lg"
          style={{
            background: "var(--surface-inverse)",
            boxShadow: "inset 0 0 0 1px var(--color-ink-800)",
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 yardlines-inverse opacity-40"
          />
          {/* A single amber wash rising left to right, echoing the trend line
              in the mark. One amber element on the panel (§7). */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(105deg, transparent 45%, color-mix(in oklab, var(--color-vantage-amber) 9%, transparent) 100%)",
            }}
          />

          <div className="flex flex-col items-center px-6 py-24 text-center sm:py-32">
            <p className="eyebrow" style={{ color: "var(--color-ink-300)" }}>
              In production
            </p>
            <h2
              className="mt-5 text-5xl uppercase tracking-wide sm:text-7xl"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--weight-display)",
                fontStretch: "var(--stretch-display)",
                lineHeight: 0.9,
                color: "var(--color-vantage-white)",
              }}
            >
              Coming soon
            </h2>
            <p
              className="mt-6 max-w-md text-lg"
              style={{ color: "var(--color-ink-300)" }}
            >
              Team breakdowns and a play log, drawn from coordinates rather than
              clipped from a broadcast.
            </p>

            {/* Three ticks on the baseline, the same device the emblem uses
                under its plot. Structure, not decoration: they mark the three
                things the section will hold. */}
            <div
              aria-hidden="true"
              className="mt-12 flex items-end gap-2.5"
              style={{ color: "var(--color-ink-600)" }}
            >
              <span className="h-3 w-px" style={{ background: "currentColor" }} />
              <span className="h-5 w-px" style={{ background: "var(--color-vantage-amber)" }} />
              <span className="h-3 w-px" style={{ background: "currentColor" }} />
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
