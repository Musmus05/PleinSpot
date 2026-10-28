// Google Analytics is only loaded once the visitor accepts the consent banner (see
// public/index.html). Until then `gtag` does not exist and events are dropped.
export function track(event: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, params);
  }
}

export function openConsentSettings() {
  if (typeof window !== 'undefined') {
    window.psOpenConsent?.();
  }
}
