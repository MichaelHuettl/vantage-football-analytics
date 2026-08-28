import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/PageHeader";
import { Wordmark } from "@/components/Wordmark";
import { getRankingList } from "@/lib/content";

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
    blurb: "Tiered by position and format. Every row opens the chart underneath it.",
    image: "/img/players/bijan-robinson.jpg",
    position: "center 22%",
  },
  {
    href: "/positions",
    label: "Positional Data",
    blurb: "The framework used to evaluate each position, applied to the current pool.",
    image: "/img/players/justin-jefferson.jpg",
    position: "center 18%",
  },
  {
    href: "/injuries",
    label: "Injury Database",
    blurb: "Practice participation across the week, because the trend is the signal.",
    image: "/img/players/christian-mccaffrey.jpg",
    position: "center 20%",
  },
  {
    href: "/film",
    label: "Film",
    blurb: "Route concepts and play diagrams, drawn here rather than borrowed.",
    image: "/img/players/jamarr-chase.jpg",
    position: "center 18%",
  },
  {
    href: "/games",
    label: "Game Tracker",
    blurb: "Implied team totals, weather, and the designations that move a lineup.",
    image: "/img/bg/game-tracker.jpg",
    position: "center 35%",
  },
  {
    href: "/model",
    label: "Game Prediction Model",
    blurb: "A win probability for every game, its record, and every call it got wrong.",
    image: "/img/bg/vegas.jpg",
    position: "center",
  },
  {
    href: "/fantasy-model",
    label: "Fantasy Football Model",
    blurb: "PPR projections by position, and how far they beat a three-game average.",
    image: "/img/bg/fantasy-model.jpg",
    position: "center 30%",
  },
  {
    href: "/news",
    label: "News",
    blurb: "Headlines tagged to players. Source and timestamp, then a link out.",
    image: "/img/players/lamar-jackson.jpg",
    position: "center 18%",
  },
];

/**
 * The card count, spelled out, taken from the list rather than typed beside it.
 *
 * It read "Six sections" while there were seven, because adding a card and
 * updating a sentence two hundred lines away are separate acts and the second
 * one gets forgotten. Counting the array is not the kind of derivation §11
 * rules out — there is no data file and no metric here, only this file's own
 * literal.
 */
const NUMBER_WORD = [
  "No", "One", "Two", "Three", "Four", "Five", "Six",
  "Seven", "Eight", "Nine", "Ten",
];
const SECTION_COUNT =
  NUMBER_WORD[SECTION_CARDS.length] ?? String(SECTION_CARDS.length);

export default function Home() {
  const rb = getRankingList("RB");

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
              <div
                className="rise rise-1"
                style={{ color: "var(--color-vantage-white)" }}
              >
                <Wordmark size="lg" />
              </div>

              <h1
                className="rise rise-2 mt-10 uppercase tracking-wide leading-[0.9] text-5xl sm:text-7xl lg:text-8xl max-w-4xl"
                style={{
                  fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)",
                  color: "var(--color-vantage-white)",
                }}
              >
                Rankings are
                <br />a conclusion.
              </h1>

              <p
                className="rise rise-3 mt-7 max-w-xl text-lg"
                style={{ color: "var(--color-ink-300)" }}
              >
                Most sites publish the conclusion and ask you to take it on
                faith. This one publishes the opportunity metrics underneath,
                and marks the places where the ranking disagrees with the data.
                Every ranked player links to the chart that justifies his
                position.
              </p>

              <div className="rise rise-4 mt-9 flex flex-wrap gap-3">
                <Link
                  href="/rankings"
                  className="rounded px-6 py-3.5 text-sm font-bold uppercase tracking-wider transition-transform hover:-translate-y-0.5"
                  style={{
                    fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                    background: "var(--color-vantage-amber)",
                    color: "var(--color-vantage-black)",
                  }}
                >
                  See the rankings
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
                  How the metrics work
                </Link>
              </div>
            </div>

            {/* Latest card. The one thing on the page that changes weekly, so
                it earns a fixed position the reader can learn. */}
            <Link
              href="/rankings?pos=RB&format=ppr"
              className="rise rise-4 group hidden lg:block w-[320px] rounded-lg overflow-hidden backdrop-blur-md transition-transform hover:-translate-y-1"
              style={{
                background: "color-mix(in oklab, var(--color-vantage-panel) 82%, transparent)",
                boxShadow: "inset 0 0 0 1px var(--color-ink-700)",
              }}
            >
              <div className="relative h-40">
                <Image
                  src="/img/players/jahmyr-gibbs.jpg"
                  alt=""
                  fill
                  sizes="320px"
                  style={{ objectFit: "cover", objectPosition: "center 20%" }}
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
                  RB tiers
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--color-ink-400)" }}>
                  Top {rb.entries.length} backs · {rb.updated}
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
        <div className="reveal flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h2
            className="text-4xl sm:text-5xl uppercase tracking-wide leading-none"
            style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
          >
            Where to start
          </h2>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
            {SECTION_COUNT} sections. Each one shows its work.
          </p>
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
            You should be able to audit the argument.
          </h2>
          <p
            className="mt-6 max-w-xl text-lg"
            style={{ color: "var(--color-ink-300)" }}
          >
            Every metric on this site resolves to a one-sentence definition and
            a statement of what a good value looks like. If a number appears on
            a chart and not in the glossary, that is a bug.
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
