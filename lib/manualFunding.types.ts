export const MANUAL_PAYMENT_METHOD = "manual";

export type ManualFundingStatus = "pending" | "completed" | "cancelled";

export interface ManualFundingAttachment {
  name: string;
  path: string;
}
