"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

// Wraps a server-rendered child (e.g. ConnectionsStatus, which needs direct
// DB access and so can't be a client component itself) to give it the same
// entrance animation as the client-side cards around it — Server Components
// can be passed as `children` into a Client Component and still render
// server-side, this just adds the motion wrapper around the result.
export default function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
