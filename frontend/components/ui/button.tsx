import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Infisical marketing v2-btn + OSS v3 tint variants. */
const buttonVariants = cva(
  [
    "v2-btn inline-flex min-h-[44px] items-center justify-center gap-1.5",
    "font-sans text-sm font-medium whitespace-nowrap select-none border",
    "transition-[color,background-color,border-color,transform] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-text/20",
    "active:scale-[0.97] motion-reduce:transform-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Primary CTA — black fill, white label (infisical.com) */
        primary: "bg-v2-text text-v2-bg border-v2-text hover:bg-v2-void",
        /** Secondary — bordered ghost */
        outline:
          "bg-transparent text-v2-text-subtle border-v2-border hover:text-v2-text focus-visible:text-v2-text",
        ghost: "bg-transparent text-v2-text border-transparent hover:text-v2-text-subtle",
        /** Infisical v3 project tint (lime) */
        project:
          "border-project/25 bg-project/10 text-v2-text hover:bg-project/15 hover:border-project/30",
        link: "min-h-0 border-none bg-transparent p-0 text-v2-text-subtle underline-offset-4 hover:text-v2-text hover:underline active:scale-100",
      },
      size: {
        sm: "px-3 py-1.5 text-xs min-h-9",
        md: "px-4 py-2 text-sm",
        lg: "px-5 py-2.5 text-sm",
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
