import { Goalpost } from "./Goalpost";

/**
 * The full stacked lockup — goalpost above the name — as it appears in
 * brand/Name + Logo.png, composed rather than placed.
 *
 * The source PNG has a baked-in dark plate, which would show as a seam over a
 * photograph. Composing it means the mark inherits currentColor, stays sharp at
 * any size, and costs no image request.
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
      <Goalpost
        className={lg ? "h-20 w-20" : "h-12 w-12"}
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
        className={`mt-2 uppercase ${lg ? "text-sm" : "text-[0.625rem]"}`}
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
