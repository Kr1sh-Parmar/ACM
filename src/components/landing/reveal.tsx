"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Scroll-triggered entrance, used on the public landing page only.
 *
 * Deliberately not applied inside the app: fading in an approval queue or a
 * results table every time you navigate to it makes a tool feel slower, not
 * more polished. The animation budget is spent on the hero and the skill slots.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  /** A div between <ol> and <li> is invalid markup, so list items pass as="li". */
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const reduceMotion = useReducedMotion();
  const Tag = as === "li" ? motion.li : motion.div;

  return (
    <Tag
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
