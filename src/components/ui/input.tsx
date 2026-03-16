import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "w-full min-w-0 rounded-[var(--radius-m)] border border-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        sm: "h-[var(--component-input-sm-height)] px-[var(--component-input-sm-padding-x)] py-[var(--component-input-sm-padding-y)] text-[length:var(--component-input-sm-font-size)] file:h-[calc(var(--component-input-sm-height)-8px)]",
        md: "h-[var(--component-input-md-height)] px-[var(--component-input-md-padding-x)] py-[var(--component-input-md-padding-y)] text-[length:var(--component-input-md-font-size)] file:h-[calc(var(--component-input-md-height)-8px)]",
        lg: "h-[var(--component-input-lg-height)] px-[var(--component-input-lg-padding-x)] py-[var(--component-input-lg-padding-y)] text-[length:var(--component-input-lg-font-size)] file:h-[calc(var(--component-input-lg-height)-8px)]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

function Input({
  className,
  type,
  size = "md",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        inputVariants({ size }),
        className
      )}
      {...props}
    />
  )
}

export { Input, inputVariants }
