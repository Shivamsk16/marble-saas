import { cloneElement, isValidElement, type ReactElement } from "react";
import { cn } from "@/lib/utils";

type FieldControlProps = {
  id?: string;
  error?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function FormField({
  label,
  htmlFor,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactElement<FieldControlProps>;
}) {
  const errorId = `${htmlFor}-error`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: htmlFor,
        error: !!error,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })
    : children;

  return (
    <div className={cn(className)}>
      <label htmlFor={htmlFor} className="block text-[var(--text-sm)] font-medium mb-1.5">
        {label}
        {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
      </label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-[var(--text-xs)] text-[var(--danger)] mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
