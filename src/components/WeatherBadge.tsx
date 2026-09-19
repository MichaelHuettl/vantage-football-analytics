import { weatherApplies } from "@/lib/games";
import type { Game } from "@/lib/types";

/**
 * Weather for one game, or the reason there isn't any.
 *
 * Three states, and they mean different things: a roofed game where weather is
 * genuinely not a factor, an open game whose forecast has not been pulled yet,
 * and an actual forecast. Collapsing the first two into one blank would tell a
 * reader nothing is coming when for half the slate nothing ever is (§4.3).
 *
 * The roofed state has a third wording since the tracker went live: a
 * retractable roof the weather source expects closed. It says "expected"
 * because the call is made on game day, and it matters because the source
 * still prints the outdoor forecast for those games — Atlanta at 85°F with
 * thunderstorms, played indoors.
 */
export function WeatherBadge({ game }: { game: Game }) {
  if (!weatherApplies(game)) {
    return (
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        {game.roof === "dome"
          ? "Fixed roof"
          : game.roof_closed
            ? "Roof expected closed"
            : "Roof closed"}
        : weather is not a factor
      </span>
    );
  }

  if (!game.weather) {
    return (
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        Forecast within a week of kickoff
      </span>
    );
  }

  const { temp_f, wind_mph, wind_dir, precip_pct, summary } = game.weather;
  return (
    <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      <Reading value={`${temp_f}°F`} label="temp" />
      <Reading value={`${wind_mph} mph${wind_dir ? ` ${wind_dir}` : ""}`} label="wind" />
      {/* Printed only when the source gives one. A missing chance of rain is
          not a 0% chance, and printing 0% would claim it is. */}
      {precip_pct !== undefined && <Reading value={`${precip_pct}%`} label="precip" />}
      <span style={{ color: "var(--text-secondary)" }}>{summary}</span>
    </span>
  );
}

function Reading({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-semibold tnum">{value}</span>
      <span
        className="text-xs uppercase tracking-wider"
        style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
      >
        {label}
      </span>
    </span>
  );
}
