"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function CopyButton({
  value,
  label,
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Some browsers block clipboard in insecure contexts; fall back to selection.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      } catch {
        /* noop */
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-muted transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-fg ${className}`}
      aria-live="polite"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? `✓ ${t("copied")}` : label ?? t("copy")}
    </button>
  );
}
