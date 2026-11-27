import { describe, expect, it } from "vitest";
import { extractHbaArticleUrl, extractHbaQuote } from "../coal";

const naikHtml = `
<html><head>
<meta property="og:title" content="HBA Periode Kedua November 2026 Naik 4,15 Persen Jadi USD 130,81 per Ton" />
<meta property="og:description" content="JAKARTA - Harga Batubara Acuan (HBA) kembali naik pada paruh kedua November 2026. Kementerian ESDM menetapkan HBA periode 15-30 November 2026 sebesar USD 130,81 per ton, naik USD 5,21 atau 4,15 persen dibandingkan periode pertama." />
</head></html>`;

const turunHtml = `
<html><head>
<meta property="og:title" content="HBA November Turun Tipis" />
<meta property="og:description" content="Pemerintah menetapkan Harga Batubara Acuan (HBA) periode pertama November 2026 sebesar USD125,60 per ton. Angka ini terkoreksi 0,95 persen, atau USD1,21 per ton, dari periode kedua Oktober 2026." />
</head></html>`;

describe("extractHbaQuote", () => {
  it("reads the main HBA price and period-over-period change", () => {
    const quote = extractHbaQuote(naikHtml, "https://esdm.example/hba");
    expect(quote).toEqual({
      price: 130.81,
      changePct: 4.15,
      period: "15-30 November 2026",
      sourceUrl: "https://esdm.example/hba",
    });
  });

  it("treats a decline as a negative change", () => {
    const quote = extractHbaQuote(turunHtml, "https://esdm.example/hba");
    expect(quote?.price).toBe(125.6);
    expect(quote?.changePct).toBe(-0.95);
    expect(quote?.period).toBe("pertama November 2026");
  });

  it("returns null when the page is not an HBA release", () => {
    expect(
      extractHbaQuote(
        '<meta property="og:description" content="Harga emas naik.">',
        "https://esdm.example/gold"
      )
    ).toBeNull();
  });
});

describe("extractHbaArticleUrl", () => {
  it("resolves the first HBA article link on a listing page", () => {
    const html = `
      <a href="/id/media-center/arsip-berita/other-news">Other</a>
      <a href="/id/media-center/arsip-berita/hba-periode-kedua-november-2026-naik-415-persen-jadi-usd-13081-per-ton">HBA</a>
    `;
    expect(extractHbaArticleUrl(html)).toBe(
      "https://www.esdm.go.id/id/media-center/arsip-berita/hba-periode-kedua-november-2026-naik-415-persen-jadi-usd-13081-per-ton"
    );
  });

  it("returns null when no HBA link exists", () => {
    expect(extractHbaArticleUrl("<a href=\"/news\">News</a>")).toBeNull();
  });
});
