/**
 * Web fetcher and live news retrieval for screenshots containing partial articles,
 * news headlines, or external URLs.
 */

export async function fetchArticleFromUrl(url: string): Promise<string | null> {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      return null;
    }

    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Strip scripts, styles, navigation, footer tags
    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.slice(0, 3500);
  } catch (err) {
    console.warn("Failed to fetch article URL:", err);
    return null;
  }
}

export async function searchLiveWebNews(
  headlineOrQuery: string,
  ticker?: string | null
): Promise<string | null> {
  try {
    const cleanQuery = [ticker, headlineOrQuery]
      .filter(Boolean)
      .join(" ")
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanQuery) return null;

    // Search via DuckDuckGo HTML endpoint
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery + " saham IDX")}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const html = await res.text();

    const snippets: string[] = [];
    const snippetRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 4) {
      const cleanSnippet = match[1].replace(/<[^>]+>/g, "").trim();
      if (cleanSnippet) snippets.push(cleanSnippet);
    }

    if (snippets.length === 0) return null;

    return snippets.map((s, idx) => `${idx + 1}. ${s}`).join("\n");
  } catch (err) {
    console.warn("Failed to search live web news:", err);
    return null;
  }
}
