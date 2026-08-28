/**
 * The brand mark at display size — the operator's "emblem" cut. Same goalpost
 * as Goalpost.tsx, with the plot drawn in: a two-weight grid, ticks on three
 * edges, the area under the line, and a ring around the endpoint. All of that
 * is detail that reads at 64px and up and turns to mud below it, so the chrome
 * keeps the plain mark and the lockup uses this one.
 *
 * Path data is the operator's file verbatim (§7: implement the brand, do not
 * redesign it). As in Goalpost.tsx the structure inherits `currentColor` so one
 * file works on light and dark chrome, and the viewBox is cropped to the same
 * window so the two marks are optically interchangeable.
 *
 * The clip is kept here because it does work. The tick marks are drawn with
 * round caps and end exactly on the plot edge, so uncut they would bulge past
 * the axis by half a stroke; the clip squares them off against it. It carries
 * a document-unique id, which holds as long as the emblem appears once per
 * page — it is the hero lockup, and the repeated mark is Goalpost.
 */
export function Emblem({
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
      <defs>
        <clipPath id="vantage-emblem-plot">
          <rect x="43.5" y="20" width="113" height="110.5" />
        </clipPath>
      </defs>

      <g clipPath="url(#vantage-emblem-plot)">
        {/* Minor grid, then major. Both inherit, so on light chrome they read
            as light grey rather than disappearing into a fixed silver.

            Horizontals sit above verticals on purpose, and carry roughly twice
            the opacity. They were at .07 and .14 alongside the verticals until
            2026-08-28, which on a dark hero is white at seven percent — present
            in the file and invisible on screen, which is what the operator was
            seeing. On a chart the horizontals are the value reference and the
            verticals are the lighter of the pair, so raising them is also the
            right way round rather than just the louder one. */}
        <g stroke="currentColor" strokeWidth="1.2">
          <path
            d="M43.5 117H156.5M43.5 89H156.5M43.5 62H156.5M43.5 34H156.5"
            opacity=".18"
          />
          <path
            d="M58 20V130.5M86 20V130.5M114 20V130.5M142 20V130.5"
            opacity=".10"
          />
        </g>
        <g stroke="currentColor" strokeWidth="1.5">
          <path d="M43.5 103H156.5M43.5 75H156.5M43.5 48H156.5" opacity=".32" />
          <path d="M72 20V130.5M100 20V130.5M128 20V130.5" opacity=".18" />
        </g>

        {/* Area under the line. Amber at 11% — the fill states the shape, the
            stroke stays the focal thing. */}
        <path
          d="M54 108L72 118L90 84L108 94L126 56L142 36L142 130.5L54 130.5Z"
          fill="var(--color-vantage-amber)"
          opacity=".11"
        />

        {/* Ticks, minor then major, on the baseline and both uprights. */}
        <g stroke="currentColor" strokeWidth="1.6" opacity=".5" strokeLinecap="round">
          <path d="M58 130.5V126M86 130.5V126M114 130.5V126M142 130.5V126" />
          <path d="M43.5 117H48M43.5 89H48M43.5 62H48M43.5 34H48" />
          <path d="M152 117H156.5M152 89H156.5M152 62H156.5M152 34H156.5" />
        </g>
        <g stroke="currentColor" strokeWidth="2.2" opacity=".75" strokeLinecap="round">
          <path d="M72 130.5V123.5M100 130.5V123.5M128 130.5V123.5" />
          <path d="M43.5 103H50.5M43.5 75H50.5M43.5 48H50.5" />
          <path d="M149.5 103H156.5M149.5 75H156.5M149.5 48H156.5" />
        </g>

        {/* The data. */}
        <path
          d="M54 108L72 118L90 84L108 94L126 56L142 36"
          stroke="var(--color-vantage-amber)"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="142"
          cy="36"
          r="8.5"
          stroke="var(--color-vantage-amber)"
          strokeWidth="1.6"
          opacity=".45"
        />
        <circle cx="142" cy="36" r="5" fill="var(--color-vantage-amber)" />
      </g>

      {/* Uprights and crossbar, stem, ground line. */}
      <g stroke="currentColor">
        <path
          d="M40 20V134H160V20"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M100 134V176" strokeWidth="7" />
        <path d="M48 181H152" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <rect x="82" y="173" width="36" height="6" rx="3" fill="currentColor" />
      {/* Two bolts in the plate. Ink, so they read as holes on the dark chrome
          the lockup sits on; on light chrome they match the plate and it reads
          solid, which is the right thing to happen at this size. */}
      <g fill="var(--color-vantage-black)">
        <circle cx="89" cy="176" r="1.4" />
        <circle cx="111" cy="176" r="1.4" />
      </g>
    </svg>
  );
}
