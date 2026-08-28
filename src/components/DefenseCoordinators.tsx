import { TeamChip } from "@/components/TeamChip";
import { Team } from "@/components/DefenseData";
import { DEFENSE } from "@/lib/defense";

/**
 * Coordinator changes.
 *
 * The one section on this page about people rather than plays, and the only
 * forward-looking evidence in the sheet — every other block is last season.
 * A hire's record is printed in full rather than summarised: the whole value of
 * "2021-2022 Eagles DC, 2022 2nd rated total defense" is the specifics.
 */
export function DefenseCoordinators() {
  const { coordinators, inherited, dc_note, dc_outlook } = DEFENSE;

  if (!coordinators.length) return null;

  return (
    <section className="mt-16">
      <h2
        className="text-3xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
      >
        Coordinator changes
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        {coordinators.length} defenses hired a new coordinator. Scheme carries further than personnel at this position. A unit keeps most of its players and changes how it plays, so this is the part of the offseason
        most likely to move a defense a tier in either direction.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 720 }}>
          <thead>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <Th className="text-left">Hire</Th>
              <Th className="text-left">Track record</Th>
            </tr>
          </thead>
          <tbody>
            {coordinators.map((c) => (
              <tr key={c.name} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="px-3 py-2.5 align-top whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    {c.abbr && <TeamChip abbr={c.abbr} size="sm" />}
                    <span className="font-semibold">{c.name}</span>
                  </span>
                </td>
                <td
                  className="px-3 py-2.5 align-top"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {c.record ?? "n/a"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inherited.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {inherited.map((b, i) => (
            <div
              key={b.label}
              className="rounded-lg border p-4"
              style={{
                borderColor: i === 0 ? "var(--color-vantage-amber)" : "var(--border-subtle)",
              }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                  color: i === 0 ? "var(--color-vantage-amber)" : "var(--text-muted)",
                }}
              >
                {b.label}
              </h3>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {b.entries.map((e) => (
                  <li key={e.team} className="flex items-center gap-2">
                    <Team team={{ name: e.team, abbr: e.abbr }} />
                    {e.coordinator && (
                      <span style={{ color: "var(--text-muted)" }}>{e.coordinator}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {dc_note && (
        <p className="mt-5 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
          {dc_note}
        </p>
      )}

      {(dc_outlook.improve.length > 0 || dc_outlook.regress.length > 0) && (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Outlook
            label="Strong improvement chances"
            items={dc_outlook.improve}
            focus
          />
          <Outlook label="Possible regression" items={dc_outlook.regress} />
        </div>
      )}
    </section>
  );
}

function Outlook({
  label,
  items,
  focus = false,
}: {
  label: string;
  items: string[];
  focus?: boolean;
}) {
  return (
    <div
      className="rounded-lg border p-5"
      style={{
        borderColor: focus ? "var(--color-vantage-amber)" : "var(--border-subtle)",
      }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
          color: focus ? "var(--color-vantage-amber)" : "var(--text-muted)",
        }}
      >
        {label}
      </h3>
      {items.length ? (
        <ul className="mt-3 flex flex-col gap-3 text-sm">
          {items.map((t) => (
            <li key={t} style={{ color: "var(--text-secondary)" }}>
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          Nothing listed.
        </p>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-xs font-bold uppercase tracking-wider ${className}`}
      style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
