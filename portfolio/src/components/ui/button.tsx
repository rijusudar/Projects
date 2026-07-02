import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)] hover:shadow-[0_0_36px_-4px_var(--primary)] hover:bg-primary-soft hover:-translate-y-0.5",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary-soft/60 hover:bg-primary/10 hover:-translate-y-0.5",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary",
        accent:
          "bg-accent text-accent-foreground shadow-[0_0_24px_-6px_var(--accent)] hover:shadow-[0_0_36px_-4px_var(--accent)] hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
