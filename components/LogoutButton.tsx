"use client";

import { useCallback, useState } from "react";

type LogoutButtonProps = {
  className?: string;
  label?: string;
  ariaLabel?: string;
};

const DEFAULT_CLASSNAMES =
  "rounded-full border border-[#D7DDF2] bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#1D3A8A] shadow-sm transition hover:bg-[#EDF1FF] hover:text-[#1B2E72] disabled:cursor-not-allowed disabled:opacity-70";

export function LogoutButton({
  className,
  label = "Uitloggen",
  ariaLabel,
}: LogoutButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isPending) {
      return;
    }
    setIsPending(true);
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }
    } catch (error) {
      console.error("[logout]", error);
    } finally {
      window.location.href = "/login";
    }
  }, [isPending]);

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      aria-label={ariaLabel ?? label}
      className={`${DEFAULT_CLASSNAMES}${className ? ` ${className}` : ""}`}
    >
      {isPending ? "Bezig..." : label}
    </button>
  );
}
