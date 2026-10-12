import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message: string;
  children?: ReactNode;
}

export default function EmptyState({
  title,
  message,
  children,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-paper-raised p-8 text-center">
      <h2 className="font-serif text-xl text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-prose text-ink-soft">{message}</p>
      {children && <div className="mt-4 flex justify-center gap-3">{children}</div>}
    </div>
  );
}
