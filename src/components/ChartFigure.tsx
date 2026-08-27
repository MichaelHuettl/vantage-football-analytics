import Image from "next/image";

/**
 * The chart container, and the highest-leverage piece of the design system.
 *
 * §7 specifies an inverted-U frame — two verticals and a baseline, the crossbar
 * acting as the x-axis — echoing the logo, so a Vantage chart is recognisable
 * cropped into a screenshot. It also warns against using it everywhere, so
 * `featured` is opt-in and there is a plain variant for the rest.
 *
 * Charts arrive as PNGs exported from Python. Two consequences handled here:
 *
 * - A PNG cannot follow the page theme. Rather than let a light chart glare on
 *   a dark page, the image always sits on an explicit light plate, which reads
 *   as a deliberate mount in both themes.
 * - Intrinsic dimensions are unknown until the file exists, so the frame
 *   reserves space by aspect ratio. That keeps §10's no-layout-shift promise.
 */
export function ChartFigure({
  src,
  alt,
  caption,
  featured = false,
  ratio = "16 / 10",
  source,
  children,
}: {
  /** Path under /public/charts, e.g. "/charts/wr-target-share.png" */
  src?: string;
  /** What the chart shows, for screen readers. Not the same as the caption. */
  alt?: string;
  /** §5.2: one plain sentence stating the single takeaway. */
  caption: string;
  featured?: boolean;
  ratio?: string;
  source?: string;
  /**
   * A chart drawn in the page rather than exported as a PNG. It gets the same
   * frame — the goalpost is the signature element (§7) and must not be
   * reimplemented per chart — but not the white plate, because an SVG built
   * from tokens already follows the theme.
   */
  children?: React.ReactNode;
}) {
  return (
    <figure className="my-8">
      <div className={featured ? "relative pb-6" : ""}>
        <div
          className="overflow-hidden"
          style={
            featured
              ? {
                  borderLeft: "6px solid var(--text-primary)",
                  borderRight: "6px solid var(--text-primary)",
                  borderBottom: "6px solid var(--text-primary)",
                  // 4px, the scale's default. Was 3px, which is off the
                  // radius scale and indistinguishable from it under a 6px frame.
                  borderRadius: "4px",
                }
              : {
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                }
          }
        >
          {children ? (
            <div className="relative w-full" style={{ background: "var(--surface-page)" }}>
              {children}
            </div>
          ) : (
            <div
              className="relative w-full"
              style={{
                aspectRatio: ratio,
                // Deliberately white in both themes: the chart PNGs are
                // exported on white, so the plate has to match the image
                // rather than the page. The token, not the literal (§7).
                background: "var(--color-vantage-white)",
              }}
            >
              {src ? (
                <Image
                  src={src}
                  alt={alt ?? caption}
                  fill
                  sizes="(max-width: 900px) 100vw, 900px"
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <ChartSlot />
              )}
            </div>
          )}
        </div>

        {/* The stem. Completes the goalpost below the crossbar. */}
        {featured && (
          <div
            aria-hidden="true"
            className="absolute left-1/2 bottom-0 -translate-x-1/2"
            style={{
              width: "6px",
              height: "24px",
              background: "var(--text-primary)",
              borderRadius: "0 0 4px 4px",
            }}
          />
        )}
      </div>

      <figcaption className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        {caption}
        {source && (
          <span className="block mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {source}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Shown until a PNG is dropped in. §8: empty states are directions, not
 * apologies — so this says where the file goes.
 */
function ChartSlot() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
      <div
        className="h-10 w-14 rounded-sm"
        style={{
          // Tokens, not hex. These were #D2D8DC / #4A555F / #66727D, which is
          // exactly what §7 forbids in a component and which also meant the
          // placeholder ignored dark mode entirely.
          borderLeft: "4px solid var(--color-ink-200)",
          borderRight: "4px solid var(--color-ink-200)",
          borderBottom: "4px solid var(--color-ink-200)",
        }}
      />
      <p className="text-sm font-semibold" style={{ color: "var(--color-ink-600)" }}>
        Chart slot
      </p>
      <p className="text-xs max-w-xs" style={{ color: "var(--color-ink-500)" }}>
        Drop the PNG in <code>/public/charts</code> and pass its path as{" "}
        <code>src</code>.
      </p>
    </div>
  );
}
