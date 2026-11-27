import { describe, expect, it, vi } from "vitest";
import {
  extractNewsImage,
  fetchGoogleNews,
  fetchGoogleNewsWithImages,
} from "../news";

const rss = `<?xml version="1.0"?><rss><channel>
<item><title>BBCA naik - Kontan</title><link>https://example.com/a</link><pubDate>Mon, 23 Nov 2026 08:00:00 GMT</pubDate><source url="https://kontan.co.id">Kontan</source></item>
<item><title>BBCA turun - Bisnis</title><link>https://example.com/b</link><pubDate>Mon, 23 Nov 2026 09:00:00 GMT</pubDate><source url="https://bisnis.com">Bisnis</source></item>
</channel></rss>`;

describe("extractNewsImage", () => {
  it("reads og:image in either meta attribute order", () => {
    expect(
      extractNewsImage(
        '<meta property="og:image" content="https://img.example/a.jpg">',
        "https://example.com/article"
      )
    ).toBe("https://img.example/a.jpg");
    expect(
      extractNewsImage(
        '<meta content="/b.jpg" name="twitter:image">',
        "https://example.com/article"
      )
    ).toBe("https://example.com/b.jpg");
  });

  it("returns null when no image meta exists", () => {
    expect(extractNewsImage("<html></html>", "https://example.com")).toBeNull();
  });
});

describe("fetchGoogleNews", () => {
  it("parses Indonesian Google News RSS and strips the source suffix", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(rss, { status: 200 }));
    const items = await fetchGoogleNews("BBCA", 1, fetchMock);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("BBCA naik");
    expect(items[0].source).toBe("Kontan");
    expect(Number.isNaN(Date.parse(items[0].published_at!))).toBe(false);
  });
});

describe("fetchGoogleNewsWithImages", () => {
  it("matches decoded URLs by request id when Google reorders the batch", async () => {
    const rssWithLinks = `<?xml version="1.0"?><rss><channel>
      <item><title>TEST satu - Kontan</title><link>https://news.google.com/rss/articles/idA?hl=id&amp;gl=ID&amp;ceid=ID:id</link><source url="https://kontan.co.id">Kontan</source></item>
      <item><title>TEST dua - Bisnis</title><link>https://news.google.com/rss/articles/idB?hl=id&amp;gl=ID&amp;ceid=ID:id</link><source url="https://bisnis.com">Bisnis</source></item>
    </channel></rss>`;
    const paramsHtml =
      '<c-wiz><div jscontroller="x" data-n-a-sg="sig" data-n-a-ts="1795753735"></div></c-wiz>';
    const batch = JSON.stringify([
      [
        "wrb.fr",
        "Fbv4je",
        JSON.stringify(["garturlres", "https://publisher-b.com/b", 1]),
        null,
        null,
        null,
        "1",
      ],
      [
        "wrb.fr",
        "Fbv4je",
        JSON.stringify(["garturlres", "https://publisher-a.com/a", 1]),
        null,
        null,
        null,
        "0",
      ],
      ["di", 3],
    ]);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/rss/search")) return new Response(rssWithLinks);
      if (url.includes("/rss/articles/id")) return new Response(paramsHtml);
      if (url.includes("batchexecute")) {
        return new Response(`)]}'\n\n${batch}`);
      }
      if (url.startsWith("https://publisher-a.com")) {
        return new Response('<meta property="og:image" content="https://img/a.jpg">');
      }
      if (url.startsWith("https://publisher-b.com")) {
        return new Response('<meta property="og:image" content="https://img/b.jpg">');
      }
      return new Response("", { status: 404 });
    });

    const items = await fetchGoogleNewsWithImages("TEST", 2, fetchMock);
    expect(items[0].url).toBe("https://publisher-a.com/a");
    expect(items[0].image).toBe("https://img/a.jpg");
    expect(items[1].url).toBe("https://publisher-b.com/b");
    expect(items[1].image).toBe("https://img/b.jpg");
  });
});
