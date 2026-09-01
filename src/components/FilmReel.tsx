import Image from "next/image";
import { FilmGameSummary } from "@/components/FilmGameSummary";
import { FILM_GAME, FILM_PLAYS } from "@/lib/film";

/**
 * One game's play-by-play film, as the operator drew it.
 *
 * **The slides are his, unaltered.** Every diagram here is a render of a slide
 * from `09_07_25 Lions @ Packers Week 1 Packers Offensive Film.pptx`. No shape
 * was moved, resized, recoloured or redrawn, and nothing was rebuilt as SVG the
 * way `film-sample.json` was. What the page adds is navigation around them.
 *
 * One change was made and it is not a design change: the slide canvas was grown
 * from 5.625in to 5.875in before export. The three info boxes are 0.81in tall
 * and start at 5.02in, so they ended 0.20in below the bottom of the slide and
 * both PowerPoint and Keynote clipped their second line — Time, Result and DEF
 * were cut off on all 47 slides. Growing the canvas recovers that text and
 * leaves every coordinate alone.
 *
 * Rendered from Keynote's vector PDF export rather than its image export, so
 * the diagrams are rasterised straight to their final size instead of being
 * upscaled from the slide's 720pt native size. §7's "sips upscales" warning is why.
 *
 * Sources are 2560px wide. The plate renders at 1352 CSS px in the 1400px
 * container, which a 2x display turns into 2704 real pixels; a 1080px source
 * was being upscaled two and a half times and looked it. Next downsamples per
 * device from these, so the weight is repo weight rather than delivered weight.
 *
 * `loading="lazy"` on every plate but the first: 47 plates is 16MB on disk, and
 * a reader looking at play 1 should not pay for play 47.
 */
/**
 * The plate cropped to the field, dropping the slide's own info box.
 *
 * Measured, not guessed: scanning each plate from the bottom for the first row
 * that is not a light band puts the boundary at row 1272 of 1504 on every slide
 * sampled, which is the 0.81in box starting at 5.02in on a 5.875in canvas that
 * the deck note describes. 2560x1273 is the field above it.
 *
 * **Why crop at all.** The box printed Score, Time, Down/Distance, Outcome,
 * Pre-play and DEF, and every one of those already sits in the payload and is
 * printed around the plate in HTML. It was duplication, and it was the
 * duplication that overlapped: the boxes are fixed-width text frames, so a long
 * score ran into Down/Distance and a long outcome ran into DEF on many slides.
 * Text that reflows cannot do that. It is also selectable, searchable and
 * available to a screen reader, which a raster never was.
 *
 * The images are untouched on disk. This is a display crop, and widening the
 * ratio back to 2560/1504 restores the box.
 */
const PLATE_FIELD_RATIO = "2560 / 1273";

export function FilmReel() {
  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-display)",
              fontStretch: "var(--stretch-display)",
            }}
          >
            {FILM_GAME.label}
          </h2>
          {/* The operator's own framing: this is a preview of the section, not
              the finished film room. The Coming soon panel below still stands. */}
          <span
            className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-condensed)",
              fontStretch: "var(--stretch-condensed)",
              background: "var(--color-vantage-amber)",
              color: "var(--color-vantage-black)",
            }}
          >
            Sneak peek
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {FILM_PLAYS.length} plays · Week {FILM_GAME.week}, {FILM_GAME.season}
        </p>
      </div>

      {/* The game in aggregate, under the title and before the plays. All of
          it is settled in `scripts/curated/film_summary.py` (§11). */}
      <FilmGameSummary />

      <ol className="mt-12 flex flex-col gap-12">
        {FILM_PLAYS.map((p, i) => (
          <li key={p.n} id={`play-${p.n}`} className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="text-sm tnum"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontStretch: "var(--stretch-condensed)",
                  color: "var(--text-muted)",
                }}
              >
                {String(p.n).padStart(2, "0")} / {FILM_PLAYS.length}
              </span>
              {p.downDistance && (
                <span
                  className="text-xl uppercase tracking-wide"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--weight-display)",
                    fontStretch: "var(--stretch-display)",
                  }}
                >
                  {p.downDistance}
                </span>
              )}
              {p.time && (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {p.time}
                </span>
              )}
              {p.score && (
                <span className="text-sm tnum" style={{ color: "var(--text-muted)" }}>
                  {p.score}
                </span>
              )}
            </div>

            <figure className="mt-3">
              <div
                className="overflow-hidden rounded-md"
                style={{
                  // Crop the slide's own info box off the bottom. See
                  // PLATE_FIELD_RATIO: the box is redundant with the fields
                  // printed either side of the plate, and it is the thing that
                  // overlaps.
                  aspectRatio: PLATE_FIELD_RATIO,
                  boxShadow:
                    "inset 0 0 0 1px color-mix(in oklab, var(--text-primary) 8%, transparent)",
                }}
              >
                {/* `sizes` has to describe the real slot or Next serves a
                    variant too small for it. This said 900px while the plate
                    renders at 1352 inside the 1400px container, so a 2x display
                    was upscaling a 1080px source by two and a half times, which
                    is what "blurry" was. The plate is full container width, so
                    the honest answer is the container. */}
                <Image
                  src={p.image}
                  alt={`Play ${p.n}: ${p.downDistance ?? ""}${p.outcome ? `, ${p.outcome}` : ""}`}
                  width={2560}
                  height={1504}
                  sizes="(min-width: 1424px) 1352px, (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
                  quality={85}
                  priority={i === 0}
                  loading={i === 0 ? undefined : "lazy"}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              {(p.outcome || p.prePlay || p.defense) && (
                <figcaption
                  className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {/* Each field on its own grid cell rather than run together
                      with separators. Three of these on one line is what ran
                      into itself on the slide, and a grid cannot overlap. */}
                  {p.outcome && (
                    <span>
                      <Label>Outcome</Label> {p.outcome}
                    </span>
                  )}
                  {p.prePlay && (
                    <span>
                      <Label>Pre-play</Label> {p.prePlay}
                    </span>
                  )}
                  {p.defense && (
                    <span>
                      <Label>Defense</Label> {p.defense}
                    </span>
                  )}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs font-bold uppercase tracking-wider"
      style={{
        fontFamily: "var(--font-condensed)",
        fontStretch: "var(--stretch-condensed)",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </span>
  );
}
