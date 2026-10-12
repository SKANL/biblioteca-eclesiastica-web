"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/(sitio)/editor/actions";

/**
 * Form bound to a Server Action with pending, success and error feedback.
 * `confirmText` asks first (native confirm) for destructive actions.
 */
export default function ActionForm({
  action,
  confirmText,
  className,
  children,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  confirmText?: string;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      aria-busy={pending}
      className={className}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <p role="status" aria-live="polite" className="text-sm text-ink-soft empty:hidden">
        {state?.ok}
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
