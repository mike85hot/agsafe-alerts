// Severity pill — uses semantic tokens so colour-blind contrast is consistent.
import type { Severity } from "@/lib/agsafe/types";

const STYLES: Record<Severity | "safe", string> = {
  safe: "bg-safe text-safe-foreground",
  watch: "bg-watch text-watch-foreground",
  warning: "bg-warning text-warning-foreground",
  emergency: "bg-emergency text-emergency-foreground",
};

export function SeverityBadge({ severity }: { severity: Severity | "safe" }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${STYLES[severity]}`}>
      {severity}
    </span>
  );
}
