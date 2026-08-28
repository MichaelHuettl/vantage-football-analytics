import { Emblem } from "./Emblem";

/**
 * The full stacked lockup: emblem above the name, composed rather than placed.
 *
 * Composed, the mark inherits currentColor, stays sharp at any size, and costs
 * no image request — a placed PNG would carry a baked-in dark plate that shows
 * as a seam over a photograph.
 *
 * This is the one place the detailed emblem is used. It renders at 96px here,
 * where the plot grid and the ticks resolve; the header and footer take the
 * plain Goalpost instead, because at 32px that detail is mud. Both marks crop
 * to the same window, so swapping between them shifts nothing.
 */
export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const lg = size === "lg";

  return (
    /* Centred as a unit — the goalpost sits over the midpoint of the name,
       as it does in the source lockup. `w-fit` keeps the block hugging its
       content so it can still be left-aligned on the page. */
    <div className={`flex w-fit flex-col items-center ${className}`}>
      {/* Sized by height, with the width following: the mark is taller than
          it is wide, so a square box would letterbox it and pad the sides. */}
      <Emblem
        className={lg ? "h-24 w-auto" : "h-14 w-auto"}
        title="Vantage Football Analytics"
      />
      <p
        className={`mt-3 uppercase leading-[0.85] tracking-wide ${
          lg ? "text-5xl sm:text-6xl" : "text-3xl"
        }`}
        style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
      >
        Vantage
      </p>
      {/* The sub-line, flanked by a rule on each side.

          **The rules carry a minimum width, and that is the whole trick.**
          `flex-1` alone gave them zero: the sub-line is tracked out to 0.42em
          and at 240px it plus its gaps already exceeded the 266px block, so
          there was nothing left to distribute and both rules measured 0. A
          floor makes the row the widest thing in the lockup instead, and the
          block — `w-fit` — grows to it. The rules then extend past the name on
          both sides, which is the point of the device.

          Tracking is deliberately not reduced to make room. 0.42em is the
          lockup as the operator set it, and narrowing the sub-line to buy space
          for a decorative rule would be the wrong thing to spend it on.

          The rules inherit `currentColor` at 30%, like the grid inside the
          mark, so one lockup works on light and dark chrome (§7). They are
          `aria-hidden` — this is a rule, not content, and the name is already
          read out by the emblem's label. */}
      <div className={`flex w-full items-center self-stretch ${lg ? "mt-3 gap-4" : "mt-2 gap-2.5"}`}>
        <span
          aria-hidden="true"
          className="h-px flex-1"
          style={{ background: "currentColor", opacity: 0.3, minWidth: lg ? 32 : 20 }}
        />
        {/* Tracked-out type adds trailing space after the final letter, which
            reads as a leftward shift against a centred block. The negative
            margin cancels exactly that, and here it also stops the right-hand
            rule sitting a tracking-unit further out than the left. */}
        <p
          className={`shrink-0 uppercase ${lg ? "text-sm" : "text-micro"}`}
          style={{
            fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
            letterSpacing: lg ? "0.42em" : "0.3em",
            marginRight: lg ? "-0.42em" : "-0.3em",
            fontWeight: 500,
            opacity: 0.75,
          }}
        >
          Football Analytics
        </p>
        <span
          aria-hidden="true"
          className="h-px flex-1"
          style={{ background: "currentColor", opacity: 0.3, minWidth: lg ? 32 : 20 }}
        />
      </div>
    </div>
  );
}
