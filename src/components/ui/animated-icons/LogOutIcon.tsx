"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface LogOutIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LogOutIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const ARROW_VARIANTS: Variants = {
  normal: { x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  animate: {
    x: [0, 3, 0],
    transition: { duration: 0.45, ease: "easeInOut", times: [0, 0.55, 1] },
  },
};

const DOOR_VARIANTS: Variants = {
  normal: { opacity: 1, transition: { duration: 0.2 } },
  animate: {
    opacity: [1, 0.5, 1],
    transition: { duration: 0.45, ease: "easeInOut" },
  },
};

const LogOutIcon = forwardRef<LogOutIconHandle, LogOutIconProps>(
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
          <motion.path
            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
            variants={DOOR_VARIANTS}
            animate={controls}
          />
          <motion.g variants={ARROW_VARIANTS} animate={controls}>
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

LogOutIcon.displayName = "LogOutIcon";

export { LogOutIcon };
