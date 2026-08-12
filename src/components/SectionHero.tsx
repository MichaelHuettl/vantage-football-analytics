import Image from "next/image";

/**
 * The dark band every section opens with.
 *
 * Three sizes:
 *
 * - `full`   the home page: a viewport-height photograph carrying the thesis.
 * - `tall`   for bands whose photograph has a human subject. A 3:2 frame in a
 *            320px band at desktop width shows barely a third of the image and
 *            decapitates anyone in it; this height keeps the majority of the
 *            frame visible.
 * - `band`   for wide scenes and textures, where a tight horizontal slice loses
 *            nothing and the data below stays close to the fold.
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
  size?: "band" | "tall" | "full";
  objectPosition?: string;
  children?: React.ReactNode;
}) {
  const full = size === "full";
  const tall = size === "tall";

  const height = full
    ? "min-h-[86vh]"
    : tall
      ? "min-h-[540px] lg:min-h-[640px]"
      : "min-h-[320px]";

  return (
    <section
      className={`relative isolate overflow-hidden flex items-end ${height}`}
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
      {/* A tall band has room for the full gradient curve; a short one sits
          entirely in its dark end and needs the gentler ramp. */}
      <div
        className={`absolute inset-0 -z-10 ${full || tall ? "scrim" : "scrim-compact"}`}
      />
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
              : tall
                ? "text-5xl sm:text-7xl lg:text-8xl"
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
