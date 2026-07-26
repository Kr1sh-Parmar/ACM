"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Plus } from "lucide-react";

/**
 * The page's thesis, in one object: a team is a set of skills, some covered and
 * some still open. On load the open slots fill in one at a time — which is
 * literally what the product does. Reduced motion gets the finished state.
 */

const SLOTS = [
  { skill: "React", who: "Aditi" },
  { skill: "Figma", who: "Rohan" },
  { skill: "Python / ML", who: "Sana" },
  { skill: "Postgres", who: "Vikram" },
];

const FILLED_FROM_START = 2;

export function TeamAssembling() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative w-full max-w-md rounded-2xl border bg-card p-5 shadow-lg shadow-acm-900/5 dark:shadow-black/40">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-base font-semibold">Team Northstar</h2>
        <span className="font-mono text-xs text-muted-foreground">Hack the Campus</span>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">Roles this team needs</p>

      <ul className="mt-4 space-y-2">
        {SLOTS.map((slot, i) => {
          const startsFilled = i < FILLED_FROM_START;
          return (
            <li key={slot.skill}>
              <motion.div
                className="flex items-center justify-between rounded-xl border px-3 py-2"
                initial={
                  reduceMotion || startsFilled
                    ? false
                    : { borderStyle: "dashed", opacity: 0.55 }
                }
                animate={{ borderStyle: "solid", opacity: 1 }}
                transition={{
                  delay: reduceMotion ? 0 : 0.5 + (i - FILLED_FROM_START) * 0.45,
                  duration: 0.4,
                }}
              >
                <span className="font-mono text-sm">{slot.skill}</span>

                <motion.span
                  className="slot slot-filled"
                  initial={reduceMotion || startsFilled ? false : { scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: reduceMotion ? 0 : 0.6 + (i - FILLED_FROM_START) * 0.45,
                    type: "spring",
                    stiffness: 320,
                    damping: 22,
                  }}
                >
                  <Check className="size-3" aria-hidden />
                  {slot.who}
                </motion.span>
              </motion.div>
            </li>
          );
        })}

        <li className="flex items-center justify-between rounded-xl border border-dashed border-jasmine-deep bg-jasmine-soft px-3 py-2 dark:bg-transparent">
          <span className="font-mono text-sm text-[#6b5410] dark:text-jasmine">
            Open slot
          </span>
          <span className="slot slot-open">
            <Plus className="size-3" aria-hidden />
            asking to join
          </span>
        </li>
      </ul>
    </div>
  );
}
