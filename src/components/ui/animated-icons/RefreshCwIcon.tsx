"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface RefreshCwIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface RefreshCwIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  spinning?: boolean;
}

const VARIANTS: Variants = {
  normal: {
    rotate: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  animate: {
    rotate: 180,
    transition: { duration: 0.4, ease: "easeInOut" },
  },
  spinning: {
    rotate: [0, 360],
    transition: { duration: 1, ease: "linear", repeat: Infinity, repeatType: "loop" },
  },
};

const RefreshCwIcon = forwardRef<RefreshCwIconHandle, RefreshCwIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, spinning = false, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useEffect(() => {
      if (spinning) {
        controls.start("spinning");
      } else {
        controls.start("normal");
      }
    }, [spinning, controls]);

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
        } else if (!spinning) {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter, spinning]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else if (!spinning) {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave, spinning]
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
          <motion.g
            variants={VARIANTS}
            animate={controls}
            style={{ originX: "12px", originY: "12px" }}
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

RefreshCwIcon.displayName = "RefreshCwIcon";

export { RefreshCwIcon };
