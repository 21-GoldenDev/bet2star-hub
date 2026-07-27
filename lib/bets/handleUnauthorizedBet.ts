import { toast } from "sonner";

/** Handle unauthenticated bet attempts: toast + redirect to auth. Returns true if handled. */
export function handleUnauthorizedBet(
  response: Response,
  redirectTo: string,
): boolean {
  if (response.status !== 401) return false;
  toast.error("Please sign in to place a bet");
  if (typeof window !== "undefined") {
    window.location.assign(`/auth?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  return true;
}
