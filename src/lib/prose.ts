/**
 * Em dash removal for prose this repo does not author.
 *
 * The prediction pipeline's payloads are *copied* into `src/data/`, so their
 * wording is not ours to edit at source: an edit to the copy is undone the next
 * time it is re-exported. The house style has no em dashes, so they are
 * rewritten where the payload enters, the same place and for the same reason
 * that `canonTeams` rewrites `LA` into `LAR`.
 *
 * The replacement is chosen from what follows the dash rather than applied
 * flat, because one punctuation mark does not fit every use:
 *
 *  - an independent clause becomes its own sentence
 *  - a conjunction or a relative pronoun takes a comma
 *  - a figure takes a colon, which is how a stat line reads
 *  - anything else takes a comma, which is right for an appositive
 *
 * A *pair* of dashes around an aside is handled first, since that is a
 * parenthetical and both marks have to become commas together.
 */
const CLAUSE = /\s*—\s*(it|they|that|this|he|she|there)\s+(is|are|was|were|comes|came|has|have|had|does|do|did)\b/gi;
const JOIN = /\s*—\s*(and|but|so|though|yet|which|whose|where|because|while)\b/gi;
const FIGURE = /\s*—\s*(?=[0-9])/g;
const PAIRED = /\s*—\s*([^—]{1,60}?)\s*—\s*/g;
const REST = /\s*—\s*/g;

export function normalizeDashes(text: string): string {
  return text
    .replace(PAIRED, (_m, inner) => `, ${inner}, `)
    .replace(CLAUSE, (_m, subj: string, verb: string) =>
      `. ${subj[0].toUpperCase()}${subj.slice(1)} ${verb}`)
    .replace(JOIN, ", $1")
    .replace(FIGURE, ": ")
    .replace(REST, ", ");
}

/**
 * British spellings in copied prose.
 *
 * The site's copy is American (docs/STATE.md), and the prediction pipeline
 * writes "defence". Same reasoning as the dashes: their file, our page.
 */
const SPELLINGS: [RegExp, string][] = [
  [/\bdefence\b/g, "defense"],
  [/\bDefence\b/g, "Defense"],
  [/\boffence\b/g, "offense"],
  [/\bOffence\b/g, "Offense"],
  [/\bneighbour/g, "neighbor"],
  [/\btravelled\b/g, "traveled"],
];

/** Every string in a copied payload, rewritten. Keys are left alone. */
export function normalizeProse<T>(node: T): T {
  if (typeof node === "string") {
    let s = normalizeDashes(node);
    for (const [rx, to] of SPELLINGS) s = s.replace(rx, to);
    return s as unknown as T;
  }
  if (Array.isArray(node)) return node.map(normalizeProse) as unknown as T;
  if (node !== null && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = normalizeProse(v);
    }
    return out as T;
  }
  return node;
}
