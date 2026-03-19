"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface BotIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BotIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const EYE_VARIANTS: Variants = {
  normal: {
    scaleY: 1,
    transition: { duration: 0.2 },
  },
  animate: {
    scaleY: [1, 0.1, 1, 0.1, 1],
    transition: {
      duration: 1.2,
      ease: "easeInOut",
      times: [0, 0.15, 0.3, 0.6, 0.75],
      repeat: Number.POSITIVE_INFINITY,
      repeatDelay: 0.8,
    },
  },
};

const ANTENNA_VARIANTS: Variants = {
  normal: { y: 0, transition: { duration: 0.3 } },
  animate: {
    y: [0, -1.5, 0],
    transition: {
      duration: 0.8,
      ease: "easeInOut",
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "reverse",
    },
  },
};

const BotIcon = forwardRef<BotIconHandle, BotIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const eyeControls = useAnimation();
    const antennaControls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => {
          eyeControls.start("animate");
          antennaControls.start("animate");
        },
        stopAnimation: () => {
          eyeControls.start("normal");
          antennaControls.start("normal");
        },
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          eyeControls.start("animate");
          antennaControls.start("animate");
        }
      },
      [eyeControls, antennaControls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          eyeControls.start("normal");
          antennaControls.start("normal");
        }
      },
      [eyeControls, antennaControls, onMouseLeave]
    );

    return (
      <div
        className={cn(
          "cursor-pointer select-none p-2 hover:bg-accent rounded-md transition-colors duration-200 flex items-center justify-center",
          className
        )}
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
          <motion.path d="M12 8V4H8" variants={ANTENNA_VARIANTS} animate={antennaControls} />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <motion.path
            d="M15 13v2"
            variants={EYE_VARIANTS}
            animate={eyeControls}
            style={{ originX: "15px", originY: "14px" }}
          />
          <motion.path
            d="M9 13v2"
            variants={EYE_VARIANTS}
            animate={eyeControls}
            style={{ originX: "9px", originY: "14px" }}
          />
        </svg>
      </div>
    );
  }
);

BotIcon.displayName = "BotIcon";

export { BotIcon };
