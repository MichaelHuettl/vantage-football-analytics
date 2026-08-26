/**
 * The brand mark at chrome size — header, footer, anywhere it sits beside the
 * wordmark at 28-48px. The operator's "navbar" cut: the goalpost, the trend
 * line, the endpoint, and nothing else.
 *
 * §7 describes the mark precisely and says implement it, do not redesign it, so
 * the path data below is his file verbatim. Three things about how it is drawn
 * are mine, and each has a reason:
 *
 * 1. The structure is `currentColor` rather than a fixed white. Every call site
 *    today sets white on a dark ground, but the page surface is light by
 *    default, and a hardcoded white mark would vanish the first time one is
 *    placed on it. Inheriting means one file works on either chrome.
 * 2. His source clips the plot to a rect. Measured against the geometry, that
 *    clip removes nothing here: the line spans x 51-145 and y 35-121 with its
 *    caps, the endpoint circle x 135-149 and y 31-45, all inside the rect's
 *    43.5-156.5 by 20-130.5. It is dropped, which also removes an `id` that
 *    would otherwise appear twice in the DOM — this component renders in both
 *    the header and the footer of every page. (The emblem's clip is not
 *    decorative and is kept; see Emblem.tsx.)
 * 3. The viewBox is cropped to the artwork. His 200x200 canvas is the favicon's
 *    square, and on it the goalpost occupies 128x168 centred — a third of the
 *    box is margin. Cropping to it lets the mark fill the height it is given
 *    and lets CSS own the spacing. No coordinate is changed. Emblem.tsx crops
 *    to the same window, so the two are interchangeable without anything
 *    shifting.
 */
export function Goalpost({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="35 15 130 170"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      {/* The data, rising left to right. Amber, and the only amber here — §7
          reserves it for the focal thing on screen. */}
      <path
        d="M54 108L72 118L90 84L108 94L126 56L142 38"
        stroke="var(--color-vantage-amber)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="142" cy="38" r="7" fill="var(--color-vantage-amber)" />

      {/* Uprights and crossbar: an inverted U, the crossbar doubling as the
          x-axis. Then the stem, then the ground line. */}
      <g stroke="currentColor">
        <path
          d="M40 20V134H160V20"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M100 134V178" strokeWidth="8.5" />
        <path d="M52 182H148" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* The base plate the stem sits on. */}
      <rect x="84" y="173" width="32" height="7" rx="3.5" fill="currentColor" />
    </svg>
  );
}
