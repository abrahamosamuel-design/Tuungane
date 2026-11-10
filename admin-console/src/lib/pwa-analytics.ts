export function trackPwa(eventName: string, data?: Record<string, any>) {
  if (typeof window !== "undefined") {
    console.log(`[PWA Analytics] ${eventName}`, data || "");
    // If you add a real analytics service like PostHog or Google Analytics later,
    // you can hook it up here. Example:
    // window.posthog?.capture(eventName, data);
  }
}
