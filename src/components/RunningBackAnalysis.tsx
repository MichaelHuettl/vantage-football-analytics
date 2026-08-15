import { ChartFigure } from "@/components/ChartFigure";
import { RankTable } from "@/components/RankTable";
import { ScatterChart } from "@/components/ScatterChart";
import { TierBenchmarks } from "@/components/TierBenchmarks";
import { RB_CHARTS, RB_SEASON, RB_SOURCE } from "@/lib/charts";
import { teamByName } from "@/lib/teams";

const abbrOf = (team: string) => teamByName(team)?.abbr;

/**
 * The running back page.
 *
 * Six charts, each followed by what it actually says. §5.2 asks for a takeaway
 * a reader can state after five seconds; the caption does that, and the
 * paragraph under it does the arguing — which is the whole pitch (§1).
 *
 * No goalpost frame on any of them. It is the signature element (§7) and it
 * belongs on one chart per page at most, so with six here it would read as a
 * border rather than a mark; the operator asked for it off.
 */
export function RunningBackAnalysis() {
  const { hvt, contact, routes, historic, opportunity, targets } = RB_CHARTS;

  const shareMax = Math.max(...opportunity.rows.map((r) => r.share));
  const shareMin = Math.min(...opportunity.rows.map((r) => r.share));
  const tgtMax = Math.max(...targets.rows.map((r) => r.targets));
  const tgtMin = Math.min(...targets.rows.map((r) => r.targets));
  const band = (v: number, lo: number, hi: number) => (hi === lo ? 0 : (v - lo) / (hi - lo));

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The evidence
        </h2>
        <span className="eyebrow">{RB_SEASON} production</span>
      </div>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Everything below is last season, not a projection of this one. That is
        the point: a projection is an opinion, and these are the numbers an
        opinion has to survive.
      </p>

      {/* ============================ 1. HVT ============================ */}
      <Block
        n={1}
        title="High-value touches decide the position"
        chart={
          <ChartFigure caption={hvt.caption} source={axis(hvt)}>
            <ScatterChart
              series={hvt}
              height={720}
              regions={{
                tl: "scoring without the volume",
                tr: "workhorses",
                bl: "neither",
                br: "volume without the points",
              }}
            />
          </ChartFigure>
        }
      >
        <p>
          The relationship is about as tight as anything in fantasy football,
          which is the first thing worth saying: points follow high-value
          touches, so the argument about a back is really an argument about how
          many he will get. McCaffrey sits alone at{" "}
          <Stat>{hvt.points.find((p) => p.name === "C. McCaffrey")?.x.toFixed(1)}</Stat>{" "}
          per game — nearly three times the league median of{" "}
          <Stat>{hvt.x_median.toFixed(1)}</Stat>.
        </p>
        <p>
          The useful names are the ones off the line. A back sitting below it is
          being given the work and not converting it, which is usually offense
          quality rather than the back. Above it, he is scoring on less, which is
          efficiency that regresses. Neither is a buy on its own; both are a
          question worth asking before you spend a second-round pick.
        </p>
      </Block>

      {/* ========================== 2. Contact ========================== */}
      <Block
        n={2}
        title="Separating the line from the back"
        chart={
          <ChartFigure caption={contact.caption} source={axis(contact)}>
            <ScatterChart
              series={contact}
              height={720}
              regions={{
                tl: "talent, no blocking",
                tr: "everything working",
                bl: "struggling on both",
                br: "blocking, no burst",
              }}
            />
          </ChartFigure>
        }
      >
        <p>
          Yards before contact is the offensive line&rsquo;s point-of-attack
          blocking.
          Yards after contact is the back. Splitting them stops you crediting a
          runner for his line, or blaming him for it — and the pairs inside one
          backfield are where it gets useful.
        </p>
        <p>
          Gibbs and Montgomery run behind the same line and post the same yards
          after contact; Gibbs simply gets more space, because Montgomery is the
          one taking the heavy boxes and the short yardage. Walker and
          Charbonnet is the same story with the roles reversed. When two backs
          share a line, the difference in yards before contact is a difference
          in role, not ability — and role is the thing that changes in
          September.
        </p>
      </Block>

      {/* ========================== 3. Routes =========================== */}
      <Block
        n={3}
        title="On the field is not the same as targeted"
        chart={
          <ChartFigure caption={routes.caption} source={axis(routes)}>
            <ScatterChart
              series={routes}
              height={720}
              regions={{
                tl: "targeted on limited routes",
                tr: "genuine receiving backs",
                bl: "not in the plan",
                br: "decoys",
              }}
            />
          </ChartFigure>
        }
      >
        <p>
          Route participation says a back is out there on passing downs. Targets
          per route run says the quarterback is looking at him. The bottom-right
          corner is the trap: high participation, no targets — a back running
          routes as a decoy, whose receiving usage looks real in a box score and
          produces nothing.
        </p>
        <p>
          McCaffrey and Gibbs clear the field on both axes, which is why they
          price the way they do. Further down, the Seattle backfield draws few
          targets either way, which reads as system preference rather than a
          depth chart to bet on.
        </p>
      </Block>

      {/* ======================== 4. Historic =========================== */}
      <Block
        n={4}
        title="What a top-three season has looked like"
        chart={
          <ChartFigure caption={historic.caption} source={axis(historic)}>
            <ScatterChart
              series={historic}
              height={720}
              band={historic.band}
              bandLabel="middle half of the tier"
              regions={{
                tl: "receiving backs",
                tr: "both, and almost nobody",
                bl: "did it on efficiency",
                br: "pure runners",
              }}
            />
          </ChartFigure>
        }
      >
        <p>
          Twenty-seven top-three finishes since 2017, plotted as carries against
          targets. There is no single profile. Henry&rsquo;s 2020 is{" "}
          <Stat>378</Stat> carries and <Stat>31</Stat> targets; McCaffrey&rsquo;s
          2019 is <Stat>287</Stat> and <Stat>142</Stat>. Both finished top three,
          and nothing about the first tells you how to value the second.
        </p>
        <p>
          What the box says is that the middle half of these seasons ran between{" "}
          <Stat>{historic.band.x0}</Stat> and <Stat>{historic.band.x1}</Stat>{" "}
          carries with <Stat>{historic.band.y0}</Stat> to{" "}
          <Stat>{historic.band.y1}</Stat> targets. That is the honest bar: not a
          number a back has to hit, but a volume of work that has to exist
          somewhere in his role before the finish is even available to him. Backs
          get drafted on talent and finish on touches.
        </p>

        <div className="mt-2">
          <TierBenchmarks tiers={historic.tiers} />
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            The two tiers are closer than the draft price suggests — roughly
            thirty carries and twenty-five targets separate a top-three season
            from a fourth-to-tenth one. That gap is one injury, or one change of
            coordinator, wide.
          </p>
        </div>
      </Block>

      {/* ======================= 5. Opportunity ========================= */}
      <Block
        n={5}
        title="Who actually owns a backfield"
        chart={
          <figure className="my-8">
            <RankTable
              rows={opportunity.rows}
              valueLabel="Opp. share"
              format={(r) => `${(r.share * 100).toFixed(1)}%`}
              intensity={(r) => band(r.share, shareMin, shareMax)}
              teamAbbr={abbrOf}
            />
            <figcaption className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              {opportunity.caption}
            </figcaption>
          </figure>
        }
      >
        <p>
          Every team&rsquo;s most-used back, by his share of the carries and
          targets that went to the backfield. The spread is the story:{" "}
          <Stat>{(opportunity.rows[0].share * 100).toFixed(0)}%</Stat> at the top
          against <Stat>{(opportunity.rows[31].share * 100).toFixed(0)}%</Stat> at
          the bottom. The top of this table is where bell-cow backs live, and
          there are far fewer of them than there are picks in the first two
          rounds.
        </p>
        <p>
          Read the bottom half as a warning rather than a ranking. A back at
          forty percent of his own backfield is one injury or one hot hand from
          being a committee piece, and no amount of talent in the abstract fixes
          a snap count.
        </p>
      </Block>

      {/* ========================= 6. Targets =========================== */}
      <Block
        n={6}
        title="The usage that survives a bad script"
        chart={
          <figure className="my-8">
            <RankTable
              rows={targets.rows}
              valueLabel="Targets"
              format={(r) => String(Math.round(r.targets))}
              intensity={(r) => band(r.targets, tgtMin, tgtMax)}
              teamAbbr={abbrOf}
            />
            <figcaption className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              {targets.caption}
              {targets.note && (
                <span className="mt-1 block text-xs" style={{ color: "var(--text-muted)" }}>
                  {targets.note}
                </span>
              )}
            </figcaption>
          </figure>
        }
      >
        <p>
          Carries depend on the scoreboard. Targets mostly do not — a back who
          catches passes keeps scoring in the games his team is losing, which is
          exactly when a rushing workload disappears. That is why{" "}
          <Stat>{targets.rows[0].name}</Stat> at{" "}
          <Stat>{Math.round(targets.rows[0].targets)}</Stat> targets has a floor
          that a pure runner on the same volume does not.
        </p>
        <p>
          Compare this order against the one above it. A back near the top of
          both owns his backfield in every game state. A back high on opportunity
          share but low here is a game-script bet, and worth less in a league
          that starts a flex.
        </p>
      </Block>

      <p className="mt-10 text-sm" style={{ color: "var(--text-muted)" }}>
        {RB_SOURCE} {routes.note}
      </p>
    </section>
  );
}

const axis = (s: { x_label: string; y_label: string }) =>
  `x: ${s.x_label} · y: ${s.y_label}`;

function Stat({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold tnum">{children}</span>;
}

/** A numbered chart and the argument that goes with it. */
function Block({
  n,
  title,
  chart,
  children,
}: {
  n: number;
  title: string;
  chart: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <h3 className="flex items-baseline gap-3">
        <span
          className="text-sm tnum"
          style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
        >
          {String(n).padStart(2, "0")}
        </span>
        <span
          className="text-2xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </span>
      </h3>
      {chart}
      <div className="flex max-w-3xl flex-col gap-4 leading-relaxed">{children}</div>
    </section>
  );
}
