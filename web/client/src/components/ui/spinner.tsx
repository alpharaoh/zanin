import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const SPINNER_FRAMES = ["/", "—", "\\", "|"];

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="text-muted-foreground text-xs">
        {SPINNER_FRAMES[frame]}
      </span>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </span>
  );
}
