import { Callout } from "../Callout";
import { MARKET, PRED_PERF } from "@/lib/predictions";

/**
 * The caveat the pipeline ships with its own numbers, printed where it cannot
 * be missed.
 *
 * The payload carries `honest_caveat` as a field, which is a deliberate choice
 * by whoever built the model: they measured that the thing disagrees with the
 * market to its cost and wrote the warning into the data rather than leaving it
 * to whoever built the UI. Burying that in a footer would waste the gesture.
 *
 * This is also why the page has no "edge", "value" or "pick" affordance. When
 * the model fades the market it has been right 42% of the time; a control
 * inviting a reader to act on that gap would be pointing them at the one signal
 * measured to be negative.
 */
export function ModelHonesty() {
  return (
    <Callout as="aside" label="Read this before the numbers">
      <p className="max-w-3xl">{PRED_PERF.honest_caveat}</p>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Measured out of sample: the market called {(MARKET.vegas.accuracy * 100).toFixed(1)}% of
        games correctly against this model&rsquo;s {(MARKET.model.accuracy * 100).toFixed(1)}%.
        Where the two disagree, the market has been the better guide.
      </p>
    </Callout>
  );
}
