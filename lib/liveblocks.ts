import { Liveblocks } from "@liveblocks/node";

const CURSOR_COLORS = [
  "#2dd4bf",
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#fb7185",
  "#fbbf24",
  "#84cc16",
  "#22c55e",
] as const;

type LiveblocksClient = InstanceType<typeof Liveblocks>;

const globalForLiveblocks = globalThis as typeof globalThis & {
  liveblocksClient?: LiveblocksClient;
};

export function getLiveblocksClient(): LiveblocksClient {
  if (globalForLiveblocks.liveblocksClient) {
    return globalForLiveblocks.liveblocksClient;
  }

  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is required for Liveblocks auth.");
  }

  const client = new Liveblocks({ secret });
  globalForLiveblocks.liveblocksClient = client;

  return client;
}

export function getLiveblocksSecretConfigurationError(): string | null {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    return "LIVEBLOCKS_SECRET_KEY is missing.";
  }

  if (!secret.startsWith("sk_")) {
    return "LIVEBLOCKS_SECRET_KEY must be a Liveblocks secret key that starts with sk_.";
  }

  return null;
}

export function getCursorColorForUser(userId: string): string {
  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }

  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}
