import "server-only";

import { createHmac } from "node:crypto";
import { getRealtimeSharedSecret } from "./realtime-config";

type RealtimeTokenUser = {
  userId: string;
  name: string;
  email: string | null;
  image: string | null;
  username: string | null;
};

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sign(data: string) {
  const secret = getRealtimeSharedSecret();

  if (!secret) {
    throw new Error("REALTIME_SHARED_SECRET is required for external realtime.");
  }

  return createHmac("sha256", secret).update(data).digest();
}

export function createRealtimeAccessToken(
  user: RealtimeTokenUser,
  expiresInSeconds = 60 * 60,
) {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: user.userId,
      name: user.name,
      email: user.email,
      image: user.image,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }),
  );
  const signature = encodeBase64Url(sign(`${header}.${payload}`));

  return `${header}.${payload}.${signature}`;
}
