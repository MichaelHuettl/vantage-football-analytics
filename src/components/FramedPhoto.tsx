import Image from "next/image";

/**
 * A photograph in a contained frame, with a caption.
 *
 * Used where the source resolution can't carry a full-bleed band — an 884px
 * archival frame stretched across 1440px is visibly soft, but the same file at
 * ~640px is sharp. Constraining it is the honest fix, and the split layouts it
 * enables break up a page of full-bleed heroes anyway.
 *
 * Deliberately not the goalpost frame: §7 reserves that for the featured chart
 * on a page, and spending it on decorative photography is exactly the wallpaper
 * it warns against.
 */
export function FramedPhoto({
  src,
  alt,
  caption,
  ratio = "16 / 9",
  priority = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  ratio?: string;
  priority?: boolean;
}) {
  return (
    <figure className="w-full">
      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{
          aspectRatio: ratio,
          background: "var(--color-vantage-black)",
          boxShadow: "inset 0 0 0 1px var(--color-ink-700)",
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 620px"
          style={{ objectFit: "cover" }}
        />
      </div>
      {caption && (
        <figcaption
          className="mt-3 text-xs"
          style={{ color: "var(--color-ink-400)" }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
