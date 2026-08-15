import Image from "next/image";
import Link from "next/link";
import { PLAYERS } from "@/lib/content";
import type { Tier } from "@/lib/charts";

/**
 * Resolve a workbook name to a ranked player. The sheet writes "Brown" where
 * the site knows "Chase Brown", so a surname is matched too — scoped to backs,
 * which is what keeps that from picking up a different Brown.
 */
function findBack(name: string) {
  const s = name.trim().toLowerCase();
  const backs = PLAYERS.filter((p) => p.position === "RB");
  return (
    backs.find((p) => p.name.toLowerCase() === s) ??
    backs.find((p) => p.name.toLowerCase().split(" ").slice(1).join(" ") === s)
  );
}

/** A candidate as a headshot over his name, linking to his page. */
function Candidate({ name }: { name: string }) {
  const player = findBack(name);
  const body = (
    <>
      {/* mx-auto: the circle is narrower than its cell, and without this it
          sat left while the name under it was centred. */}
      <span
        className="relative mx-auto block h-14 w-14 overflow-hidden rounded-full"
        style={{ background: "var(--surface-sunken)" }}
      >
        {player ? (
          <Image
            src={`/img/headshots/${player.id}.png`}
            alt=""
            fill
            sizes="56px"
            style={{ objectFit: "cover", objectPosition: "top center" }}
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
            style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
          >
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span className="mt-1.5 block text-center text-xs font-semibold leading-tight">
        {player ? player.name : name}
      </span>
    </>
  );

  return (
    <li className="w-[72px] text-center">
      {player ? (
        <Link href={`/players/${player.id}`} className="block hover:underline">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

/**
 * What a season in each tier has actually looked like.
 *
 * The two columns are the point: the gap between finishing top three and
 * finishing fourth to tenth is small on every line — about thirty carries and
 * twenty-five targets — which is why the tier is decided by opportunity rather
 * than by talent, and why it moves so much year to year.
 *
 * Values come straight from the workbook's own summary rows. Nothing is
 * recomputed here (§11).
 */
export function TierBenchmarks({ tiers }: { tiers: Tier[] }) {
  const keys = [...new Set(tiers.flatMap((t) => Object.keys(t.thresholds)))];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: 460 }}>
        <thead>
          <tr style={{ background: "var(--surface-sunken)" }}>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
            >
              Benchmark
            </th>
            {tiers.map((t) => (
              <th
                key={t.label}
                scope="col"
                className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
              >
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <td className="px-3 py-2">{k}</td>
              {tiers.map((t, i) => (
                <td
                  key={t.label}
                  className="px-3 py-2 text-right font-semibold tnum"
                  style={
                    // Amber marks the tier being aimed at, once, which is what
                    // §7 reserves it for.
                    i === 0
                      ? { color: "var(--color-vantage-amber)" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  {t.thresholds[k] !== undefined ? trim(t.thresholds[k]) : "—"}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t" style={{ borderColor: "var(--border-strong)" }}>
            <td
              className="px-3 py-2 align-top text-xs uppercase tracking-wider"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
            >
              Clearing it now
            </td>
            {tiers.map((t) => (
              <td key={t.label} className="px-3 py-3">
                {t.candidates.length ? (
                  <ul className="flex flex-wrap justify-end gap-x-3 gap-y-3">
                    {t.candidates.map((c) => (
                      <Candidate key={c} name={c} />
                    ))}
                  </ul>
                ) : (
                  <span className="block text-right" style={{ color: "var(--text-muted)" }}>
                    —
                  </span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
