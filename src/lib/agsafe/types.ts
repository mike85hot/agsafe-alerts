// Shared AgSafe types used by both client and server code.
export type AppRole = "super_admin" | "field_agent" | "farmer";
export type ThresholdType = "drought" | "flood" | "heat";
export type Severity = "watch" | "warning" | "emergency";
export type DeliveryStatus = "queued" | "sent" | "delivered" | "failed" | "undelivered";

export const SEVERITY_ORDER: Record<Severity, number> = { watch: 1, warning: 2, emergency: 3 };
