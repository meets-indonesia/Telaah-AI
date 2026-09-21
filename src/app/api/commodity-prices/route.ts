import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface CommodityHistoryPoint {
  date: string;
  price: number;
}

export interface CommodityData {
  name: string;
  code: string;
  unit: string;
  latestPrice: number;
  changePct: number;
  history: CommodityHistoryPoint[];
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.SECTORS_API_KEY || "";
  const authHeaders = { Authorization: apiKey };

  const commodities = [
    { key: "coal", name: "Newcastle Coal", unit: "USD / Ton" },
    { key: "gold", name: "COMEX Gold", unit: "USD / Oz" },
    { key: "copper", name: "LME Copper", unit: "USD / Ton" },
    { key: "nickel", name: "LME Nickel", unit: "USD / Ton" },
  ];

  try {
    const results = await Promise.all(
      commodities.map(async (c) => {
        try {
          const res = await fetch(
            `https://api.sectors.app/v2/mining/commodities/${c.key}/price/`,
            { headers: authHeaders }
          );
          if (!res.ok) return null;
          const data = await res.json();
          if (!Array.isArray(data) || data.length === 0) return null;

          const history = data.slice(-24).map((d: any) => ({
            date: d.date,
            price: Number(d.price_usd_per_ton.toFixed(2)),
          }));

          const latest = history[history.length - 1];
          const prev = history.length > 1 ? history[history.length - 2] : null;
          const changePct = prev && prev.price > 0
            ? Number((((latest.price - prev.price) / prev.price) * 100).toFixed(2))
            : 0;

          return {
            name: c.name,
            code: c.key.toUpperCase(),
            unit: c.unit,
            latestPrice: latest.price,
            changePct,
            history,
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      success: true,
      commodities: results.filter(Boolean),
    });
  } catch (error: any) {
    console.error("Error fetching commodity prices:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat harga komoditas." },
      { status: 500 }
    );
  }
}
