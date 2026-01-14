// Keep-Alive Service for Render Backend
// Prevents cold starts by pinging the backend every 10 minutes

const API_URL = import.meta.env.VITE_API_URL || 'https://distrohub-backend.onrender.com';

let keepAliveInterval: NodeJS.Timeout | null = null;
let isActive = false;

/**
 * Start keep-alive ping to prevent Render cold starts
 * Pings backend every 10 minutes to keep it awake
 */
export function startKeepAlive() {
  if (isActive) {
    console.log('[KeepAlive] Already active, skipping start');
    return;
  }

  console.log('[KeepAlive] Starting keep-alive service...');
  isActive = true;

  // Ping immediately on start
  pingBackend();

  // Then ping every 10 minutes (600000 ms)
  // Render spins down after 15 minutes, so 10 minutes is safe
  keepAliveInterval = setInterval(() => {
    pingBackend();
  }, 10 * 60 * 1000); // 10 minutes
}

/**
 * Stop keep-alive service
 */
export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    isActive = false;
    console.log('[KeepAlive] Stopped keep-alive service');
  }
}

/**
 * Ping backend health endpoint
 */
async function pingBackend() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${API_URL}/healthz`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('[KeepAlive] ✅ Backend pinged successfully - service is awake');
    } else {
      console.warn('[KeepAlive] ⚠️ Backend ping returned non-OK status:', response.status);
    }
  } catch (error: any) {
    // Silent fail - backend might be starting up or network issue
    if (error.name === 'AbortError') {
      console.log('[KeepAlive] ⏱️ Ping timeout (backend may be starting up)');
    } else {
      console.log('[KeepAlive] ⚠️ Ping failed (backend may be starting):', error.message);
    }
  }
}

/**
 * Check if keep-alive is active
 */
export function isKeepAliveActive(): boolean {
  return isActive;
}
