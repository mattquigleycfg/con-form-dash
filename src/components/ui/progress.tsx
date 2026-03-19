import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { motion, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** 0–100. Values outside this range are clamped automatically. */
  value?: number;
  /** Override the fill colour class. Defaults to primary brand token. */
  indicatorClassName?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, ...props }, ref) => {
  const clamped = Math.min(100, Math.max(0, value ?? 0));

  // Spring-animated translateX: starts fully off-screen (-100%) → target position
  const springX = useSpring(-(100 - clamped), {
    stiffness: 80,
    damping: 18,
    restDelta: 0.01,
  });

  // When value changes after mount, animate to new position
  React.useEffect(() => {
    springX.set(-(100 - clamped));
  }, [clamped, springX]);

  const translateX = useTransform(springX, (x) => `${x}%`);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      {/* We render a raw div inside the Radix slot so Framer Motion can own it */}
      <ProgressPrimitive.Indicator asChild>
        <motion.div
          className={cn(
            "h-full w-full rounded-full",
            indicatorClassName ?? "bg-primary",
          )}
          style={{ x: translateX }}
        />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
