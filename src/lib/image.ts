// Image helper. The GraphQL data points to a placeholder host
// (content.luxehotels.example) that doesn't actually serve images. To make
// the UI feel alive we map every URL to a stable Picsum seed derived from
// the URL's basename — same input → same image, so cards/hero stay consistent
// across renders.

// Fake hosts that the GraphQL data points to. None of these actually serve
// images — we deterministically rewrite to a stable Picsum seed so the same
// slot renders the same photo across reloads.
const FAKE_HOSTS = [
  "content.luxehotels.example",
  "luxehotels.example",
  "cdn.luxe.com",
];

function seedFromUrl(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) | 0;
  return String((Math.abs(h) % 1000) + 1);
}

export function imageUrl(
        url: string | null | undefined,
        opts: { w?: number; h?: number } = {},
): string {
  const { w = 1200, h = 800 } = opts;
  if (!url) return `https://picsum.photos/seed/luxe-default/${w}/${h}`;
  if (!FAKE_HOSTS.some((host) => url.includes(host))) return url;
  return `https://picsum.photos/seed/${seedFromUrl(url)}/${w}/${h}`;
}
