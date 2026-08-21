"use client";

import { Children, useState } from "react";

/**
 * A list that starts short and grows on request.
 *
 * Both feeds on the news page are long by design — the archive is the point —
 * but a hundred and fifty items between the reader and the rest of the page is
 * a wall rather than a resource. This shows an opening set and hands over the
 * rest on a click.
 *
 * It takes the rendered items as children rather than the data, so the markup
 * for a headline lives in exactly one place on the server and this only decides
 * how many of them are on screen. Nothing is re-fetched: the items are already
 * in the payload, so revealing them is instant and works with the filters and
 * the auto-refresh without either knowing this exists.
 *
 * The button says how many are left, because "view more" without a number
 * hides whether the next click ends the list or opens another hundred. It also
 * agrees with that number: a filtered feed really does reach "View 1 more
 * headline", and the plural there is the kind of small wrongness that makes a
 * page feel unmaintained.
 */
export function ShowMore({
  children,
  initial = 20,
  step = 40,
  noun,
  nounPlural,
  listClassName,
  listStyle,
}: {
  children: React.ReactNode;
  /** How many to show before the first click. */
  initial?: number;
  /** How many more each click reveals. */
  step?: number;
  /** Singular noun completing "View 1 more …". */
  noun: string;
  /** Plural form, when adding an "s" is not right. */
  nounPlural?: string;
  listClassName?: string;
  listStyle?: React.CSSProperties;
}) {
  const all = Children.toArray(children);
  const [shown, setShown] = useState(initial);
  const visible = all.slice(0, shown);
  const remaining = all.length - visible.length;

  return (
    <>
      {/* The button sits outside the list: a <button> is not a valid child of
          a <ul>, and a screen reader should not hear it announced as an item. */}
      <ul className={listClassName} style={listStyle}>
        {visible}
      </ul>

      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + step)}
            className="inline-block rounded px-4 py-2 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-condensed)",
              color: "var(--text-secondary)",
              boxShadow: "inset 0 0 0 1px var(--border-strong)",
            }}
          >
            View {remaining} more {remaining === 1 ? noun : nounPlural ?? `${noun}s`}
          </button>
        </div>
      )}
    </>
  );
}
