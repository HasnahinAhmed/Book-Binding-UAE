/** Only allows returning to our own pages after sign-in (prevents open redirects). */
export function safeNext(value: string | string[] | undefined, fallback = "/account"): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return fallback;
  return /^\/(account|cart|checkout|thesis-builder|admin)(\/[A-Za-z0-9/_-]*)?(\?[A-Za-z0-9=&_-]*)?$/.test(v) ? v : fallback;
}
