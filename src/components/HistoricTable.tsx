import type { HistoricTable as Data } from "@/lib/charts";

/**
 * Every top-three season since 2017, all thirteen columns, with the
 * distribution as a footer.
 *
 * A table rather than a chart because the question here is not "what shape is
 * this" — it is "what did these seasons actually look like", and thirteen
 * measures do not fit on two axes. The scatter it replaces could only ever
 * show two of them.
 *
 * Emphasis is read from the data, not decided here (§11). The pipeline marks
 * each cell against its own column's quartiles, with the sense already flipped
 * for the two rank columns so that "top" always means good.
 */
export function HistoricTable({ data }: { data: Data }) {
  const { columns, seasons, distribution } = data;
  const summaryRows: [string, string][] = [
    ["median", "Median"],
    ["p25", "25th"],
    ["p75", "75th"],
    ["min", "Min"],
    ["max", "Max"],
  ];

  return (
    <>
      {/* Only the table scrolls. The key sits outside that container so it is
          readable on a phone without dragging it into view. */}
      <div className="overflow-x-auto">
      <table className="w-full text-sm tnum" style={{ minWidth: 940 }}>
        <thead>
          <tr style={{ background: "var(--surface-sunken)" }}>
            <Th className="text-left">Season</Th>
            <Th className="text-left">Back</Th>
            {columns.map((c) => (
              <Th key={c.key} className="text-right">
                {c.header}
              </Th>
            ))}
          </tr>
        </thead>

        <tbody>
          {seasons.map((s, i) => {
            const newYear = i === 0 || seasons[i - 1].season !== s.season;
            return (
              <tr
                key={`${s.season}-${s.name}`}
                style={{
                  borderTop: newYear
                    ? "1px solid var(--border-strong)"
                    : "1px solid var(--border-subtle)",
                }}
              >
                <td
                  className="px-2 py-1.5"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    color: newYear ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {newYear ? s.season : ""}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 font-semibold">
                  {s.name}
                </td>
                {columns.map((c) => {
                  const v = s[c.key] as number | undefined;
                  const mark = s[`${c.key}_mark`] as string | undefined;
                  const best = s[`${c.key}_best`] as boolean | undefined;
                  const extreme = s[`${c.key}_extreme`] as boolean | undefined;
                  return (
                    <td
                      key={c.key}
                      className="px-2 py-1.5 text-right"
                      style={{
                        // Amber is the single best value in the column across
                        // nine seasons — twelve cells in the whole table, which
                        // is what §7 reserves it for.
                        color: best
                          ? "var(--color-vantage-amber)"
                          : mark === "bottom"
                            ? "var(--text-muted)"
                            : "var(--text-primary)",
                        fontWeight: best || mark === "top" ? 700 : 400,
                        background:
                          mark === "top" && !best
                            ? "color-mix(in oklab, var(--color-ink-500) 12%, transparent)"
                            : undefined,
                        textDecoration: extreme ? "underline" : undefined,
                        textUnderlineOffset: extreme ? "3px" : undefined,
                      }}
                    >
                      {v ?? "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>

        {/* The distribution stays with the rows it describes. Reading a season
            against the median is the entire point of showing 27 of them. */}
        <tfoot>
          {summaryRows.map(([key, label], i) => (
            <tr
              key={key}
              style={{
                borderTop:
                  i === 0 ? "2px solid var(--text-primary)" : "1px solid var(--border-subtle)",
                background: "var(--surface-sunken)",
              }}
            >
              <td
                className="px-2 py-1.5 text-xs uppercase tracking-wider"
                colSpan={2}
                style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
              >
                {label}
              </td>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="px-2 py-1.5 text-right"
                  style={{
                    color:
                      key === "median" ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: key === "median" ? 700 : 400,
                  }}
                >
                  {distribution[key]?.[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
      </div>

      <Key />
    </>
  );
}

/**
 * What the emphasis means.
 *
 * Each swatch is rendered in the style it describes rather than named, so the
 * key cannot drift out of step with the table — if the styling changes and
 * this is not updated, the swatch changes with it and the mismatch is visible
 * rather than silent.
 *
 * Note that bold and the grey ground are one state, not two: a top-quarter
 * value gets both. Listing them separately would imply a distinction the table
 * does not make.
 */
function Key() {
  return (
    <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-xs">
      <Item
        sample="129"
        style={{ color: "var(--color-vantage-amber)", fontWeight: 700 }}
      >
        best in that column, all 27 seasons
      </Item>
      <Item
        sample="102"
        style={{
          fontWeight: 700,
          background: "color-mix(in oklab, var(--color-ink-500) 12%, transparent)",
        }}
      >
        top quarter of that column — the good end, so a <em>low</em> number
        under Off. rank and O-line
      </Item>
      <Item sample="31" style={{ color: "var(--text-muted)" }}>
        bottom quarter of that column
      </Item>
      <Item
        sample="29"
        style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}
      >
        youngest and oldest season in the sample
      </Item>
    </dl>
  );
}

function Item({
  sample,
  style,
  children,
}: {
  sample: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="rounded px-1.5 py-0.5 tnum" style={style}>
        {sample}
      </dt>
      <dd style={{ color: "var(--text-secondary)" }}>{children}</dd>
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
      className={`whitespace-nowrap px-2 py-2 text-xs font-bold uppercase tracking-wider ${className}`}
      style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
