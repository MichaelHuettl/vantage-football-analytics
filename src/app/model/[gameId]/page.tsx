import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/PageHeader";
import { FeatureComparison } from "@/components/prediction/FeatureComparison";
import { MatchupHeader } from "@/components/prediction/MatchupHeader";
import { ModelHonesty } from "@/components/prediction/ModelHonesty";
import { SituationalCards } from "@/components/prediction/SituationalCards";
import { PRED_GAMES, PRED_META, getGame } from "@/lib/predictions";

export function generateStaticParams() {
  return PRED_GAMES.map((g) => ({ gameId: g.game_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameId: string }>;
}): Promise<Metadata> {
  const g = getGame((await params).gameId);
  if (!g) return { title: "Game Prediction Model" };
  return {
    title: `${g.away.team} at ${g.home.team} prediction`,
    description: `Model win probability, metric comparison and situational context for ${g.away.team} at ${g.home.team}.`,
  };
}

/**
 * One game, in the order a reader needs it: the prediction, the reason it
 * should be treated carefully, the evidence, the circumstances, then the
 * working.
 *
 * The caveat comes second — after the reader knows what game they are looking
 * at, before they have read a single metric.
 */
export default async function GamePredictionPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const game = getGame((await params).gameId);
  if (!game) notFound();

  return (
    <Container className="py-16 sm:py-24">
      <p className="mb-6">
        <Link href="/model" className="eyebrow hover:underline">
          ← All games
        </Link>
      </p>

      <MatchupHeader game={game} />

      <div className="mt-10">
        <ModelHonesty />
      </div>

      <div className="mt-14">
        <FeatureComparison rows={game.feature_comparison} />
      </div>

      <div className="mt-14">
        <SituationalCards cards={game.situational_context} />
      </div>

      {/* The full working lives on the section's Methodology tab rather than
          being repeated on all sixteen game pages. */}
      <div className="mt-16 border-t pt-6" style={{ borderColor: "var(--border-subtle)" }}>
        <p className="max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
          Every figure here comes from {PRED_META.model_name}, validated{" "}
          {PRED_META.validation}. For how the model is built, what the metrics mean and how it has actually performed,{" "}
          <Link href="/model" className="underline underline-offset-4">
            read the methodology
          </Link>.
        </p>
      </div>
    </Container>
  );
}
