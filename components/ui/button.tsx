import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/client/cn";

const variants = {
  primary:
    "bg-gradient-to-r from-neon-pink to-neon-purple text-white shadow-[0_0_20px_-6px_var(--color-neon-pink)] hover:brightness-110",
  secondary: "bg-ink-700 text-ink-100 hover:bg-ink-600",
  ghost: "text-ink-100 hover:bg-white/5",
  danger: "bg-red-600/90 text-white hover:bg-red-500",
  gold: "bg-neon-gold text-ink-950 hover:brightness-110",
  teal: "bg-neon-teal/90 text-ink-950 hover:brightness-110",
  outline: "border border-white/15 text-ink-100 hover:bg-white/5",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  icon: "h-9 w-9 justify-center",
  iconLg: "h-11 w-11 justify-center rounded-xl",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-pink disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
