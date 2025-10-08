import { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableWidgetProps {
  children: ReactNode;
  className?: string;
}

export function DraggableWidget({ children, className }: DraggableWidgetProps) {
  return (
    <div className={cn("relative group h-full", className)}>
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-move">
        <div className="bg-muted border border-border rounded px-2 py-1 shadow-sm">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="h-full">
        {children}
      </div>
    </div>
  );
}
