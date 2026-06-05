import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 active:opacity-95",
  secondary:
    "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)]",
  outline:
    "bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]",
  ghost: "text-[var(--text)] hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[var(--text-sm)] gap-1.5 rounded-[var(--radius-md)]",
  md: "h-10 px-4 text-[var(--text-sm)] gap-2 rounded-[var(--radius-md)]",
  lg: "h-12 px-6 text-[var(--text-body)] gap-2 rounded-[var(--radius-lg)]",
  icon: "h-10 w-10 p-0 rounded-[var(--radius-md)]",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
  }
>(({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={cn(
      "inline-flex items-center justify-center font-medium transition-opacity disabled:opacity-50 disabled:pointer-events-none",
      variants[variant],
      sizes[size],
      className
    )}
    {...props}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />}
    {children}
  </button>
));
Button.displayName = "Button";
