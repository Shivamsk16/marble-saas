import { cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClass = {
    sm: "h-8 w-8 text-[var(--text-xs)]",
    md: "h-10 w-10 text-[var(--text-sm)]",
    lg: "h-12 w-12 text-[var(--text-body)]",
  }[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover", sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[var(--surface-3)] text-[var(--text-muted)] font-medium flex items-center justify-center shrink-0",
        sizeClass,
        className
      )}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
