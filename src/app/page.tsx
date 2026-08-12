import Link from "next/link";
import { Container } from "@/components/PageHeader";
import { Goalpost } from "@/components/Goalpost";
import { SITE_NAV } from "@/lib/nav";

const SECTION_BLURBS: Record<string, string> = {
  "/rankings": "Tiered by position and format. Every row opens the chart underneath it.",
  "/positions": "The framework used to evaluate each position, applied to the current player pool.",
  "/injuries": "Practice participation across the week, because the trend is the signal.",
  "/film": "Route concepts and play diagrams, drawn here rather than borrowed.",
  "/games": "Implied team totals, weather, and the designations that move a lineup.",
  "/news": "Headlines tagged to players. Source and timestamp, then a link out.",
};

export default function Home() {
  return (
    <>
      {/* Hero. §7 asks for a thesis rather than a big number and a gradient. */}
      <section
        className="border-b"
        style={{
          background: "var(--surface-inverse)",
          borderColor: "var(--border-inverse)",
        }}
      >
        <Container className="py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p
                className="eyebrow"
                style={{ color: "var(--color-vantage-amber)" }}
              >
                Fantasy football analytics
              </p>
              <h1
                className="mt-4 text-5xl sm:text-7xl leading-[0.9] tracking-wide uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--text-on-inverse)",
                }}
              >
                Rankings are
                <br />a conclusion.
              </h1>
              <p
                className="mt-6 max-w-xl text-lg"
                style={{ color: "var(--color-ink-300)" }}
              >
                Most sites publish the conclusion and ask you to take it on
                faith. This one publishes the opportunity metrics underneath,
                and marks the places where the ranking disagrees with the data.
                Every ranked player links to the chart that justifies his
                position.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/rankings"
                  className="rounded px-5 py-3 text-sm font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    background: "var(--color-vantage-amber)",
                    color: "var(--color-vantage-black)",
                  }}
                >
                  See the rankings
                </Link>
                <Link
                  href="/glossary"
                  className="rounded px-5 py-3 text-sm font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    color: "var(--text-on-inverse)",
                    boxShadow: "inset 0 0 0 1px var(--color-ink-700)",
                  }}
                >
                  How the metrics work
                </Link>
              </div>
            </div>

            {/* The mark at scale, carrying the same structure the charts use.
                Colour is set explicitly here: the uprights are currentColor,
                and this sits on the inverse surface. */}
            <div
              className="hidden lg:flex justify-center"
              style={{ color: "var(--text-on-inverse)" }}
            >
              <Goalpost className="w-full max-w-[280px]" />
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sections
        </h2>
        <ul className="mt-8 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
          {SITE_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex h-full flex-col gap-2 rounded-lg border p-6 transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <span
                  className="text-2xl uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.label}
                </span>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {SECTION_BLURBS[item.href]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
