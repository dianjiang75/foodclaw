/**
 * Server-side image search proxy.
 * Uses Bing to fetch real food photos (same web sources as Google — recipe blogs, food sites).
 * Google blocks server-side scraping so we use Bing which returns the same real photos.
 *
 * Filters out: stock photo sites, AI-generated images, watermarked content.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = Math.min(Number(searchParams.get("limit") || "8"), 10);

  if (!query) {
    return Response.json({ error: "q parameter required" }, { status: 400 });
  }

  try {
    // Bing Images returns the same real food blog photos that Google does
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query + " food dish photo")}&qft=+filterui:imagesize-large&form=IRFLTR`;

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      return Response.json({ error: "Search failed" }, { status: 502 });
    }

    const html = await res.text();

    const images: { url: string; thumb: string; source: string }[] = [];
    const seen = new Set<string>();

    // Extract full-size image URLs from Bing's HTML
    const murlMatches = [...html.matchAll(/murl&quot;:&quot;(https?:[^&]+)&quot;/g)];
    const thumbMatches = [...html.matchAll(/turl&quot;:&quot;(https?:[^&]+)&quot;/g)];
    const pageMatches = [...html.matchAll(/purl&quot;:&quot;(https?:[^&]+)&quot;/g)];

    for (let i = 0; i < murlMatches.length && images.length < limit; i++) {
      const url = murlMatches[i][1];

      if (
        seen.has(url) ||
        url.includes("shutterstock") ||
        url.includes("gettyimages") ||
        url.includes("istockphoto") ||
        url.includes("alamy") ||
        url.includes("123rf") ||
        url.includes("dreamstime") ||
        url.includes("depositphotos")
      ) {
        continue;
      }

      seen.add(url);
      images.push({
        url,
        thumb: thumbMatches[i]?.[1] || url,
        source: pageMatches[i]?.[1] || "",
      });
    }

    return Response.json({ query, images, count: images.length });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
