"use client"

import { cn } from "@/lib/utils"

function Progress({
  value = 0,
  className,
  ...props
}: React.ComponentProps<"div"> & { value?: number }) {
  return (
    <div
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export { Progress }
