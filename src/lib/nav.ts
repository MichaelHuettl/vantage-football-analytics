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
    label: "Positions",
    children: POSITIONS.map((p) => ({
      href: `/positions/${p.toLowerCase()}`,
      label: POSITION_LABELS[p],
    })),
  },
  { href: "/injuries", label: "Injuries" },
  { href: "/film", label: "Film" },
  { href: "/games", label: "Games" },
  { href: "/news", label: "News" },
];
