import Link from "next/link";
import { Goalpost } from "./Goalpost";
import { SITE_NAV } from "@/lib/nav";

export function SiteHeader() {
  return (
    <header className="absolute top-0 inset-x-0 z-50">
      {/* The nav sits over whatever photograph a page opens with, and some of
          them are bright at the top — the Vegas board especially. A short
          gradient buys contrast for the links without darkening the image
          anywhere the eye actually rests. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--color-vantage-black) 72%, transparent) 0%, color-mix(in oklab, var(--color-vantage-black) 40%, transparent) 45%, transparent 100%)",
        }}
      />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Below md the six links need their own row — wrapping them beside
            the logo collides with it. */}
        <div className="flex flex-col gap-2 py-4 md:h-20 md:flex-row md:items-center md:gap-6 md:py-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0"
            style={{ color: "var(--color-vantage-white)" }}
          >
            <Goalpost className="h-8 w-auto" title="Vantage" />
            <span
              className="text-2xl leading-none tracking-wide uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Vantage
            </span>
          </Link>

          <nav aria-label="Primary" className="ml-auto hidden xl:block">
            <ul className="flex items-center gap-1">
              {SITE_NAV.map((item) =>
                item.children ? (
                  <li key={item.href} className="relative group">
                    {/* Opens on hover and on keyboard focus anywhere inside,
                        so it works without JavaScript and without trapping
                        tab order. */}
                    <Link href={item.href} className={linkClass} style={linkStyle}>
                      {item.label}
                      <span aria-hidden="true" className="ml-1.5 text-[0.6rem]">
                        ▼
                      </span>
                    </Link>
                    <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      <ul
                        className="min-w-[200px] rounded-lg py-2 backdrop-blur-md"
                        style={{
                          background:
                            "color-mix(in oklab, var(--color-vantage-panel) 94%, transparent)",
                          boxShadow: "inset 0 0 0 1px var(--color-ink-700)",
                        }}
                      >
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="block px-4 py-2 text-sm font-semibold transition-colors hover:text-white"
                              style={{
                                fontFamily: "var(--font-condensed)",
                                color: "var(--color-ink-300)",
                              }}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ) : (
                  <li key={item.href}>
                    <Link href={item.href} className={linkClass} style={linkStyle}>
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          {/* Narrow screens get the same links on their own row rather than a
              menu behind a tap, and the row scrolls sideways rather than
              wrapping or truncating.

              This takes over below `xl`, and it has moved twice for the same
              reason. First below `md`, until the section renames of 2026-08-21
              ("Positions" to "Positional Data", "Injuries" to "Injury
              Database", plus "Game Prediction Model") pushed the bar past the
              viewport between 900px and 1000px. Then below `lg`, until the
              fantasy model added an eighth item and the bar ran flush to the
              edge at 1024 with no margin left. The breakpoint follows the
              labels; an eighth long name is where an inline bar stops being the
              right device below a wide desktop. */}
          <nav aria-label="Primary" className="xl:hidden -mx-4 px-4 overflow-x-auto">
            <ul className="flex gap-x-4">
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block whitespace-nowrap text-xs font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      color: "var(--color-ink-200)",
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

const linkClass =
  "block whitespace-nowrap rounded px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors hover:text-white";

const linkStyle: React.CSSProperties = {
  fontFamily: "var(--font-condensed)",
  color: "var(--color-ink-200)",
};

export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t"
      style={{
        background: "var(--color-vantage-panel)",
        borderColor: "var(--color-ink-800)",
      }}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-14">
        <div className="flex flex-wrap gap-10 justify-between">
          <div className="max-w-sm">
            <div
              className="flex items-center gap-2.5"
              style={{ color: "var(--color-vantage-white)" }}
            >
              <Goalpost className="h-8 w-auto" />
              <span
                className="text-2xl leading-none tracking-wide uppercase"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Vantage
              </span>
            </div>
            <p className="mt-4 text-sm" style={{ color: "var(--color-ink-400)" }}>
              Rankings are a conclusion. This site publishes the argument
              underneath them.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-12 gap-y-2">
              {[...SITE_NAV, { href: "/glossary", label: "Glossary" }].map(
                (item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm hover:underline"
                      style={{ color: "var(--color-ink-400)" }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>

        <div
          className="mt-12 pt-8 border-t"
          style={{ borderColor: "var(--color-ink-800)" }}
        >
          <p className="eyebrow mb-3">Disclaimer</p>
          <div
            className="max-w-4xl space-y-2.5 text-xs leading-relaxed"
            style={{ color: "var(--color-ink-500)" }}
          >
            <p>
              This site is a personal portfolio project, published for
              educational and non-profit purposes only. It is not a commercial
              product, it is not monetised, and it is not for sale.
            </p>
            <p>
              Vantage Football Analytics is not affiliated with, endorsed by,
              sponsored by, or in any way officially connected to the National
              Football League, any NFL team, the NFL Players Association, or any
              of their subsidiaries or affiliates. All NFL team names, player
              names, and related marks are the property of their respective
              owners and are used here for identification and commentary only.
            </p>
            <p>
              Photographs appearing on this site are the property of their
              respective copyright holders and are reproduced here for
              non-commercial, educational, and illustrative use. No claim of
              ownership is made. If you hold rights to an image used here and
              would like it removed, it will be taken down on request.
            </p>
            <p>
              Statistics are derived from publicly available data. Nothing on
              this site is betting advice, medical advice, or a prediction of
              any player&apos;s health or availability.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
