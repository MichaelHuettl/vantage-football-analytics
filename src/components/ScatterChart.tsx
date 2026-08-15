import type { ScatterPoint, ScatterSeries } from "@/lib/charts";

/**
 * A scatter drawn from data, in the page.
 *
 * Everything §5.2 asks a chart to do is structural here rather than optional:
 * median crosshairs that split the field into four readable regions, direct
 * labels instead of a legend, and region labels naming what each corner means.
 *
 * It computes nothing. Medians, extents and which points carry a name all
 * arrive precomputed from `scripts/curated/rb_charts.py`, because a median is
 * a metric and §11 does not let a component work one out. What happens here is
 * projection — turning a value into a pixel — which is drawing, not analysis.
 *
 * SVG rather than a chart library: it is a few dozen circles, it inherits the
 * theme through tokens, it needs no client JavaScript, and it stays sharp in
 * the screenshot §7 cares about.
 */
export function ScatterChart({
  series,
  regions,
  highlight,
  band,
  bandLabel,
  height = 460,
}: {
  series: ScatterSeries;
  /** Corner labels, clockwise from top-left. §5.2 wants labelled regions. */
  regions?: { tl?: string; tr?: string; br?: string; bl?: string };
  /** One player to mark in amber — §7 reserves it for the focal point. */
  highlight?: string;
  /**
   * An interquartile box in data units. Drawn behind the points as the shape
   * the middle half of the distribution occupies — on the historic chart it is
   * the answer to the question, so it is the one thing that should be visible
   * before any individual name is read.
   */
  band?: { x0: number; x1: number; y0: number; y1: number };
  bandLabel?: string;
  height?: number;
}) {
  const W = 900;
  const H = height;
  const M = { top: 26, right: 26, bottom: 52, left: 62 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;

  // A little headroom so points never sit on the frame.
  const pad = (lo: number, hi: number) => {
    const gap = (hi - lo) || 1;
    return [lo - gap * 0.08, hi + gap * 0.08] as const;
  };
  const [x0, x1] = pad(series.x_min, series.x_max);
  const [y0, y1] = pad(series.y_min, series.y_max);

  const px = (v: number) => M.left + ((v - x0) / (x1 - x0)) * iw;
  const py = (v: number) => M.top + ih - ((v - y0) / (y1 - y0)) * ih;

  const mx = px(series.x_median);
  const my = py(series.y_median);

  const fmt = (v: number) =>
    Math.abs(v) < 1 && v !== 0 ? v.toFixed(2).replace(/^0/, ".") : v.toFixed(1);

  /*
   * Place the names.
   *
   * Fourteen labels on forty-eight points collide — five pairs overlapped on
   * the HVT chart before this existed, and an unreadable name is worse than no
   * name (§5.2). Each candidate gets four positions tried in order: right,
   * left, above, below. The first that clears everything already placed wins;
   * if none do, the name is dropped and the dot stays.
   *
   * Most extreme first, using the rank the pipeline assigned, so a crowded
   * middle never costs us McCaffrey's name.
   */
  const CH = 6.1; // approximate advance width of the condensed face at 12px
  const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const placed: {
    p: ScatterPoint; lx: number; ly: number; anchor: "start" | "end";
  }[] = [];
  const dropped: ScatterPoint[] = [];

  const labelled = series.points
    .filter((p) => p.label)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  for (const p of labelled) {
    const cx = px(p.x);
    const cy = py(p.y);
    const w = p.name.length * CH;
    const options: { lx: number; ly: number; anchor: "start" | "end" }[] = [
      { lx: cx + 8, ly: cy + 3.5, anchor: "start" },
      { lx: cx - 8, ly: cy + 3.5, anchor: "end" },
      { lx: cx + 8, ly: cy - 9, anchor: "start" },
      { lx: cx + 8, ly: cy + 16, anchor: "start" },
    ];
    let done = false;
    for (const o of options) {
      const x0 = o.anchor === "start" ? o.lx : o.lx - w;
      const box = { x0, x1: x0 + w, y0: o.ly - 9, y1: o.ly + 3 };
      // Stay inside the plot, and clear of every name already drawn.
      if (box.x0 < M.left || box.x1 > M.left + iw) continue;
      if (box.y0 < M.top || box.y1 > M.top + ih) continue;
      if (boxes.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0))
        continue;
      boxes.push(box);
      placed.push({ p, ...o });
      done = true;
      break;
    }
    if (!done) dropped.push(p);
  }

  return (
    /*
     * The chart scrolls inside its frame rather than shrinking to fit.
     *
     * A fixed viewBox scaled into 320px renders 12px type at about four
     * pixels. Below the floor width the chart scrolls sideways within its own
     * container — the same bargain the tables already make, and the one §7
     * allows: the element scrolls, the page does not.
     */
    <div className="overflow-x-auto">
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      style={{ height: "auto", minWidth: 640 }}
      role="img"
      aria-label={`${series.y_label} against ${series.x_label}. ${series.caption}`}
    >
      {/* The interquartile box, behind everything else. */}
      {band && (
        <>
          <rect
            x={px(band.x0)}
            y={py(band.y1)}
            width={px(band.x1) - px(band.x0)}
            height={py(band.y0) - py(band.y1)}
            fill="var(--color-vantage-amber)"
            fillOpacity="0.1"
            stroke="var(--color-vantage-amber)"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          {bandLabel && (
            <text
              x={px(band.x0) + 6}
              y={py(band.y1) - 6}
              style={{ fontFamily: "var(--font-condensed)", fontSize: 11, letterSpacing: ".08em" }}
              fill="var(--text-secondary)"
            >
              {bandLabel.toUpperCase()}
            </text>
          )}
        </>
      )}

      {/* Median crosshairs. Dashed so they read as reference, not data. */}
      <line
        x1={mx} y1={M.top} x2={mx} y2={M.top + ih}
        stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 4"
      />
      <line
        x1={M.left} y1={my} x2={M.left + iw} y2={my}
        stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 4"
      />
      <text
        x={mx + 5} y={M.top + 11}
        style={{ fontFamily: "var(--font-condensed)", fontSize: 11 }}
        fill="var(--text-muted)"
      >
        median {fmt(series.x_median)}
      </text>
      <text
        x={M.left + 5} y={my - 5}
        style={{ fontFamily: "var(--font-condensed)", fontSize: 11 }}
        fill="var(--text-muted)"
      >
        median {fmt(series.y_median)}
      </text>

      {/* Region labels: the corners are the point of a scatter like this. */}
      {regions?.tl && (
        <RegionLabel x={M.left + 8} y={M.top + 30} anchor="start" text={regions.tl} />
      )}
      {regions?.tr && (
        <RegionLabel x={M.left + iw - 8} y={M.top + 30} anchor="end" text={regions.tr} />
      )}
      {regions?.bl && (
        <RegionLabel x={M.left + 8} y={M.top + ih - 10} anchor="start" text={regions.bl} />
      )}
      {regions?.br && (
        <RegionLabel x={M.left + iw - 8} y={M.top + ih - 10} anchor="end" text={regions.br} />
      )}

      {/* Axis ticks: just the extremes and the median, so the frame stays clean. */}
      {[series.x_min, series.x_median, series.x_max].map((v, i) => (
        <text
          key={`xt${i}`} x={px(v)} y={M.top + ih + 20} textAnchor="middle"
          style={{ fontFamily: "var(--font-condensed)", fontSize: 11 }}
          fill="var(--text-muted)"
        >
          {fmt(v)}
        </text>
      ))}
      {[series.y_min, series.y_median, series.y_max].map((v, i) => (
        <text
          key={`yt${i}`} x={M.left - 8} y={py(v) + 4} textAnchor="end"
          style={{ fontFamily: "var(--font-condensed)", fontSize: 11 }}
          fill="var(--text-muted)"
        >
          {fmt(v)}
        </text>
      ))}

      <text
        x={M.left + iw / 2} y={H - 12} textAnchor="middle"
        style={{ fontFamily: "var(--font-condensed)", fontSize: 12, letterSpacing: ".06em" }}
        fill="var(--text-secondary)"
      >
        {series.x_label.toUpperCase()}
      </text>
      <text
        x={-(M.top + ih / 2)} y={16} textAnchor="middle" transform="rotate(-90)"
        style={{ fontFamily: "var(--font-condensed)", fontSize: 12, letterSpacing: ".06em" }}
        fill="var(--text-secondary)"
      >
        {series.y_label.toUpperCase()}
      </text>

      {/* Unlabelled points first, so a named point is never hidden under one. */}
      {series.points.filter((p) => !p.label).map((p) => (
        <circle
          key={p.name} cx={px(p.x)} cy={py(p.y)} r="4"
          fill="var(--text-muted)" fillOpacity="0.5"
        />
      ))}
      {placed.map(({ p, lx, ly, anchor }) => {
        const on = p.name === highlight;
        return (
          <g key={p.name}>
            <circle
              cx={px(p.x)} cy={py(p.y)} r={on ? 6 : 4.5}
              fill={on ? "var(--color-vantage-amber)" : "var(--text-primary)"}
            />
            <text
              x={lx} y={ly} textAnchor={anchor}
              style={{ fontFamily: "var(--font-condensed)", fontSize: 12 }}
              fill={on ? "var(--color-vantage-amber)" : "var(--text-primary)"}
            >
              {p.name}
            </text>
          </g>
        );
      })}
      {/* A point whose name could not be placed without landing on another
          still gets its dot — it is data, and dropping it would change the
          shape of the distribution to save a word. */}
      {dropped.map((p) => (
        <circle
          key={p.name} cx={px(p.x)} cy={py(p.y)} r="4.5"
          fill="var(--text-primary)"
        />
      ))}
    </svg>
    </div>
  );
}

function RegionLabel({
  x, y, anchor, text,
}: {
  x: number; y: number; anchor: "start" | "end"; text: string;
}) {
  return (
    <text
      x={x} y={y} textAnchor={anchor}
      style={{ fontFamily: "var(--font-condensed)", fontSize: 11, letterSpacing: ".08em" }}
      fill="var(--text-muted)"
    >
      {text.toUpperCase()}
    </text>
  );
}
