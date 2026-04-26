import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";

const PRIVATE_RANGES_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
];
const PRIVATE_RANGES_V6 = [/^::1$/i, /^fc/i, /^fe80/i];

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return PRIVATE_RANGES_V4.some((pattern) => pattern.test(ip));
  }

  if (net.isIPv6(ip)) {
    return PRIVATE_RANGES_V6.some((pattern) => pattern.test(ip));
  }

  return false;
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  if (!hostname) {
    throw new Error("ssrf:empty-host");
  }

  if (hostname === "localhost") {
    throw new Error("ssrf:localhost");
  }

  const records = await dnsLookup(hostname, { all: true });
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new Error(`ssrf:private-ip:${record.address}`);
    }
  }
}

export async function assertSafeUrl(url: string): Promise<URL> {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:") {
    throw new Error("ssrf:not-https");
  }

  await assertPublicHostname(parsed.hostname);
  return parsed;
}
