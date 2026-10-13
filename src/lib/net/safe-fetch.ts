/**
 * Server-side download guard against SSRF (S0-Q.12).
 *
 * Rules for every request (including each redirect hop):
 * - https only, default port only, no user:password in the URL;
 * - the hostname must be on the caller's allow-list (exact match, lowercase);
 *   IP literals are never accepted (WHATWG URL already turns decimal/octal/hex
 *   IPv4 forms such as `2130706433` or `0177.0.0.1` into dotted form, which is
 *   refused because it is not an allow-listed name);
 * - every DNS answer for the host is checked; one private, loopback,
 *   link-local, multicast, reserved or otherwise non-public address refuses
 *   the request;
 * - the connection is pinned to the checked address (no second DNS lookup, so
 *   DNS rebinding cannot swap in another address);
 * - redirects only to the same host (re-checked), at most `maxRedirects`;
 * - response size and content type are limited.
 *
 * Kept free of `next/*` imports; DNS and the transport are injectable so the
 * unit test needs no network.
 */

import { BlockList, isIP } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';
import https from 'node:https';

export interface ResolvedAddress {
    address: string;
    family: number;
}

export type LookupFn = (hostname: string) => Promise<ResolvedAddress[]>;

export interface TransportRequest {
    url: URL;
    address: string;
    family: number;
    headers: Record<string, string>;
    timeoutMs: number;
    maxBytes: number;
}

export interface TransportResponse {
    status: number;
    headers: Record<string, string | undefined>;
    body: Buffer;
}

export type TransportFn = (req: TransportRequest) => Promise<TransportResponse>;

export interface SafeFetchOptions {
    allowedHosts: readonly string[];
    maxBytes: number;
    /** Lowercase media types without parameters. */
    allowedContentTypes: readonly string[];
    timeoutMs?: number;
    maxRedirects?: number;
    userAgent?: string;
    lookup?: LookupFn;
    transport?: TransportFn;
}

export class SafeFetchError extends Error {
    constructor(message: string, readonly code: string) {
        super(message);
        this.name = 'SafeFetchError';
    }
}

// Non-public ranges (IANA special-purpose registries). IPv4-mapped IPv6
// (::ffff:0:0/96) is refused in isBlockedAddress: adding it as a BlockList
// subnet would also match every plain IPv4 address.
const blocked = new BlockList();
for (const [net, prefix] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
    ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
    ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
    ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['64:ff9b:1::', 48],
    ['100::', 64], ['2001::', 23], ['2001:db8::', 32], ['2002::', 16],
    ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
] as const) blocked.addSubnet(net, prefix, 'ipv6');

/** True when the address must never be contacted (or is not an IP at all). */
export function isBlockedAddress(address: string): boolean {
    const family = isIP(address);
    if (family === 4) return blocked.check(address, 'ipv4');
    if (family === 6) {
        // IPv4-mapped (::ffff:a.b.c.d, ::ffff:7f00:1, 0:0:0:0:0:ffff:..., any spelling):
        // never a legitimate answer. URL parsing gives the canonical IPv6 form.
        let canonical = '';
        try { canonical = new URL(`http://[${address}]/`).hostname.toLowerCase(); } catch { return true; }
        if (canonical.startsWith('[::ffff:')) return true;
        return blocked.check(address, 'ipv6');
    }
    return true;
}

/** Checks the URL itself (no DNS). Returns the parsed URL or throws. */
export function checkUrl(raw: string, allowedHosts: readonly string[]): URL {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new SafeFetchError('Invalid URL', 'invalid_url');
    }
    if (url.protocol !== 'https:') throw new SafeFetchError('Only https URLs are allowed', 'protocol');
    if (url.username || url.password) throw new SafeFetchError('Credentials in URL are not allowed', 'credentials');
    if (url.port && url.port !== '443') throw new SafeFetchError('Non-default port is not allowed', 'port');
    const host = url.hostname.toLowerCase();
    if (isIP(host.replace(/^\[|\]$/g, ''))) throw new SafeFetchError('IP addresses are not allowed', 'ip_literal');
    if (!allowedHosts.map(h => h.toLowerCase()).includes(host)) {
        throw new SafeFetchError('Host is not allowed', 'host_not_allowed');
    }
    return url;
}

const defaultLookup: LookupFn = async (hostname) =>
    (await dnsLookup(hostname, { all: true, verbatim: true })).map(a => ({ address: a.address, family: a.family }));

/** https request pinned to an already-checked address; TLS still verifies the hostname. */
const defaultTransport: TransportFn = (req) =>
    new Promise((resolve, reject) => {
        const r = https.request(
            {
                protocol: 'https:',
                hostname: req.url.hostname,
                port: 443,
                path: req.url.pathname + req.url.search,
                method: 'GET',
                headers: req.headers,
                timeout: req.timeoutMs,
                // Pin the connection to the vetted address (no second DNS lookup).
                lookup: ((_host: string, opts: { all?: boolean }, cb: (...args: unknown[]) => void) => {
                    if (opts && opts.all) cb(null, [{ address: req.address, family: req.family }]);
                    else cb(null, req.address, req.family);
                }) as never,
            },
            (res) => {
                const chunks: Buffer[] = [];
                let size = 0;
                res.on('data', (chunk: Buffer) => {
                    size += chunk.length;
                    if (size > req.maxBytes) {
                        res.destroy();
                        reject(new SafeFetchError('Response too large', 'too_large'));
                        return;
                    }
                    chunks.push(chunk);
                });
                res.on('end', () => {
                    const headers: Record<string, string | undefined> = {};
                    for (const [k, v] of Object.entries(res.headers)) headers[k] = Array.isArray(v) ? v.join(', ') : v;
                    resolve({ status: res.statusCode || 0, headers, body: Buffer.concat(chunks) });
                });
                res.on('error', reject);
            }
        );
        r.on('timeout', () => r.destroy(new SafeFetchError('Request timed out', 'timeout')));
        r.on('error', reject);
        r.end();
    });

/** Resolve the host and return the first address, refusing if any answer is non-public. */
export async function resolvePublicAddress(hostname: string, lookup: LookupFn = defaultLookup): Promise<ResolvedAddress> {
    let answers: ResolvedAddress[];
    try {
        answers = await lookup(hostname);
    } catch {
        throw new SafeFetchError('DNS lookup failed', 'dns');
    }
    if (!answers.length) throw new SafeFetchError('DNS lookup failed', 'dns');
    for (const a of answers) {
        if (isBlockedAddress(a.address)) throw new SafeFetchError('Host resolves to a non-public address', 'blocked_address');
    }
    return answers[0];
}

/** Download `rawUrl` under the rules above. Returns the body and final content type. */
export async function safeDownload(
    rawUrl: string,
    opts: SafeFetchOptions
): Promise<{ body: Buffer; contentType: string; finalUrl: string }> {
    const lookup = opts.lookup || defaultLookup;
    const transport = opts.transport || defaultTransport;
    const maxRedirects = opts.maxRedirects ?? 3;
    const timeoutMs = opts.timeoutMs ?? 20000;

    let url = checkUrl(rawUrl, opts.allowedHosts);
    const firstHost = url.hostname.toLowerCase();

    for (let hop = 0; ; hop++) {
        const { address, family } = await resolvePublicAddress(url.hostname, lookup);
        const res = await transport({
            url,
            address,
            family,
            headers: { 'User-Agent': opts.userAgent || 'AgentPlayer/1.0', Accept: '*/*' },
            timeoutMs,
            maxBytes: opts.maxBytes,
        });

        if (res.status >= 300 && res.status < 400) {
            if (hop >= maxRedirects) throw new SafeFetchError('Too many redirects', 'redirects');
            const location = res.headers['location'];
            if (!location) throw new SafeFetchError('Redirect without location', 'redirect_location');
            let next: URL;
            try {
                next = new URL(location, url);
            } catch {
                throw new SafeFetchError('Invalid redirect URL', 'redirect_location');
            }
            const checked = checkUrl(next.toString(), opts.allowedHosts);
            if (checked.hostname.toLowerCase() !== firstHost) {
                throw new SafeFetchError('Redirect to another host is not allowed', 'redirect_host');
            }
            url = checked;
            continue;
        }

        if (res.status < 200 || res.status >= 300) throw new SafeFetchError(`Upstream status ${res.status}`, 'status');

        const declared = Number(res.headers['content-length']);
        if (Number.isFinite(declared) && declared > opts.maxBytes) throw new SafeFetchError('Response too large', 'too_large');
        if (res.body.length > opts.maxBytes) throw new SafeFetchError('Response too large', 'too_large');

        const contentType = (res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (!opts.allowedContentTypes.includes(contentType)) {
            throw new SafeFetchError('Content type is not allowed', 'content_type');
        }
        return { body: res.body, contentType, finalUrl: url.toString() };
    }
}
