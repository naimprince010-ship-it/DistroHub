// Keep-alive service removed — no longer using Render (free tier with cold starts).
// Backend is now on Vercel which does not require keep-alive pings.

export function startKeepAlive() {
  // No-op: Render keep-alive not needed
}

export function stopKeepAlive() {
  // No-op: Render keep-alive not needed
}

export function isKeepAliveActive(): boolean {
  return false;
}
