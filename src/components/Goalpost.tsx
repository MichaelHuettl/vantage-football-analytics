/**
 * The brand mark, as SVG.
 *
 * §7 describes it precisely: a goalpost whose crossbar is a chart axis. Drawing
 * it inline rather than shipping the PNG lets the uprights inherit currentColor
 * and the trend line stay amber, so one mark works on light and dark chrome
 * without maintaining two files. The PNG lockups are kept in /public/brand for
 * favicon, OG images, and anywhere the full stacked wordmark is wanted.
 *
 * The same geometry is reused by ChartFrame — that repetition is the point.
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
      viewBox="0 0 100 96"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      {/* Uprights and crossbar: an inverted U. The crossbar is the x-axis. */}
      <path
        d="M8 4 V60 H92 V4"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stem below the crossbar. */}
      <path
        d="M50 60 V90"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* The data. Sits inside the frame, rising left to right. */}
      <path
        d="M22 50 L42 30 L52 38 L78 12"
        stroke="var(--color-vantage-amber)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
