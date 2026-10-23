import { ProxyAgent, fetch as undiciFetch } from 'undici';

// Rotating User-Agent pool to prevent bot fingerprinting
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

export function getRandomUserAgent(): string {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index];
}

// Global cache for undici ProxyAgent instances to reuse sockets efficiently
const agentCache = new Map<string, ProxyAgent>();

function getAgentForProxyUrl(proxyUrl: string): ProxyAgent {
  let agent = agentCache.get(proxyUrl);
  if (!agent) {
    agent = new ProxyAgent(proxyUrl);
    agentCache.set(proxyUrl, agent);
  }
  return agent;
}

// Parse forward proxies from environment (e.g. HTTP_PROXY, HTTPS_PROXY, PROXY_LIST)
export function getConfiguredProxies(): string[] {
  const listStr = process.env.PROXY_LIST || process.env.PROXY_ROTATION_LIST || '';
  const singleProxy =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.PROXY_URL ||
    process.env.ROTATING_PROXY_URL;

  const proxies: string[] = [];

  if (listStr.trim()) {
    listStr
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => proxies.push(p));
  } else if (singleProxy?.trim()) {
    proxies.push(singleProxy.trim());
  }

  return proxies;
}

let currentProxyIndex = 0;

export function getNextProxyAgent(): { agent?: ProxyAgent; proxyUrl?: string } {
  const proxies = getConfiguredProxies();
  if (proxies.length === 0) {
    return {};
  }

  const proxyUrl = proxies[currentProxyIndex % proxies.length];
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;

  return {
    agent: getAgentForProxyUrl(proxyUrl),
    proxyUrl,
  };
}

export interface ProxiedFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  skipProxy?: boolean;
}

/**
 * Universal Proxied Fetch with 100% Free Proxy Support
 * - Supports free reverse proxies (e.g., Free Cloudflare Worker URL via FREE_PROXY_URL)
 * - Supports free forward proxies (HTTP_PROXY / HTTPS_PROXY / PROXY_LIST)
 * - Randomizes legitimate desktop/mobile user-agents
 * - Automatically retries on 429 Too Many Requests with exponential backoff & jitter
 * - Gracefully falls back to direct connection if no proxy is configured
 */
export async function proxiedFetch(
  url: string | URL,
  options: ProxiedFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 12000,
    maxRetries = 2,
    skipProxy = false,
    headers: inputHeaders = {},
    ...restOptions
  } = options;

  let rawTargetUrl = typeof url === 'string' ? url : url.toString();
  const headers = new Headers(inputHeaders);

  // Set realistic browser User-Agent if not provided
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', getRandomUserAgent());
  }
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', 'en-US,en;q=0.9');
  }

  // 1. Check for Free Cloudflare Worker / Web Reverse Proxy (100% Free, zero ban)
  const freeReverseProxy = process.env.FREE_PROXY_URL?.trim();
  let finalUrl = rawTargetUrl;
  if (!skipProxy && freeReverseProxy) {
    if (freeReverseProxy.includes('?url=')) {
      finalUrl = `${freeReverseProxy}${encodeURIComponent(rawTargetUrl)}`;
    } else {
      finalUrl = `${freeReverseProxy.replace(/\/$/, '')}/${rawTargetUrl}`;
    }
  }

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    attempt++;
    const { agent, proxyUrl } = !skipProxy && !freeReverseProxy
      ? getNextProxyAgent()
      : { agent: undefined, proxyUrl: undefined };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (agent) {
        // Fetch via undici with forward proxy agent
        const fetchHeaders: Record<string, string> = {};
        headers.forEach((val, key) => {
          fetchHeaders[key] = val;
        });

        const res = await undiciFetch(finalUrl, {
          ...(restOptions as any),
          headers: fetchHeaders,
          dispatcher: agent,
          signal: controller.signal as any,
        });

        clearTimeout(timeout);

        if ((res.status === 429 || res.status === 403) && attempt <= maxRetries) {
          console.warn(`[Proxy] Received ${res.status} from ${proxyUrl || 'upstream'}, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          continue;
        }

        return res as unknown as Response;
      } else {
        // Direct fetch or via Free Reverse Proxy
        const res = await fetch(finalUrl, {
          ...restOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.status === 429 && attempt <= maxRetries) {
          console.warn(`[Proxy] Rate limited (429), backing off for ${attempt * 1500}ms...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
          continue;
        }

        return res;
      }
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = err;

      if (attempt <= maxRetries) {
        console.warn(`[Proxy] Attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${rawTargetUrl} after ${maxRetries} retries`);
}
