import sampleFile from "@/data/film-sample.json";

/**
 * One worked play, in the format the film room will use in season.
 *
 * This is the operator's own PowerPoint template rebuilt as SVG rather than a
 * screenshot of it. Every coordinate is lifted from the slide, so the alignment
 * is his; what changes is that it now scales, themes with the page, carries
 * real labels for a screen reader, and weighs a few kilobytes instead of
 * shipping a rasterized slide. The field art underneath is the template's own
 * image, which is why the panel matches: the slide's background and
 * `--color-vantage-panel` are within a shade of each other.
 *
 * **It is labeled a sample and it has to stay labeled.** The page it sits on
 * was emptied precisely because the concepts on it were not the operator's
 * work; putting an example back at the top only holds up while a reader can
 * tell at a glance that it is an example of the format rather than a finding
 * the site is standing behind.
 *
 * The one deliberate departure from the template: player markers are stroked at
 * 0.16 units rather than the slide's 0.75pt. At slide scale that hairline is
 * fine; at the width this renders on a page it lands under a pixel and the
 * circles fade out. Routes keep the template's weight exactly.
 */

interface Marker {
  id: string;
  shape: "circle" | "square";
  x: number;
  y: number;
  role: string;
}

interface Defender {
  label: string;
  x: number;
  y: number;
  role: string;
}

interface Route {
  label: string;
  emphasis?: boolean;
  points?: [number, number][];
  path?: string;
}

interface SampleFile {
  updated: string;
  source: string;
  data: {
    title: string;
    field_image: string;
    view: { width: number; height: number };
    situation: { label: string; value: string }[];
    offense: Marker[];
    defense: Defender[];
    routes: Route[];
  };
}

const file = sampleFile as unknown as SampleFile;
const play = file.data;

/** Marker size, from the template: 2.32 units across. */
const R = 1.16;
const MARKER_STROKE = 0.16;
const ROUTE_STROKE = 0.31;

export function FilmSample() {
  const { width, height } = play.view;

  return (
    <figure className="m-0">
      {/* Rounded on top only: the situation strip continues the same block
          underneath, and rounding both edges leaves a seam between them. */}
      <div
        className="overflow-hidden rounded-t-lg"
        style={{ background: "var(--color-vantage-panel)" }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block w-full h-auto"
          role="img"
          aria-label={`${play.title}. Offense in shotgun with five linemen; defense in ${
            play.situation.find((s) => s.label === "DEF")?.value ?? "coverage"
          }. Routes: ${play.routes.map((r) => r.label).join("; ")}.`}
        >
          {/* The template's own field. `preserveAspectRatio="none"` because the
              slide stretches it to the play area rather than fitting it, and
              matching the template matters more here than the art's own ratio. */}
          <image
            href={play.field_image}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />

          {/* Routes under the players, so a line never crosses a marker. */}
          <g
            fill="none"
            stroke="var(--color-vantage-amber)"
            strokeWidth={ROUTE_STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {play.routes.map((route) => (
              <path
                key={route.label}
                d={
                  route.path ??
                  (route.points ?? [])
                    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
                    .join(" ")
                }
              />
            ))}
          </g>

          {/* Offense: circles, with the center squared off as the template has it. */}
          <g
            fill="none"
            stroke="var(--color-vantage-amber)"
            strokeWidth={MARKER_STROKE}
          >
            {play.offense.map((m) =>
              m.shape === "square" ? (
                <rect
                  key={m.id}
                  x={m.x - R}
                  y={m.y - R}
                  width={R * 2}
                  height={R * 2}
                />
              ) : (
                <circle key={m.id} cx={m.x} cy={m.y} r={R} />
              ),
            )}
          </g>

          {/* Defense: letters rather than shapes, which is the convention the
              template uses and the one a coach's copy would use. */}
          <g
            fill="var(--color-vantage-white)"
            style={{ fontFamily: "var(--font-condensed)" }}
            fontSize={2.5}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {play.defense.map((d, i) => (
              <text key={`${d.label}-${i}`} x={d.x} y={d.y}>
                {d.label}
              </text>
            ))}
          </g>
        </svg>
      </div>

      {/* The slide's footer strip, as text rather than as part of the picture —
          it is the situation the play has to be read against, and it should be
          selectable, wrappable and legible at any width. */}
      <figcaption className="mt-0">
        <dl
          className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-b-lg px-4 py-4 sm:grid-cols-3"
          style={{ background: "var(--surface-sunken)" }}
        >
          {play.situation.map((s) => (
            <div key={s.label}>
              <dt className="eyebrow">{s.label}</dt>
              <dd className="mt-0.5 text-sm tnum">{s.value}</dd>
            </div>
          ))}
        </dl>
      </figcaption>
    </figure>
  );
}
