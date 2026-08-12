import type { DiagramPath } from "@/lib/types";

/**
 * A play diagram, drawn as SVG from coordinates.
 *
 * §2 rules out hosting broadcast or All-22 footage, and §5.4 makes self-drawn
 * diagrams the primary film content for exactly that reason: these are original
 * work, they scale, they carry real labels for screen readers, and they theme
 * with the rest of the site.
 *
 * Field coordinates are yards — x across (0–53.3), y downfield from the line of
 * scrimmage, negative behind it. The viewBox flips y so downfield is up.
 */
const FIELD_W = 53.3;
const Y_MIN = -8;
const Y_MAX = 28;

const KIND_STYLE: Record<DiagramPath["kind"], { dash?: string; width: number }> = {
  route: { width: 0.7 },
  block: { width: 0.7, dash: "1.2 1" },
  motion: { width: 0.55, dash: "0.6 0.9" },
  coverage: { width: 0.55, dash: "2 1.2" },
};

export function PlayDiagram({
  paths,
  title,
  className = "",
}: {
  paths: DiagramPath[];
  title: string;
  className?: string;
}) {
  const height = Y_MAX - Y_MIN;

  return (
    <figure className={className}>
      <svg
        viewBox={`0 ${-Y_MAX} ${FIELD_W} ${height}`}
        className="w-full h-auto rounded-lg"
        style={{ background: "var(--color-vantage-panel)" }}
        role="img"
        aria-label={`${title}. ${paths.map((p) => p.label).join(", ")}.`}
      >
        {/* Yard lines every 5, matching the site's structural rhythm. */}
        {Array.from({ length: 8 }, (_, i) => {
          const y = -(i * 5);
          if (y < -Y_MAX || y > -Y_MIN) return null;
          return (
            <line
              key={i}
              x1={0}
              x2={FIELD_W}
              y1={y}
              y2={y}
              stroke="var(--color-ink-800)"
              strokeWidth={0.12}
            />
          );
        })}

        {/* Hash marks. */}
        {Array.from({ length: 19 }, (_, i) => {
          const y = -(i * 2 - Y_MIN * 0 - 8);
          return [17.8, 35.5].map((x) => (
            <line
              key={`${i}-${x}`}
              x1={x - 0.4}
              x2={x + 0.4}
              y1={y}
              y2={y}
              stroke="var(--color-ink-800)"
              strokeWidth={0.1}
            />
          ));
        })}

        {/* Line of scrimmage. */}
        <line
          x1={0}
          x2={FIELD_W}
          y1={0}
          y2={0}
          stroke="var(--color-ink-500)"
          strokeWidth={0.22}
        />

        {paths.map((path) => {
          const style = KIND_STYLE[path.kind];
          const stroke = path.emphasis
            ? "var(--color-vantage-amber)"
            : "var(--color-ink-300)";
          const d = path.points
            .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${-y}`)
            .join(" ");
          const [sx, sy] = path.points[0];
          const [ex, ey] = path.points[path.points.length - 1];

          return (
            <g key={path.label}>
              <path
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={style.width}
                strokeDasharray={style.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Start: where the player lines up. */}
              <circle cx={sx} cy={-sy} r={0.8} fill={stroke} />
              {/* End: an arrowhead would be finicky at this scale, so the
                  terminus is marked with an open ring instead. */}
              <circle
                cx={ex}
                cy={-ey}
                r={0.7}
                fill="var(--color-vantage-panel)"
                stroke={stroke}
                strokeWidth={0.35}
              />
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {paths.map((p) => (
          <span
            key={p.label}
            className="inline-flex items-center gap-1.5 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4 rounded"
              style={{
                background: p.emphasis
                  ? "var(--color-vantage-amber)"
                  : "var(--color-ink-400)",
              }}
            />
            {p.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
