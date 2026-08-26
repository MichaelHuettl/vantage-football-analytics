"use client";

import Link from "next/link";
import { useState } from "react";
import { Drawer } from "vaul";
import { SITE_NAV } from "@/lib/nav";
import { Goalpost } from "./Goalpost";

/**
 * The primary navigation as a bottom sheet, below `xl`.
 *
 * Replaces the sideways-scrolling link row that used to live here, at the
 * operator's request on 2026-08-26. Two things about that are worth knowing
 * before anyone changes it back or forward again.
 *
 * **It reverses a decision the old comment recorded.** That row existed
 * deliberately, "rather than a menu behind a tap", and its breakpoint had
 * already moved twice as section names grew. The argument for it was that a
 * visible link is one tap and a hidden one is two. The argument against is that
 * eight items with names like "Game Prediction Model" only fit by scrolling
 * sideways, and a nav you have to discover by dragging is not really visible
 * either. The operator made the call; this comment is here so the next person
 * knows it was a call and not an oversight.
 *
 * **The dropdown children come with it.** On the desktop bar, Positional Data
 * opens six position pages on hover. A hover menu has no meaning on a touch
 * screen, so they are listed inline here, indented under their parent, rather
 * than hidden behind a second tap.
 *
 * Closing on navigation is manual. The drawer has no idea the route changed,
 * and without this the panel stays open over the page you just asked for.
 */
export function NavDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger
        className="ml-auto flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider xl:hidden"
        style={{
          fontFamily: "var(--font-condensed)",
          color: "var(--color-vantage-white)",
          boxShadow: "inset 0 0 0 1px var(--color-ink-600)",
        }}
        aria-label="Open navigation"
      >
        {/* Three rules, not an icon font: the mark is drawn inline everywhere
            else on this site and one more SVG costs nothing. */}
        <svg
          viewBox="0 0 20 14"
          aria-hidden="true"
          className="h-3.5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M1 1h18M1 7h18M1 13h18" />
        </svg>
        Menu
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-[60]"
          style={{
            background:
              "color-mix(in oklab, var(--color-vantage-black) 70%, transparent)",
          }}
        />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[70] mt-24 flex max-h-[85vh] flex-col rounded-t-2xl outline-none"
          style={{
            background: "var(--color-vantage-panel)",
            boxShadow: "inset 0 1px 0 0 var(--color-ink-700)",
          }}
        >
          {/* vaul's drag handle. Sized and coloured here rather than left to
              the library so it uses the site's ink ramp. */}
          <div
            aria-hidden="true"
            className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full"
            style={{ background: "var(--color-ink-700)" }}
          />

          <div className="overflow-y-auto px-5 pb-10 pt-5">
            <Drawer.Title
              className="flex items-center gap-2.5 text-2xl uppercase leading-none tracking-wide"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-vantage-white)",
              }}
            >
              <Goalpost className="h-7 w-auto" />
              Vantage
            </Drawer.Title>
            {/* Radix requires a description or an explicit opt-out; the title
                plus the list is the whole content, so it is opted out rather
                than padded with a sentence nobody needs. */}
            <Drawer.Description className="sr-only">
              Primary navigation
            </Drawer.Description>

            <nav aria-label="Primary" className="mt-6">
              <ul className="flex flex-col">
                {SITE_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block border-b py-3.5 text-lg font-bold uppercase tracking-wider"
                      style={{
                        fontFamily: "var(--font-condensed)",
                        color: "var(--color-vantage-white)",
                        borderColor: "var(--color-ink-800)",
                      }}
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                      <ul className="flex flex-col">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className="block border-b py-2.5 pl-5 text-sm font-semibold"
                              style={{
                                fontFamily: "var(--font-condensed)",
                                color: "var(--color-ink-300)",
                                borderColor: "var(--color-ink-800)",
                              }}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
                <li>
                  <Link
                    href="/glossary"
                    onClick={() => setOpen(false)}
                    className="block py-3.5 text-lg font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      color: "var(--color-vantage-white)",
                    }}
                  >
                    Glossary
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
