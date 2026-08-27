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
        style={{ fontFamily: "var(--font-display)" }}
      >
        Vantage
      </p>
      {/* Tracked-out type adds trailing space after the final letter, which
          reads as a leftward shift against a centred block. The negative
          margin cancels exactly that. */}
      <p
        className={`mt-2 uppercase ${lg ? "text-sm" : "text-micro"}`}
        style={{
          fontFamily: "var(--font-condensed)",
          letterSpacing: lg ? "0.42em" : "0.3em",
          marginRight: lg ? "-0.42em" : "-0.3em",
          fontWeight: 500,
          opacity: 0.75,
        }}
      >
        Football Analytics
      </p>
    </div>
  );
}
