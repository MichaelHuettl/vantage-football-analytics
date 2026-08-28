import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The share card, drawn once and reused by every route's `opengraph-image`.
 *
 * §7 says the thing that makes a Vantage chart recognisable in a screenshot on
 * Twitter is the single highest-leverage design decision on this site. Until
 * 2026-08-26 the site had no `og:image` and no `twitter:card` at all, so a
 * shared link rendered as a bare URL and none of that leverage existed.
 *
 * Brand values are literals here and that is not a §7 breach. This renders
 * through satori, not the browser: there is no stylesheet, no `:root`, and
 * therefore no custom properties to resolve. `globals.css` is still the source
 * — these are copied from it, and the constants below exist so the copy is in
 * one place rather than in nine route files.
 */
const BLACK = "#0f1318";
const WHITE = "#ffffff";
const AMBER = "#ef9f27";
const INK_300 = "#b0b9c0";
const INK_700 = "#333c46";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * The mark, as a data URI. Satori renders `<img>` reliably and nested `<svg>`
 * children only partly, so the goalpost goes in as an image rather than as
 * markup. Same geometry as Goalpost.tsx, with the two inherited colours
 * resolved: nothing here inherits anything.
 */
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="35 15 130 170" fill="none">
<path d="M54 108L72 118L90 84L108 94L126 56L142 38" stroke="${AMBER}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="142" cy="38" r="7" fill="${AMBER}"/>
<g stroke="${WHITE}">
<path d="M40 20V134H160V20" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M100 134V178" stroke-width="8.5"/>
<path d="M52 182H148" stroke-width="4" stroke-linecap="round"/>
</g>
<rect x="84" y="173" width="32" height="7" rx="3.5" fill="${WHITE}"/>
</svg>`;
const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

/** Read once per process, not once per card. */
let fonts: { display: Buffer; condensed: Buffer } | null = null;
async function loadFonts() {
  if (fonts) return fonts;
  const dir = join(process.cwd(), "assets", "fonts");
  // Static instances cut from Bricolage's variable file at the coordinates
  // the site uses — wght 800 / wdth 78 / opsz 96 for display, wght 600 /
  // wdth 84 / opsz 14 for the kicker — so a share card matches the page it
  // came from. satori renders a variable font at its default instance and
  // ignores the weight it is handed, which would have put a 400 on every card.
  // opsz has to be pinned for the same reason: the browser applies that axis
  // automatically from font-size, and satori does not.
  const [display, condensed] = await Promise.all([
    readFile(join(dir, "Bricolage-Display.ttf")),
    readFile(join(dir, "Bricolage-Condensed.ttf")),
  ]);
  fonts = { display, condensed };
  return fonts;
}

/**
 * @param title    The headline, in Bricolage Display. Kept short: this is read
 *                 size in a timeline, not at 1200px.
 * @param kicker   The small tracked-out line above it, naming the section.
 * @param footnote Optional supporting line, for a page with a number worth
 *                 leading on.
 */
export async function shareCard({
  title,
  kicker = "Vantage Football Analytics",
  footnote,
}: {
  title: string;
  kicker?: string;
  footnote?: string;
}) {
  const { display, condensed } = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BLACK,
          padding: 72,
          position: "relative",
        }}
      >
        {/* The yard lines, the site's own field motif. Drawn as elements
            rather than a repeating-linear-gradient: satori flattens a
            repeating gradient into a single blended fill, which produced no
            stripes *and* silently lifted the background off the brand black
            to #1e242a. Caught by sampling the rendered PNG, not by looking at
            it — at this size the difference is invisible until you measure. */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <div
            key={n}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: n * 120,
              width: 1,
              background: INK_700,
              opacity: 0.55,
            }}
          />
        ))}
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_URI} width={78} height={102} alt="" />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* The same amber square that marks a callout. One amber element
                on the card, as on a page (§7). */}
            <div style={{ width: 18, height: 18, background: AMBER }} />
            <div
              style={{
                marginLeft: 16,
                fontFamily: "Bricolage Condensed",
                fontSize: 26,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: INK_300,
              }}
            >
              {kicker}
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              fontFamily: "Bricolage Display",
              fontSize: title.length > 34 ? 84 : 108,
              lineHeight: 1.02,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: WHITE,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>

          {footnote && (
            <div
              style={{
                marginTop: 26,
                fontFamily: "Bricolage Condensed",
                fontSize: 30,
                letterSpacing: 1,
                color: INK_300,
                maxWidth: 900,
              }}
            >
              {footnote}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Bricolage Display", data: display, style: "normal", weight: 800 },
        { name: "Bricolage Condensed", data: condensed, style: "normal", weight: 600 },
      ],
    },
  );
}
