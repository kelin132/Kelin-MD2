/**
 * lib/gifted.js — GiftedTech API helper (ESM, native fetch)
 * Converted from CommonJS to ESM for compatibility with Node "type":"module".
 *
 * Base: https://api.giftedtech.co.ke/api
 * All endpoints require ?apikey=<key>
 */

const BASE = 'https://api.giftedtech.co.ke/api';
export const KEY  = 'gifted-api_p1r5icplshukpe2x';

function buildUrl(path, params = {}) {
    const u = new URL(`${BASE}${path}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return u.toString();
}
export { buildUrl };

async function fetchJson(url, timeout = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function fetchBuf(url, timeout = 45000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return Buffer.from(await res.arrayBuffer());
    } finally {
        clearTimeout(timer);
    }
}

/** GET request to GiftedTech API, returns parsed data */
export async function get(path, params = {}, timeout = 30000) {
    return fetchJson(buildUrl(path, params), timeout);
}

/** David Cyril API base (secondary, free, no key) */
export const DAVID_BASE = 'https://apis.davidcyril.name.ng';

export async function davidGet(path, params = {}, timeout = 20000) {
    const u = new URL(`${DAVID_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
    return fetchJson(u.toString(), timeout);
}

/** Gifted Tools API */
export const TOOLS_BASE = 'https://api.gifted.co.ke/api/tools';

export async function toolsGet(endpoint, params = {}, timeout = 30000) {
    const u = new URL(`${TOOLS_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}

export async function toolsBuf(endpoint, params = {}, timeout = 45000) {
    const u = new URL(`${TOOLS_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchBuf(u.toString(), timeout);
}

/** Gifted Anime API */
export const ANIME_BASE = 'https://api.gifted.co.ke/api/anime';

export async function animeGet(endpoint, params = {}, timeout = 20000) {
    const u = new URL(`${ANIME_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}

/** Gifted Fun API */
export const FUN_BASE = 'https://api.gifted.co.ke/api/fun';

export async function funGet(endpoint, params = {}, timeout = 15000) {
    const u = new URL(`${FUN_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}

/** Gifted Stalker API */
export const STALKER_BASE = 'https://api.gifted.co.ke/api/stalk';

export async function stalkerGet(endpoint, params = {}, timeout = 25000) {
    const u = new URL(`${STALKER_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}

/** Gifted Search API */
export const SEARCH_BASE = 'https://api.gifted.co.ke/api/search';

export async function searchGet(endpoint, params = {}, timeout = 20000) {
    const u = new URL(`${SEARCH_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}

/** Gifted Textpro API */
export const TEXTPRO_BASE = 'https://api.gifted.co.ke/api/textpro';

export async function textproGet(endpoint, params = {}, timeout = 25000) {
    const u = new URL(`${TEXTPRO_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}

/** Gifted Tempgen API */
export const TEMPGEN_BASE = 'https://api.gifted.co.ke/api/tempgen';

export async function tempgenGet(endpoint, params = {}, timeout = 20000) {
    const u = new URL(`${TEMPGEN_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}

/** Gifted Ephoto360 API */
export const EPHOTO_BASE = 'https://api.gifted.co.ke/api/ephoto360';

export async function ephotoGet(endpoint, params = {}, timeout = 25000) {
    const u = new URL(`${EPHOTO_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}

/** Gifted Sports API */
export const GSPORTS_BASE = 'https://api.gifted.co.ke/api';

export async function sportsGet(endpoint, params = {}, timeout = 20000) {
    const u = new URL(`${GSPORTS_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}

export { BASE };
