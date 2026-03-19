/**
 * Animated icon wrappers using framer-motion — mirrors the animate-ui pattern.
 * Each component wraps a Lucide SVG and applies motion to its paths/elements.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const ease = [0.4, 0, 0.2, 1] as const;

// ── TrendingUp ────────────────────────────────────────────────────────────────
export function AnimatedTrendingUp({ className, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      initial="idle"
      whileHover="hover"
    >
      <motion.polyline
        points="22 7 13.5 15.5 8.5 10.5 2 17"
        variants={{
          idle: { pathLength: 1, opacity: 1 },
          hover: { pathLength: [0, 1], opacity: 1, transition: { duration: 0.5, ease } },
        }}
      />
      <motion.polyline
        points="16 7 22 7 22 13"
        variants={{
          idle: { opacity: 1 },
          hover: { opacity: [0, 1], transition: { duration: 0.3, delay: 0.3, ease } },
        }}
      />
    </motion.svg>
  );
}

// ── TrendingDown ──────────────────────────────────────────────────────────────
export function AnimatedTrendingDown({ className, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      initial="idle"
      whileHover="hover"
    >
      <motion.polyline
        points="22 17 13.5 8.5 8.5 13.5 2 7"
        variants={{
          idle: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.5, ease } },
        }}
      />
      <motion.polyline
        points="16 17 22 17 22 11"
        variants={{
          idle: { opacity: 1 },
          hover: { opacity: [0, 1], transition: { duration: 0.3, delay: 0.3, ease } },
        }}
      />
    </motion.svg>
  );
}

// ── RefreshCw ─────────────────────────────────────────────────────────────────
export function AnimatedRefreshCw({ className, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      initial="idle"
      whileHover="hover"
    >
      <motion.path
        d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
        variants={{
          idle: {},
          hover: { rotate: [0, 360], transition: { duration: 0.6, ease } },
        }}
        style={{ originX: "50%", originY: "50%" }}
      />
      <motion.path
        d="M21 3v5h-5"
        variants={{ idle: {}, hover: {} }}
      />
      <motion.path
        d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
        variants={{ idle: {}, hover: {} }}
      />
      <motion.path
        d="M8 16H3v5"
        variants={{ idle: {}, hover: {} }}
      />
    </motion.svg>
  );
}

// ── ArrowUpDown (sort indicator) ──────────────────────────────────────────────
export function AnimatedArrowUpDown({ className, size = 14, strokeWidth = 2 }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      initial="idle"
      whileHover="hover"
    >
      <motion.path
        d="m21 16-4 4-4-4"
        variants={{
          idle: { y: 0 },
          hover: { y: [0, 2, 0], transition: { duration: 0.4, ease } },
        }}
      />
      <motion.path d="M17 20V4" />
      <motion.path
        d="m3 8 4-4 4 4"
        variants={{
          idle: { y: 0 },
          hover: { y: [0, -2, 0], transition: { duration: 0.4, ease } },
        }}
      />
      <motion.path d="M7 4v16" />
    </motion.svg>
  );
}

// ── CheckCircle ───────────────────────────────────────────────────────────────
export function AnimatedCheckCircle({ className, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      initial="idle"
      whileHover="hover"
    >
      <motion.circle cx="12" cy="12" r="10" />
      <motion.path
        d="m9 12 2 2 4-4"
        variants={{
          idle: { pathLength: 1, opacity: 1 },
          hover: { pathLength: [0, 1], opacity: 1, transition: { duration: 0.35, ease } },
        }}
      />
    </motion.svg>
  );
}

// ── AlertTriangle ─────────────────────────────────────────────────────────────
export function AnimatedAlertTriangle({ className, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      initial="idle"
      whileHover="hover"
    >
      <motion.path
        d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
        variants={{ idle: {}, hover: { scale: [1, 1.05, 1], transition: { duration: 0.3 } } }}
        style={{ originX: "50%", originY: "50%" }}
      />
      <motion.path
        d="M12 9v4"
        variants={{
          idle: { scaleY: 1 },
          hover: { scaleY: [1, 0, 1], transition: { duration: 0.4, ease } },
        }}
        style={{ originX: "50%", originY: "0%" }}
      />
      <motion.path d="M12 17h.01" />
    </motion.svg>
  );
}

// ── BarChart2 ─────────────────────────────────────────────────────────────────
export function AnimatedBarChart({ className, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      initial="idle"
      whileHover="hover"
    >
      {[
        { x: "18", y: "2", height: "20", delay: 0 },
        { x: "10", y: "8", height: "14", delay: 0.08 },
        { x: "2",  y: "14",height: "8",  delay: 0.16 },
      ].map(({ x, y, height, delay }, i) => (
        <motion.line
          key={i}
          x1={+x + 2} y1={+y} x2={+x + 2} y2={22}
          variants={{
            idle: { scaleY: 1, opacity: 1 },
            hover: {
              scaleY: [0, 1],
              opacity: [0, 1],
              transition: { duration: 0.4, delay, ease },
            },
          }}
          style={{ originX: "50%", originY: "100%" }}
        />
      ))}
    </motion.svg>
  );
}

// ── DollarSign ────────────────────────────────────────────────────────────────
export function AnimatedDollarSign({ className, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      initial="idle"
      whileHover="hover"
    >
      <motion.line
        x1="12" y1="2" x2="12" y2="22"
        variants={{
          idle: {},
          hover: { scaleY: [0.6, 1.1, 1], transition: { duration: 0.4, ease } },
        }}
        style={{ originX: "50%", originY: "50%" }}
      />
      <motion.path
        d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        variants={{
          idle: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.6, ease } },
        }}
      />
    </motion.svg>
  );
}

// ── Layers (budget / BOM) ─────────────────────────────────────────────────────
export function AnimatedLayers({ className, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      initial="idle"
      whileHover="hover"
    >
      {[
        { d: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z", delay: 0 },
        { d: "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65", delay: 0.1 },
        { d: "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65", delay: 0.2 },
      ].map(({ d, delay }, i) => (
        <motion.path
          key={i}
          d={d}
          variants={{
            idle: { y: 0 },
            hover: { y: [0, -2 + i, 0], transition: { duration: 0.45, delay, ease } },
          }}
        />
      ))}
    </motion.svg>
  );
}
