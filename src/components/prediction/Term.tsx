"use client";

import { useState } from "react";

/**
 * A term with its definition attached.
 *
 * The definitions come from the model payload rather than being written here,
 * so what the page says EPA means cannot drift from what the pipeline actually
 * computed.
 *
 * It is a button, not a hover-only tooltip: hover excludes touch and keyboard,
 * and this is the mechanism a casual reader most needs. The text stays readable
 * with the panel closed — the dotted underline is a hint, not a dependency.
 */
export function Term({
  label,
  definition,
}: {
  label: string;
  definition: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="underline decoration-dotted underline-offset-4"
        style={{ textDecorationColor: "var(--text-muted)" }}
      >
        {label}
      </button>
      {open && (
        <span
          role="note"
          className="absolute left-0 top-full z-20 mt-2 block w-72 rounded border p-3 text-sm font-normal normal-case tracking-normal shadow-lg"
          style={{
            background: "var(--surface-page)",
            borderColor: "var(--border-strong)",
            color: "var(--text-secondary)",
          }}
        >
          {definition}
        </span>
      )}
    </span>
  );
}
