import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_8px_20px_-8px_hsl(var(--primary)/0.6)] hover:brightness-[1.04] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_10px_28px_-8px_hsl(var(--primary)/0.7)]",
        outline:
          "border border-border bg-card text-foreground hover:bg-secondary hover:border-foreground/20",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        subtle: "bg-secondary text-secondary-foreground hover:bg-muted",
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-10 px-4.5",
        lg: "h-12 px-6 text-[15px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
