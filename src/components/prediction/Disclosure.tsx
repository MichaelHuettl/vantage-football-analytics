"use client";

import { useId, useState } from "react";

/**
 * A collapsible section. The site had no such primitive, so this is the first.
 *
 * `<details>` would be less code, but it cannot be styled consistently across
 * browsers and gives no control over the marker, so the open state is held in
 * React and the button carries `aria-expanded` and `aria-controls` itself.
 *
 * Defaults to open on the methodology, because a page whose argument is "here
 * is how the number was reached" should not hide the answer behind a click.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="eyebrow">{summary}</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none transition-transform"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(45deg)" : "none",
          }}
        >
          +
        </span>
      </button>
      <div id={id} hidden={!open} className="pb-6">
        {children}
      </div>
    </div>
  );
}
