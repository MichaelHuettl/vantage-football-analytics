import Image from "next/image";

/**
 * The dark band every section page opens with.
 *
 * One height, deliberately. Every category should present its photograph at
 * the same scale so the sections read as siblings, and a 3:2 frame needs this
 * much room — a shorter band shows barely a third of the image and decapitates
 * anyone in it. At 1440px roughly two-thirds of a 3:2 photograph is visible;
 * on a phone, effectively all of it.
 *
 * The home page keeps its own taller hero — it is the landing page, not a
 * category.
 *
 * Legibility comes from a directional scrim rather than a flat overlay: a flat
 * black wash at the opacity needed for white text kills the photograph, and the
 * photograph is the reason the band exists.
 */
export function SectionHero({
  image,
  alt = "",
  eyebrow,
  title,
  lede,
  objectPosition = "center",
  children,
}: {
  image: string;
  alt?: string;
  eyebrow?: string;
  title: React.ReactNode;
  lede?: string;
  objectPosition?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className="relative isolate flex min-h-[540px] items-end overflow-hidden lg:min-h-[640px]"
      style={{ background: "var(--color-vantage-black)" }}
    >
      <Image
        src={image}
        alt={alt}
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition }}
        className="-z-20"
      />
      <div className="absolute inset-0 -z-10 scrim" />
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
          className="text-5xl sm:text-7xl lg:text-8xl uppercase tracking-wide leading-[0.9]"
          style={{
            fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)",
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
