import { POSITIONS } from "./types";

export interface NavItem {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

const POSITION_LABELS: Record<string, string> = {
  QB: "Quarterback",
  RB: "Running back",
  WR: "Wide receiver",
  TE: "Tight end",
  K: "Kicker",
  DST: "Defense / ST",
};

/** The six primary sections of §5, in the order they appear in the brief. */
export const SITE_NAV: NavItem[] = [
  { href: "/rankings", label: "Rankings" },
  {
    href: "/positions",
    label: "Positional Data",
    children: POSITIONS.map((p) => ({
      href: `/positions/${p.toLowerCase()}`,
      label: POSITION_LABELS[p],
    })),
  },
  { href: "/injuries", label: "Injury Database" },
  { href: "/film", label: "Film" },
  { href: "/games", label: "Game Tracker" },
  { href: "/model", label: "Game Prediction Model" },
  // "Fantasy Model" here, "Fantasy Football Model" on the page itself. The nav
  // already shortens where the full name does not fit — the positions dropdown
  // says "Defense / ST" for a section headed "Defense / special teams". At full
  // length this item pushed the bar 59px past the viewport at 1024, which is
  // the exact width the inline bar starts appearing at.
  { href: "/fantasy-model", label: "Fantasy Model" },
  { href: "/news", label: "News" },
];
