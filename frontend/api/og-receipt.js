import fs from 'fs';
import path from 'path';

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://splitzy-prod.onrender.com';
const FETCH_TIMEOUT_MS = 1500;

let cachedTemplate = null;

/**
 * Load the SPA's index.html template from disk, caching it in module scope so
 * repeated invocations of the serverless function avoid redundant file reads.
 *
 * Vercel runs this function from the project root; the built SPA lives in
 * dist/. The `includeFiles` entry in vercel.json bundles dist/index.html into
 * the deployed function so one of the candidate paths below resolves.
 *
 * @returns {string} The raw HTML contents of index.html.
 * @throws {Error} If none of the candidate paths contain a readable template.
 *
 * @example
 *   const html = loadTemplate();
 *   // -> "<!doctype html>\n<html>...</html>"
 */
function loadTemplate() {
  if (cachedTemplate) return cachedTemplate;

  // Candidate locations cover local dev, the Vercel-bundled function, and a
  // fallback for running the file from the repo root during testing.
  const candidatePaths = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'frontend', 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ];

  // Return the contents of the first candidate that exists and is readable.
  for (const candidatePath of candidatePaths) {
    try {
      cachedTemplate = fs.readFileSync(candidatePath, 'utf8');
      return cachedTemplate;
    } catch {
      // try next
    }
  }

  throw new Error('index.html template not found');
}

/**
 * Escape a value for safe interpolation into HTML attribute or text content.
 * Replaces the five characters that can break out of an attribute or element
 * context: &, <, >, ", and '.
 *
 * @param {unknown} value - Any value; coerced to string before escaping.
 * @returns {string} The HTML-escaped string.
 *
 * @example
 *   escapeHtml('Tom & Jerry "show"');
 *   // -> 'Tom &amp; Jerry &quot;show&quot;'
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a YYYY-MM-DD date string for display in OG previews. Parses the date
 * components manually and constructs a UTC Date so that locale formatting does
 * not shift the day across a timezone boundary (a common bug with `new
 * Date('2025-01-01')` in non-UTC zones).
 *
 * @param {string|null|undefined} iso - An ISO-style date string. Only the
 *   leading YYYY-MM-DD portion is consulted; trailing time/zone is ignored.
 * @returns {string|null} The formatted date (e.g. "Jan 1, 2025"), or null if
 *   input is missing or doesn't match the expected shape.
 *
 * @example
 *   formatDate('2025-01-01');         // -> 'Jan 1, 2025'
 *   formatDate('2025-01-01T10:00Z');  // -> 'Jan 1, 2025'
 *   formatDate(null);                 // -> null
 */
function formatDate(iso) {
  if (!iso) return null;

  // Parse YYYY-MM-DD manually to avoid timezone shifting from Date parsing.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match;

  // Build the date in UTC and format in UTC so the day component stays stable
  // regardless of the server's local timezone.
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format a numeric total for display, preferring proper currency formatting
 * when a valid ISO 4217 code is supplied. Falls back to a neutral 2-decimal
 * representation when no currency is given or the code is unsupported.
 *
 * @param {number|string|null|undefined} total - The total amount.
 * @param {string|null|undefined} currency - 3-letter ISO currency code.
 * @returns {string|null} Formatted amount, or null if total is missing /
 *   non-finite.
 *
 * @example
 *   formatTotal(12.5, 'USD');  // -> '$12.50'
 *   formatTotal(12.5, 'EUR');  // -> '€12.50'
 *   formatTotal(12.5, null);   // -> '12.50'
 *   formatTotal(null, 'USD');  // -> null
 */
function formatTotal(total, currency) {
  if (total === null || total === undefined) return null;

  // Coerce to number and reject inputs that don't represent a finite value.
  const amount = Number(total);
  if (!Number.isFinite(amount)) return null;

  // Try Intl currency formatting only when the supplied code looks like a
  // 3-letter ISO 4217 currency. Intl will throw on unsupported codes.
  if (currency && /^[A-Za-z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount);
    } catch {
      // Fall through to neutral format on unsupported codes.
    }
  }

  // Neutral fallback: 2-decimal number with no currency symbol.
  return amount.toFixed(2);
}

/**
 * Build the block of <title> and OpenGraph/Twitter meta tags as an indented
 * HTML string ready to be injected into the page head. All values are
 * HTML-escaped before interpolation.
 *
 * @param {object} params
 * @param {string} params.pageTitle - Text for the <title> element.
 * @param {string} params.ogTitle - Text for og:title and twitter:title.
 * @param {string} params.description - Description for meta + og + twitter.
 * @param {string} params.url - Canonical URL for og:url.
 * @param {string} params.image - Absolute URL of the preview image.
 * @returns {string} A newline-separated block of tag strings (no leading
 *   indent on the first line; subsequent lines are indented to align under
 *   the surrounding <!--OG_TAGS--> marker).
 *
 * @example
 *   buildTagBlock({
 *     pageTitle: 'Receipt · Splitzy',
 *     ogTitle: 'Receipt',
 *     description: 'Split with friends',
 *     url: 'https://splitzy.app/r/abc',
 *     image: 'https://splitzy.app/logo512.png',
 *   });
 */
function buildTagBlock({ pageTitle, ogTitle, description, url, image }) {
  // Escape every interpolated value so user-controlled fields (merchant name,
  // currency-formatted totals) cannot break out of the attribute context.
  const safePageTitle = escapeHtml(pageTitle);
  const safeOgTitle = escapeHtml(ogTitle);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeImage = escapeHtml(image);

  return [
    `<title>${safePageTitle}</title>`,
    `<meta name="description" content="${safeDescription}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Splitzy" />`,
    `<meta property="og:title" content="${safeOgTitle}" />`,
    `<meta property="og:description" content="${safeDescription}" />`,
    `<meta property="og:url" content="${safeUrl}" />`,
    `<meta property="og:image" content="${safeImage}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${safeOgTitle}" />`,
    `<meta name="twitter:description" content="${safeDescription}" />`,
    `<meta name="twitter:image" content="${safeImage}" />`,
  ].join('\n    ');
}

/**
 * Compose the OG/Twitter tag block specifically for a receipt preview, given
 * the receipt's basic fields plus the request host and the canonical path the
 * crawler is fetching.
 *
 * @param {object} params
 * @param {string|null|undefined} params.merchant - Merchant name (may be empty).
 * @param {string|null|undefined} params.dateIso - Receipt date in ISO form.
 * @param {number|string|null|undefined} params.total - Receipt total.
 * @param {string|null|undefined} params.currency - ISO 4217 currency code.
 * @param {string} params.host - The request host (used to build absolute URLs).
 * @param {string} params.canonicalPath - The canonical path for og:url.
 * @returns {string} The rendered tag block (see buildTagBlock).
 *
 * @example
 *   renderReceiptTags({
 *     merchant: 'Acme Diner',
 *     dateIso: '2025-01-01',
 *     total: 42.5,
 *     currency: 'USD',
 *     host: 'splitzy.app',
 *     canonicalPath: '/r/abc',
 *   });
 */
function renderReceiptTags({
  merchant,
  dateIso,
  total,
  currency,
  host,
  canonicalPath,
}) {
  // Derive a non-empty merchant label for the title; fall back to "Receipt"
  // when the merchant field is missing or just whitespace.
  let merchantText;
  if (merchant && merchant.trim()) {
    // Trimmed merchant name was provided; use it as the label.
    merchantText = merchant.trim();
  } else {
    // No usable merchant name; use a generic label.
    merchantText = 'Receipt';
  }

  // Format optional date and total. Either may be null when missing.
  const dateText = formatDate(dateIso);
  const totalText = formatTotal(total, currency);

  // Build titles. Append the date to the OG title only when one is available.
  let ogTitle;
  if (dateText) {
    // Date is present, so include it after an em-dash for context.
    ogTitle = `${merchantText} — ${dateText}`;
  } else {
    // No date to display; fall back to just the merchant label.
    ogTitle = merchantText;
  }
  const pageTitle = `${ogTitle} · Splitzy`;

  // Description prefers the formatted total when we have one; otherwise we
  // ship a generic "split this receipt" message.
  let description;
  if (totalText) {
    // We have a formatted total, so surface it for richer link previews.
    description = `Receipt total ${totalText} · Split with friends on Splitzy`;
  } else {
    // No total available; use a generic call-to-action.
    description = 'Split this receipt with friends on Splitzy';
  }

  // Build absolute URLs for og:url and og:image off the request host.
  let origin;
  if (host) {
    // Host header was set, so we can produce a concrete absolute origin.
    origin = `https://${host}`;
  } else {
    // No host available; fall back to relative URLs (better than guessing).
    origin = '';
  }

  return buildTagBlock({
    pageTitle,
    ogTitle,
    description,
    url: `${origin}${canonicalPath}`,
    image: `${origin}/logo512.png`,
  });
}

/**
 * GET a JSON resource from the backend with a hard timeout. Failures (timeout,
 * network error, non-2xx) are logged at warn level and surfaced to the caller
 * as `null` so the OG handler can fall back to the un-enriched template.
 *
 * @param {string} pathSuffix - Path appended to BACKEND_URL, including the
 *   leading slash (e.g. "/api/receipts/preview/abc").
 * @returns {Promise<object|null>} Parsed JSON on success, or null on any
 *   failure mode.
 *
 * @example
 *   const data = await fetchBackend('/api/receipts/preview/abc123');
 *   if (data) { ... }
 */
async function fetchBackend(pathSuffix) {
  // Set up an abort-on-timeout controller so a slow backend can't stall the
  // edge function past FETCH_TIMEOUT_MS.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const url = `${BACKEND_URL}${pathSuffix}`;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    // Treat any non-2xx as a soft failure; log enough to debug but return null
    // so the caller renders the un-enriched template.
    if (!response.ok) {
      console.warn(
        `og-receipt: backend non-OK ${response.status} ${response.statusText} for ${url}`
      );
      return null;
    }

    return await response.json();
  } catch (err) {
    // Build a readable error description without leaking object identity.
    let errorName;
    if (err && err.name) {
      // Standard Error-like object; prefix with the error name for grep-ability.
      errorName = `${err.name}: `;
    } else {
      // Non-Error throw (e.g. a string); skip the prefix.
      errorName = '';
    }

    let errorMessage;
    if (err && err.message) {
      // Standard Error-like object; use its message field.
      errorMessage = err.message;
    } else {
      // Non-Error throw; stringify whatever we got.
      errorMessage = err;
    }

    console.warn(
      `og-receipt: backend fetch failed for ${url}: ${errorName}${errorMessage}`
    );
    return null;
  } finally {
    // Always clear the timeout so it can't fire after the fetch resolved.
    clearTimeout(timer);
  }
}

/**
 * Replace the contents of the `<!--OG_TAGS--> ... <!--/OG_TAGS-->` marker
 * region in the SPA template with the given tag block. If the markers are
 * missing or malformed, returns the original HTML unchanged so we never ship
 * a broken template.
 *
 * @param {string} html - The full index.html template.
 * @param {string} tagBlock - The tag block to inject (see buildTagBlock).
 * @returns {string} The HTML with the marker region replaced.
 *
 * @example
 *   const out = injectTags(template, '<title>Hi</title>');
 */
function injectTags(html, tagBlock) {
  // Locate the begin/end marker comments. Both must be present and ordered.
  const start = html.indexOf('<!--OG_TAGS-->');
  const end = html.indexOf('<!--/OG_TAGS-->');
  if (start === -1 || end === -1 || end < start) return html;

  // Splice the tag block between the markers, preserving them so subsequent
  // injections (e.g. on a re-render) still find their anchor.
  const endTagLen = '<!--/OG_TAGS-->'.length;
  return (
    html.slice(0, start) +
    '<!--OG_TAGS-->\n    ' +
    tagBlock +
    '\n    <!--/OG_TAGS-->' +
    html.slice(end + endTagLen)
  );
}

export default async function handler(req, res) {
  // Load the SPA template; without it we have nothing to serve.
  let template;
  try {
    template = loadTemplate();
  } catch (err) {
    console.error('og-receipt: template load failed', err);
    res.status(500).send('Template not available');
    return;
  }

  // Parse the incoming URL. The base is a placeholder since we only care
  // about pathname + searchParams.
  const url = new URL(req.url, 'http://localhost');

  // Resolve the share token from either the `?t=` query param or the /r/:token
  // path segment, in that order.
  let token = url.searchParams.get('t');
  if (!token) {
    const tokenMatch = /\/r\/([^/?#]+)/.exec(url.pathname);
    if (tokenMatch) token = tokenMatch[1];
  }

  // Resolve the legacy numeric receipt id from `?legacy_id=` or the
  // /receipts/:id path segment, in that order.
  let legacyId = url.searchParams.get('legacy_id');
  if (!legacyId) {
    const legacyMatch = /\/receipts?\/([^/?#]+)/.exec(url.pathname);
    if (legacyMatch) legacyId = legacyMatch[1];
  }

  // Prefer the proxy-set host header when present (Vercel forwards this).
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';

  // Fetch preview data from the backend, picking the endpoint and canonical
  // URL based on which identifier we resolved.
  let data = null;
  let canonicalPath = null;

  // Share tokens are URL-safe base64 from secrets.token_urlsafe(16) — 22
  // chars, alphabet [A-Za-z0-9_-]. Validate cheaply before hitting the API.
  if (token && /^[A-Za-z0-9_-]{1,32}$/.test(token)) {
    data = await fetchBackend(
      `/api/receipts/preview/${encodeURIComponent(token)}`
    );
    canonicalPath = `/r/${token}`;
  } else if (legacyId && /^\d+$/.test(legacyId)) {
    data = await fetchBackend(`/api/receipts/legacy-preview/${legacyId}`);
    // Preserve the URL the crawler was actually fetching — don't surprise it.
    canonicalPath = `/receipts/${legacyId}`;
  }

  // Render either the enriched template (when we have data) or the bare
  // template (on missing/invalid identifiers or backend failure).
  let html;
  if (data && canonicalPath) {
    // We have receipt data; build OG tags and inject them into the template.
    const tagBlock = renderReceiptTags({
      merchant: data.merchant,
      dateIso: data.date,
      total: data.total,
      currency: data.currency,
      host,
      canonicalPath,
    });
    html = injectTags(template, tagBlock);
  } else {
    // No data fetched; serve the un-enriched template so the SPA still loads.
    html = template;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // Long cache on success, short cache on fallback so transient backend
  // hiccups don't pin a poor preview at the CDN for an hour.
  let cacheControl;
  if (data) {
    // Successfully enriched response; safe to cache aggressively at the edge.
    cacheControl = 'public, s-maxage=3600, stale-while-revalidate=86400';
  } else {
    // Fallback response; cache briefly so we recover quickly once the backend
    // is healthy again.
    cacheControl = 'public, max-age=60, s-maxage=300';
  }
  res.setHeader('Cache-Control', cacheControl);

  res.status(200).send(html);
}
