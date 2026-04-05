import "server-only";

export const REALTIME_SOCKET_PATH = "/api/socket_io";
export const REALTIME_INTERNAL_SECRET_HEADER = "x-realtime-secret";

function normalizeUrl(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getRealtimeServerUrl() {
  return normalizeUrl(
    process.env.REALTIME_SERVER_URL ??
      process.env.NEXT_PUBLIC_SOCKET_URL ??
      process.env.NEXT_PUBLIC_REALTIME_URL,
  );
}

export function isExternalRealtimeEnabled() {
  return Boolean(getRealtimeServerUrl());
}

export function getRealtimeSharedSecret() {
  const secret = process.env.REALTIME_SHARED_SECRET?.trim();
  return secret || null;
}
