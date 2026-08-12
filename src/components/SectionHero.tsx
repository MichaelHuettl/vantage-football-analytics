import Image from "next/image";

/**
 * The dark band every section opens with.
 *
 * Two sizes. `full` is the home page: a viewport-height photograph carrying the
 * thesis. `band` is every other section: tall enough to establish the image and
 * the title, short enough that the data below it is visible without scrolling.
 *
 * Legibility comes from a directional scrim rather than a flat overlay — a flat
 * black wash at the opacity needed for white text kills the photograph, and the
 * photograph is the reason the band exists.
 */
export function SectionHero({
  image,
  alt = "",
  eyebrow,
  title,
  lede,
  size = "band",
  objectPosition = "center",
  children,
}: {
  image: string;
  alt?: string;
  eyebrow?: string;
  title: React.ReactNode;
  lede?: string;
  size?: "band" | "full";
  objectPosition?: string;
  children?: React.ReactNode;
}) {
  const full = size === "full";

  return (
    <section
      className={`relative isolate overflow-hidden ${
        full ? "min-h-[86vh] flex items-end" : "min-h-[320px] flex items-end"
      }`}
      style={{ background: "var(--color-vantage-black)" }}
    >
      <Image
        src={image}
        alt={alt}
        fill
        priority={full}
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition }}
        className="-z-20"
      />
      <div className={`absolute inset-0 -z-10 ${full ? "scrim" : "scrim-compact"}`} />
      {/* Field rhythm, barely there — it reads as texture, not stripes. */}
      <div className="absolute inset-0 -z-10 yardlines-inverse opacity-25" />
      <div className="absolute inset-0 -z-10 grain" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 pb-12 pt-24">
        {eyebrow && (
          <p className="eyebrow flex items-center gap-2.5 mb-4">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5"
              style={{ background: "var(--color-vantage-amber)" }}
            />
            <span style={{ color: "var(--color-ink-200)" }}>{eyebrow}</span>
          </p>
        )}

        <h1
          className={`uppercase tracking-wide leading-[0.88] ${
            full
              ? "text-6xl sm:text-8xl lg:text-9xl"
              : "text-5xl sm:text-6xl lg:text-7xl"
          }`}
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-vantage-white)",
          }}
        >
          {title}
        </h1>

        {lede && (
          <p
            className="mt-6 max-w-xl text-lg"
            style={{ color: "var(--color-ink-300)" }}
          >
            {lede}
          </p>
        )}

        {children}
      </div>
    </section>
  );
}
