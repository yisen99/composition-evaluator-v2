import { trackUxEvent } from "@/lib/api/client";
import type { UxEventTrackRequest } from "@/lib/api/types";

export function trackUxEventSafe(payload: UxEventTrackRequest): void {
  void trackUxEvent(payload).catch(() => undefined);
}
