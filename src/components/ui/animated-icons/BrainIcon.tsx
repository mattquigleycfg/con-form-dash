"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface BrainIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BrainIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const BRAIN_STEM_VARIANTS: Variants = {
  normal: { pathLength: 1, pathOffset: 0 },
  animate: {
    pathLength: [1, 0.4, 1],
    pathOffset: [0, 0.25, 0],
    transition: {
      duration: 1.4,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  },
};

const BRAIN_SIDE_VARIANTS: Variants = {
  normal: { pathLength: 1, pathOffset: 0 },
  animate: {
    pathLength: [1, 0.5, 1],
    pathOffset: [0, 0.25, 0],
    transition: {
      duration: 1.4,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  },
};

const BRAIN_TOP_ARC_VARIANTS: Variants = {
  normal: { pathLength: 1, pathOffset: 0 },
  animate: {
    pathLength: [1, 0.8, 1],
    pathOffset: [0, 0.07, 0],
    transition: {
      duration: 1.4,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  },
};

const BRAIN_LOWER_ARC_VARIANTS: Variants = {
  normal: { pathLength: 1, pathOffset: 0 },
  animate: {
    pathLength: [1, 0.8, 1],
    pathOffset: [0, 0.14, 0],
    transition: {
      duration: 1.4,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  },
};

const BrainIcon = forwardRef<BrainIconHandle, BrainIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn("cursor-pointer select-none p-2 hover:bg-accent rounded-md transition-colors duration-200 flex items-center justify-center", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"
            variants={BRAIN_SIDE_VARIANTS}
            animate={controls}
          />
          <motion.path
            d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"
            variants={BRAIN_SIDE_VARIANTS}
            animate={controls}
          />
          <motion.path
            d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"
            variants={BRAIN_LOWER_ARC_VARIANTS}
            animate={controls}
          />
          <motion.path
            d="M17.115 6.88A3 3 0 0 1 14.115 9"
            variants={BRAIN_TOP_ARC_VARIANTS}
            animate={controls}
          />
          <motion.path
            d="M6.885 6.88A3 3 0 0 0 9.885 9"
            variants={BRAIN_TOP_ARC_VARIANTS}
            animate={controls}
          />
          <motion.path
            d="M12 5v13"
            variants={BRAIN_STEM_VARIANTS}
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);

BrainIcon.displayName = "BrainIcon";

export { BrainIcon };
