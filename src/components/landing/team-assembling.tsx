"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Plus } from "lucide-react";

/**
 * The page's thesis, in one object: a team is a set of skills, some covered and
 * some still open. On load the open slots fill in one at a time — which is
 * literally what the product does. Reduced motion gets the finished state.
 */

const SLOTS = [
  { skill: "AI/ML developer", who: "Krish Parmar" },
  { skill: "Backend developer", who: "Varshil" },
  { skill: "Frontend developer", who: "Maitree Mistry" },
  { skill: "Cybersecurity", who: "Payas Vaishnav" },
];

const FILLED_FROM_START = 2;

// Role and name sit side by side, but "Frontend developer" + "Maitree Mistry"
// stops fitting on one line below ~420px. Under that the row stacks — every
// row, so the heights stay even — rather than truncating a person's name.

export function TeamAssembling() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="glass rim relative w-full max-w-lg rounded-2xl p-6 shadow-glow-lg">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-base font-semibold">Team ZERO BIAS</h2>
        <span className="font-mono text-xs text-muted-foreground">Hack the Campus</span>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">Roles this team needs</p>

      <ul className="mt-4 space-y-2">
        {SLOTS.map((slot, i) => {
          const startsFilled = i < FILLED_FROM_START;
          return (
            <li key={slot.skill}>
              <motion.div
                className="flex flex-col items-start gap-1.5 rounded-xl border border-white/10 bg-white/3 px-2.5 py-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3 sm:px-3"
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
                <span className="font-mono text-xs sm:text-sm">
                  {slot.skill}
                </span>

                <motion.span
                  className="slot slot-filled shrink-0"
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

        <li className="flex flex-col items-start gap-1.5 rounded-xl border border-dashed border-jasmine/35 px-2.5 py-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3 sm:px-3">
          <span className="font-mono text-xs text-jasmine sm:text-sm">
            Open slot
          </span>
          <span className="slot slot-open shrink-0">
            <Plus className="size-3" aria-hidden />
            asking to join
          </span>
        </li>
      </ul>
    </div>
  );
}
