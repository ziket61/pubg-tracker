import { env, useMocks } from "../env";
import { withRateLimit } from "./rate-limit";
import { getMock } from "./mocks";

const BASE = "https://api.pubg.com";

interface RouteCacheConfig {
  revalidate: number;
  tags: (path: string, query: URLSearchParams) => string[];
}

function classify(path: string): RouteCacheConfig {
  if (/^\/shards\/[^/]+\/seasons$/.test(path)) {
    return { revalidate: 86_400, tags: () => ["pubg:seasons"] };
  }
  if (/^\/shards\/[^/]+\/matches\//.test(path)) {
    return { revalidate: 30 * 86_400, tags: () => ["pubg:match"] };
  }
  if (/^\/shards\/[^/]+\/leaderboards\//.test(path)) {
    return { revalidate: 600, tags: () => ["pubg:leaderboard"] };
  }
  if (/\/weapon_mastery$|\/survival_mastery$/.test(path)) {
    return { revalidate: 900, tags: () => ["pubg:mastery"] };
  }
  if (/\/players\/[^/]+\/seasons\//.test(path)) {
    return { revalidate: 300, tags: () => ["pubg:player-season"] };
  }
  if (/\/players\/[^/]+$/.test(path)) {
    return { revalidate: 300, tags: () => ["pubg:player"] };
  }
  if (/\/players$/.test(path)) {
    return { revalidate: 300, tags: () => ["pubg:players-search"] };
  }
  if (/^\/status$/.test(path)) {
    return { revalidate: 60, tags: () => ["pubg:status"] };
  }
  if (/^\/telemetry\//.test(path)) {
    return { revalidate: 30 * 86_400, tags: () => ["pubg:telemetry"] };
  }
  return { revalidate: 60, tags: () => ["pubg:other"] };
}

export interface ProxyResult {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * Server-only PUBG API proxy. Adds Bearer auth, applies caching, falls back to
 * fixtures when in mock mode, and converts known error statuses to a stable shape.
 */
export async function proxyPubgRequest(
  rawPath: string,
  query: URLSearchParams,
): Promise<ProxyResult> {
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  // Mock mode: serve fixtures, never hit network.
  if (useMocks) {
    const mock = getMock(path, query);
    if (!mock) {
      return {
        status: 404,
        body: { error: "not_found", path, mock: true },
        headers: { "x-mock": "1" },
      };
    }
    return {
      status: mock.status ?? 200,
      body: mock.body,
      headers: { "x-mock": "1", "content-type": "application/vnd.api+json" },
    };
  }

  if (!env.PUBG_API_KEY) {
    return {
      status: 401,
      body: { error: "missing_api_key" },
      headers: {},
    };
  }

  const cfg = classify(path);
  const url = new URL(BASE + path);
  for (const [k, v] of query.entries()) url.searchParams.set(k, v);

  // Hard cap per upstream call — PUBG occasionally stalls on cold matches.
  // 8s is generous for normal latency (~200-800ms) and bounds the worst case.
  const PER_REQUEST_TIMEOUT_MS = 8000;

  try {
    const response = await withRateLimit(() => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PER_REQUEST_TIMEOUT_MS);
      return fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${env.PUBG_API_KEY}`,
          Accept: "application/vnd.api+json",
        },
        next: { revalidate: cfg.revalidate, tags: cfg.tags(path, query) },
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));
    });

    const text = await response.text();
    const body = text ? safeJson(text) : null;

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 60);
      return {
        status: 429,
        body: { error: "rate_limited", retryAfter },
        headers: { "retry-after": String(retryAfter) },
      };
    }

    if (response.status === 404) {
      return { status: 404, body: { error: "not_found" }, headers: {} };
    }

    if (response.status >= 500) {
      return { status: 502, body: { error: "upstream_error", status: response.status }, headers: {} };
    }

    return {
      status: response.status,
      body,
      headers: { "content-type": "application/vnd.api+json" },
    };
  } catch (err) {
    return {
      status: 502,
      body: { error: "fetch_failed", message: (err as Error).message },
      headers: {},
    };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Telemetry uses a different host (CDN). Same-shape result, separate cache config.
 */
export async function proxyTelemetry(url: string): Promise<ProxyResult> {
  if (useMocks) {
    return {
      status: 200,
      body: getTelemetryMock(),
      headers: { "x-mock": "1" },
    };
  }
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.api+json" },
      next: { revalidate: 30 * 86_400, tags: ["pubg:telemetry"] },
    });
    const body = await res.json();
    return { status: res.status, body, headers: {} };
  } catch (err) {
    return {
      status: 502,
      body: { error: "telemetry_fetch_failed", message: (err as Error).message },
      headers: {},
    };
  }
}

function getTelemetryMock(): unknown {
  return [
    {
      _D: "2024-08-12T18:43:01.123Z",
      _T: "LogMatchStart",
      mapName: "Baltic_Main",
      gameMode: "squad-fpp",
    },
    {
      _D: "2024-08-12T18:55:12.555Z",
      _T: "LogPlayerKillV2",
      killer: { name: "shroud", accountId: "account.mock-player-id-shroud-12345" },
      victim: { name: "DrDisrespect", accountId: "account.mock-player-id-drdsrspt-42345" },
      damageCauserName: "WeapAK47_C",
      damageCauserAdditionalInfo: ["Item_Attach_Weapon_Magazine_Extended_Large_C"],
      damageReason: "HeadShot",
      distance: 31270,
    },
    {
      _D: "2024-08-12T19:01:42.111Z",
      _T: "LogPlayerKillV2",
      killer: { name: "shroud", accountId: "account.mock-player-id-shroud-12345" },
      victim: { name: "Halifax", accountId: "account.mock-player-id-halifax-62345" },
      damageCauserName: "WeapKar98k_C",
      distance: 41270,
    },
    {
      _D: "2024-08-12T19:08:55.000Z",
      _T: "LogMatchEnd",
    },
  ];
}
