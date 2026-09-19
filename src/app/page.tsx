import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/PageHeader";
import { Wordmark } from "@/components/Wordmark";
import { AUTHOR, CREDIT } from "@/lib/site";

const SECTION_CARDS: {
  href: string;
  label: string;
  blurb: string;
  image: string;
  position?: string;
}[] = [
  {
    href: "/rankings",
    label: "Rankings",
    blurb: "2026 Points Per Reception (PPR) in-season and redraft Fantasy Football Player Rankings",
    image: "/img/players/bijan-robinson.jpg",
    position: "center 22%",
  },
  {
    href: "/positions",
    label: "Positional Data",
    blurb: "Statistical Evaluation of Quarterback, Running Back, Wide Receiver, Tight End, Team Defense, and Kicker Positions",
    image: "/img/players/justin-jefferson.jpg",
    position: "center 18%",
  },
  {
    href: "/injuries",
    label: "Injury Database",
    blurb: "Live fantasy football player injury tracker for all 32 teams",
    image: "/img/players/christian-mccaffrey.jpg",
    position: "center 20%",
  },
  {
    href: "/film",
    label: "Film",
    blurb: "Team Film Breakdowns and Log (Coming Soon)",
    image: "/img/players/jamarr-chase.jpg",
    position: "center 18%",
  },
  {
    href: "/games",
    label: "Game Tracker",
    blurb: "Weekly NFL game overviews, betting odds, weather reports, and more",
    image: "/img/bg/game-tracker.jpg",
    position: "center 35%",
  },
  {
    href: "/model",
    label: "Game Prediction Model",
    blurb: "Statistical model trained on NFL historical data for predicting individual game outcomes",
    image: "/img/bg/vegas.jpg",
    position: "center",
  },
  {
    href: "/fantasy-model",
    label: "Fantasy Football Model",
    blurb: "Statistical model trained on NFL historical data for predicting fantasy football value, scoring, and individual statistics",
    image: "/img/bg/fantasy-model.jpg",
    position: "center 30%",
  },
  {
    href: "/news",
    label: "News",
    blurb: "Breaking news and headlines from training camp, free agency, trades, practices, games, and more",
    image: "/img/players/lamar-jackson.jpg",
    position: "center 18%",
  },
];

export default function Home() {

  return (
    <>
      {/* ---------------------------------------------------------------
          Hero. Full-bleed field, the lockup, and the thesis.
          --------------------------------------------------------------- */}
      <section
        className="relative isolate min-h-[92vh] flex items-end overflow-hidden"
        style={{ background: "var(--color-vantage-black)" }}
      >
        <Image
          src="/img/bg/lambeau.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 42%" }}
          className="-z-20"
        />
        <div className="absolute inset-0 -z-10 scrim" />
        <div className="absolute inset-0 -z-10 yardlines-inverse opacity-20" />

        <Container className="relative pb-16 pt-28 w-full">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_auto] lg:items-end">
            <div>
              {/* The author, set inside the lockup's own fitted column so it
                  centres under the mark like a signature, rather than hanging
                  flush left under a centred composition. The first thing on
                  the site names who made it. Muted verb, white name, and no
                  amber, which §7 keeps for the focal thing on a screen. */}
              <div
                className="rise rise-1 flex w-fit flex-col items-center"
                style={{ color: "var(--color-vantage-white)" }}
              >
                <Wordmark size="lg" />
                <p
                  className="mt-5 text-sm font-semibold uppercase"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontStretch: "var(--stretch-condensed)",
                    letterSpacing: "var(--text-eyebrow--letter-spacing)",
                    color: "var(--color-ink-300)",
                  }}
                >
                  {CREDIT}{" "}
                  <span style={{ color: "var(--color-vantage-white)" }}>{AUTHOR}</span>
                </p>
              </div>

              <h1
                className="rise rise-2 mt-10 uppercase tracking-wide leading-[0.9] text-5xl sm:text-7xl lg:text-8xl max-w-4xl"
                style={{
                  fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)",
                  color: "var(--color-vantage-white)",
                }}
              >
                What actually
                <br />wins.
              </h1>

              <p
                className="rise rise-3 mt-7 max-w-xl text-lg"
                style={{ color: "var(--color-ink-300)" }}
              >
                Not what the box score says won. The opportunity, efficiency
                and situation underneath it, measured across every season there
                is data for, and shown where they disagree with the ranking.
              </p>

              <div className="rise rise-4 mt-9 flex flex-wrap gap-3">
                <Link
                  href="/positions"
                  className="rounded px-6 py-3.5 text-sm font-bold uppercase tracking-wider transition-transform hover:-translate-y-0.5"
                  style={{
                    fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                    background: "var(--color-vantage-amber)",
                    color: "var(--color-vantage-black)",
                  }}
                >
                  See the statistics
                </Link>
                <Link
                  href="/glossary"
                  className="rounded px-6 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-white/10"
                  style={{
                    fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                    color: "var(--color-vantage-white)",
                    boxShadow: "inset 0 0 0 1px var(--color-ink-600)",
                  }}
                >
                  The Metrics and Data
                </Link>
              </div>
            </div>

            {/* Latest card. The one thing on the page that moves on its own, so
                it earns a fixed position the reader can learn.

                It pointed at the RB draft board until 2026-08-28, which was the
                stalest thing on the site — a list dated 2026-08-06 under a
                heading saying "latest update". The injury tracker is the honest
                occupant: it pulls at request time and is the only section that
                is current without anyone running a command.

                **It states that it is live rather than printing a count.**
                Fetching the tracker here would give a row number, and it would
                also drag the home page out of static rendering and put a
                fourteen-megabyte Sleeper pull in front of the site's most
                visited route. The card's job is to send a reader somewhere, not
                to be the tracker. */}
            <Link
              href="/injuries"
              className="rise rise-4 group hidden lg:block w-[320px] rounded-lg overflow-hidden backdrop-blur-md transition-transform hover:-translate-y-1"
              style={{
                background: "color-mix(in oklab, var(--color-vantage-panel) 82%, transparent)",
                boxShadow: "inset 0 0 0 1px var(--color-ink-700)",
              }}
            >
              <div className="relative h-40">
                <Image
                  src="/img/bg/injury-database.jpg"
                  alt=""
                  fill
                  sizes="320px"
                  style={{ objectFit: "cover", objectPosition: "center 32%" }}
                />
              </div>
              <div className="p-5">
                <p className="eyebrow" style={{ color: "var(--color-vantage-amber)" }}>
                  Latest update
                </p>
                <p
                  className="mt-2 text-2xl uppercase tracking-wide leading-none"
                  style={{
                    fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)",
                    color: "var(--color-vantage-white)",
                  }}
                >
                  Injury Database
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--color-ink-400)" }}>
                  Live wire · All 32 teams
                </p>
              </div>
            </Link>
          </div>
        </Container>
      </section>

      <div className="yard-rule" />

      {/* ---------------------------------------------------------------
          Sections. Cards carry imagery so the grid reads as a board of
          entry points rather than six empty rectangles.
          --------------------------------------------------------------- */}
      <Container className="py-16 sm:py-24" id="sections">
        <div className="reveal">
          <h2
            className="text-4xl sm:text-5xl uppercase tracking-wide leading-none"
            style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
          >
            Contents
          </h2>
        </div>

        {/* A load-time stagger rather than a scroll reveal. Whether a card is
            on screen when the page loads decides how much of a view-timeline
            reveal it ever plays, so the first row behaved differently from the
            rest depending on viewport height. A delay off the index is the
            same for every card wherever it sits. */}
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTION_CARDS.map((card, i) => (
            <li
              key={card.href}
              className="rise"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <Link
                href={card.href}
                className="glare group relative flex h-64 flex-col justify-end overflow-hidden rounded-lg p-6 isolate"
                style={{ background: "var(--color-vantage-black)" }}
              >
                <Image
                  src={card.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  style={{
                    objectFit: "cover",
                    objectPosition: card.position ?? "center",
                  }}
                  className="-z-20 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 -z-10 scrim-band" />

                <span
                  className="text-3xl uppercase tracking-wide leading-none"
                  style={{
                    fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)",
                    color: "var(--color-vantage-white)",
                  }}
                >
                  {card.label}
                </span>
                <span
                  className="mt-2 text-sm"
                  style={{ color: "var(--color-ink-300)" }}
                >
                  {card.blurb}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute top-5 right-5 h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "var(--color-vantage-amber)" }}
                />
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {/* ---------------------------------------------------------------
          Closing band. A coach at the board is the most literal picture of
          showing your work there is, which is this section's whole claim.
          Split rather than full-bleed: the frame keeps the photograph sharp,
          and the change of rhythm stops the page reading as one hero after
          another.
          --------------------------------------------------------------- */}
      <section
        id="method"
        className="relative isolate overflow-hidden scroll-mt-20"
        style={{ background: "var(--color-vantage-black)" }}
      >
        <Image
          src="/img/bg/whiteboard.jpg"
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 45%" }}
          className="-z-20"
        />
        <div className="absolute inset-0 -z-10 scrim-band" />
        <div className="absolute inset-0 -z-10 grain" />

        <Container className="relative py-24 sm:py-32">
          <p className="eyebrow flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5"
              style={{ background: "var(--color-vantage-amber)" }}
            />
            <span style={{ color: "var(--color-ink-200)" }}>The method</span>
          </p>
          <h2
            className="reveal mt-5 max-w-3xl text-4xl sm:text-6xl uppercase tracking-wide leading-[0.9]"
            style={{
              fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)",
              color: "var(--color-vantage-white)",
            }}
          >
            No metric without an explanation.
          </h2>
          <p
            className="mt-6 max-w-xl text-lg"
            style={{ color: "var(--color-ink-300)" }}
          >
            Advanced analytics are easy to publish and hard to read. Every
            number on this site resolves to a glossary entry giving its
            definition, its source and what a good value looks like. The data
            stays advanced and the presentation does the simplifying, so any
            fan can follow what is driving a result without a statistics
            background.
          </p>
          <Link
            href="/glossary"
            className="mt-8 inline-block rounded px-6 py-3.5 text-sm font-bold uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
              background: "var(--color-vantage-amber)",
              color: "var(--color-vantage-black)",
            }}
          >
            Read the glossary
          </Link>
        </Container>
      </section>
    </>
  );
}
