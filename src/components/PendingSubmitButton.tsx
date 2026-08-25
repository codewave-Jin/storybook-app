"use client";

import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  label,
  pendingLabel,
  className,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button type="submit" disabled={isDisabled} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}
