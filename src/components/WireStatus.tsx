import type { WireStatus } from "@/lib/injury-feed";

/**
 * A live designation from the wire, as a pill.
 *
 * Deliberately a different shape from `CampStatusPill`: outlined rather than
 * filled. The two sit in adjacent columns on the tracker and they are not the
 * same kind of claim — one is a feed's coarse designation, the other is written
 * reporting with a diagnosis behind it. Making them look identical would invite
 * a reader to treat them as interchangeable, which is the confusion this page
 * exists to avoid (§8).
 *
 * Colour is not the only carrier: the designation is written in the pill (§7).
 */
const TONE: Record<WireStatus, string> = {
  IR: "var(--color-status-out)",
  PUP: "var(--color-status-out)",
  DNR: "var(--color-status-out)",
  Sus: "var(--color-status-out)",
  Out: "var(--color-status-out)",
  Doubtful: "var(--color-status-doubtful)",
  Questionable: "var(--color-status-questionable)",
  NA: "var(--text-muted)",
};

export function WireStatusPill({ status }: { status: WireStatus }) {
  const tone = TONE[status] ?? "var(--text-muted)";
  return (
    <span
      className="inline-flex h-6 items-center whitespace-nowrap rounded px-2 text-xs font-bold uppercase tracking-wide"
      style={{
        fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
        color: tone,
        boxShadow: `inset 0 0 0 1px ${tone}`,
      }}
    >
      {status}
    </span>
  );
}
