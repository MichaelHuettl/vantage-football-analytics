import { TeamChip } from "@/components/TeamChip";
import { PositionBadge } from "@/components/PlayerLink";
import type { LiveInjuries } from "@/lib/live-injuries";
import type { Position } from "@/lib/types";

/**
 * The live injury wire, shown beside the hand-authored camp report rather than
 * merged into it.
 *
 * The camp records are reporting: a diagnosis in full, and a timeline only ever
 * with an attribution (§5.3). A wire status is a coarser claim from a different
 * kind of source. Folding one into the other would either overwrite careful
 * prose with "Questionable" or dress a feed status up as reporting, so they sit
 * side by side and the page says which is which.
 *
 * An empty conflicts list is a result, not a gap — it means the hand-authored
 * page currently agrees with the wire, which is worth telling the reader (§8:
 * an empty state is a direction, not an apology).
 */
export function LiveWire({ live }: { live: LiveInjuries }) {
  if (!live.live) {
    return (
      <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
        The wire is unreachable, so this page is showing its own records only.
        {live.failures.length > 0 && (
          <> Sources that did not answer: {live.failures.map((f) => f.name).join(", ")}.</>
        )}
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section>
        <h3 className="eyebrow">Where the wire disagrees with this page</h3>
        {live.conflicts.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Nothing. Every camp record above is consistent with the wire on
            whether the player is available. Checked against {live.wireCount}{" "}
            wire entries.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {live.conflicts.map((c) => (
              <li
                key={c.record.name}
                className="rounded border p-3"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <PositionBadge position={c.record.position as Position} />
                  <span className="font-semibold">{c.record.name}</span>
                  <TeamChip abbr={c.record.team} size="sm" />
                </div>
                <p className="mt-2 text-sm">
                  This page says <strong>{c.record.status}</strong>; the wire has him{" "}
                  <strong>{c.wire.status}</strong>
                  {c.wire.body_part ? ` (${c.wire.body_part})` : ""}.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="eyebrow">On the wire, not yet in the camp report</h3>
        {live.unlisted.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Nothing outstanding. Every fantasy-relevant player carrying a real
            absence already has a record above.
          </p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <th className="py-2 text-left">Player</th>
                <th className="py-2 text-left">Team</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Body part</th>
              </tr>
            </thead>
            <tbody>
              {live.unlisted.map((w) => (
                <tr key={`${w.name}-${w.position}`} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <PositionBadge position={w.position as Position} />
                      {w.name}
                    </span>
                  </td>
                  <td className="py-2">{w.team && <TeamChip abbr={w.team} size="sm" />}</td>
                  <td className="py-2">{w.status}</td>
                  <td className="py-2" style={{ color: "var(--text-muted)" }}>
                    {w.body_part ?? "Undisclosed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {live.headlines.length > 0 && (
        <section>
          <h3 className="eyebrow">Injury headlines</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {live.headlines.map((h) => (
              <li key={h.id} className="text-sm">
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  {h.headline}
                </a>
                <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {h.source}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Wire status from Sleeper&rsquo;s public player endpoint; headlines from Draft
        Sharks&rsquo; news sitemap. Statuses are theirs, not this site&rsquo;s
        prognosis (§5.3).
        {live.ambiguous.length > 0 && (
          <> Not matched, because more than one player shares the name and position:{" "}
            {live.ambiguous.join(", ")}.</>
        )}
      </p>
    </div>
  );
}
