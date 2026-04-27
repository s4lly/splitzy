import fs from 'fs';
import path from 'path';

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://splitzy-prod.onrender.com';
const FETCH_TIMEOUT_MS = 1500;

let cachedTemplate = null;

function loadTemplate() {
  if (cachedTemplate) return cachedTemplate;
  // Vercel runs the function from the project root; the built SPA lives in dist/.
  // includeFiles in vercel.json bundles dist/index.html into the deployed function.
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'frontend', 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ];
  for (const p of candidates) {
    try {
      cachedTemplate = fs.readFileSync(p, 'utf8');
      return cachedTemplate;
    } catch {
      // try next
    }
  }
  throw new Error('index.html template not found');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return null;
  // Parse YYYY-MM-DD without timezone shifting.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTotal(total) {
  if (total === null || total === undefined) return null;
  const n = Number(total);
  if (!Number.isFinite(n)) return null;
  return `$${n.toFixed(2)}`;
}

function buildTagBlock({ pageTitle, ogTitle, description, url, image }) {
  const pt = escapeHtml(pageTitle);
  const ot = escapeHtml(ogTitle);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  const img = escapeHtml(image);
  return [
    `<title>${pt}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Splitzy" />`,
    `<meta property="og:title" content="${ot}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${u}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${ot}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ].join('\n    ');
}

function renderReceiptTags({ merchant, dateIso, total, host, id }) {
  const merchantText = merchant && merchant.trim() ? merchant.trim() : 'Receipt';
  const dateText = formatDate(dateIso);
  const totalText = formatTotal(total);

  const ogTitle = dateText
    ? `${merchantText} — ${dateText}`
    : merchantText;
  const pageTitle = `${ogTitle} · Splitzy`;

  const description = totalText
    ? `Receipt total ${totalText} · Split with friends on Splitzy`
    : 'Split this receipt with friends on Splitzy';

  const origin = host ? `https://${host}` : '';
  return buildTagBlock({
    pageTitle,
    ogTitle,
    description,
    url: `${origin}/receipts/${id}`,
    image: `${origin}/logo512.png`,
  });
}

async function fetchReceipt(id) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}/api/receipts/${id}/preview`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function injectTags(html, tagBlock) {
  const start = html.indexOf('<!--OG_TAGS-->');
  const end = html.indexOf('<!--/OG_TAGS-->');
  if (start === -1 || end === -1 || end < start) return html;
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
  let template;
  try {
    template = loadTemplate();
  } catch (err) {
    console.error('og-receipt: template load failed', err);
    res.status(500).send('Template not available');
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  let id = url.searchParams.get('id');
  if (!id) {
    // Fall back to parsing /receipts/:id or /receipt/:id from the path.
    const m = /\/receipts?\/([^/?#]+)/.exec(url.pathname);
    if (m) id = m[1];
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || '';

  let html;
  if (!id || !/^\d+$/.test(id)) {
    html = template;
  } else {
    const data = await fetchReceipt(id);
    if (!data) {
      html = template;
    } else {
      const tagBlock = renderReceiptTags({
        merchant: data.merchant,
        dateIso: data.date,
        total: data.total,
        host,
        id,
      });
      html = injectTags(template, tagBlock);
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );
  res.status(200).send(html);
}
