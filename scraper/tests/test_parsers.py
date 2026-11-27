import unittest

from scraper.idx import (
    normalize_announcements,
    normalize_foreign_flow,
    normalize_profile,
)
from scraper.insider_parser import parse_ownership_text

OWNERSHIP_TEXT = """
LAPORAN KEPEMILIKAN ATAU SETIAP PERUBAHAN
KEPEMILIKAN SAHAM PERUSAHAAN TERBUKA

Nama (sesuai SID) : HARYANTO TIARA BUDIMAN
Anggota Direksi/Dewan Komisaris : Ya
Jabatan : Direksi
Nama Perusahaan Tbk : BBCA - BANK CENTRAL ASIA Tbk, PT
Jumlah Saham Sebelum Transaksi : 1.057.378,00 Unit
Hak Suara Sebelum Transaksi : 0,001%
Jumlah Saham Setelah Transaksi : 1.436.806,00 Unit
Hak Suara Setelah Transaksi : 0,001%

Pembelian Tidak Langsung - - - 379.428,00 Saham Biasa 6.982,00 25- Mar- 2026 Investasi jangka panjang
"""


class ForeignFlowTests(unittest.TestCase):
    def test_normalizes_idx_replies(self):
        payload = {
            "replies": [
                {
                    "Date": "2026-11-23T00:00:00",
                    "ForeignBuy": 1000,
                    "ForeignSell": 400,
                    "Close": 5000,
                    "StockCode": "BBCA",
                }
            ]
        }
        result = normalize_foreign_flow(payload, "bbca")
        self.assertEqual(result["symbol"], "BBCA")
        self.assertEqual(result["data"][0]["net_foreign_shares"], 600)
        self.assertEqual(result["data"][0]["net_foreign_inflow"], 3_000_000)
        self.assertEqual(result["data"][0]["date"], "2026-11-23")


class ProfileTests(unittest.TestCase):
    def test_maps_profile_directors_and_shareholders(self):
        payload = {
            "Profiles": [
                {
                    "NamaEmiten": "PT Bank Central Asia Tbk.",
                    "Alamat": "Jakarta",
                    "Website": "www.bca.co.id",
                    "Sektor": "Keuangan",
                    "SubSektor": "Bank",
                    "Industri": "Bank",
                    "SubIndustri": "Bank",
                    "PapanPencatatan": "Utama",
                    "TanggalPencatatan": "2000-05-31T00:00:00",
                    "KegiatanUsahaUtama": "Jasa Perbankan",
                }
            ],
            "Direktur": [{"Nama": "Direktur Satu", "Jabatan": "PRESIDEN DIREKTUR"}],
            "Komisaris": [{"Nama": "Komisaris Satu", "Jabatan": "KOMISARIS"}],
            "PemegangSaham": [
                {
                    "Nama": "PT Pemegang",
                    "Persentase": 54.942,
                    "Jumlah": 67_000_000_000,
                    "Kategori": "Lebih dari 5%",
                    "Pengendali": True,
                }
            ],
        }
        result = normalize_profile(payload, "BBCA")
        self.assertEqual(result["company_name"], "PT Bank Central Asia Tbk.")
        self.assertEqual(result["overview"]["sector"], "Keuangan")
        self.assertEqual(len(result["management"]["key_executives"]), 2)
        self.assertEqual(result["ownership"]["major_shareholders"][0]["percentage"], 54.942)


class AnnouncementTests(unittest.TestCase):
    def test_maps_announcement_and_pdf(self):
        payload = {
            "Replies": [
                {
                    "pengumuman": {
                        "Id2": "20260326-1",
                        "TglPengumuman": "2026-03-26T17:05:49",
                        "JudulPengumuman": "LAPORAN KEPEMILIKAN SAHAM",
                        "PerihalPengumuman": "Laporan Kepemilikan Saham",
                        "Kode_Emiten": "BBCA    ",
                        "JenisPengumuman": "STOCK",
                    },
                    "attachments": [
                        {
                            "FullSavePath": "https://www.idx.co.id/file.pdf",
                            "OriginalFilename": "file.pdf",
                        }
                    ],
                }
            ]
        }
        result = normalize_announcements(payload)
        self.assertEqual(result[0]["symbol"], "BBCA")
        self.assertEqual(result[0]["attachment_url"], "https://www.idx.co.id/file.pdf")


class InsiderParserTests(unittest.TestCase):
    def test_parses_ownership_pdf_text(self):
        result = parse_ownership_text(
            OWNERSHIP_TEXT,
            symbol="BBCA",
            title="LAPORAN KEPEMILIKAN SAHAM",
            announcement_date="2026-03-26",
            filing_id="20260326-1",
            attachment_url="https://www.idx.co.id/file.pdf",
        )
        self.assertEqual(result["holder_name"], "HARYANTO TIARA BUDIMAN")
        self.assertEqual(result["holder_type"], "insider")
        self.assertEqual(result["transaction_type"], "buy")
        self.assertEqual(result["amount_transaction"], 379_428)
        self.assertEqual(result["price"], 6_982)
        self.assertEqual(result["date"], "2026-03-25")
        self.assertEqual(result["share_percentage_before"], 0.001)
        self.assertFalse(result["unparsed"])

    def test_parses_a_table_split_across_lines(self):
        text = OWNERSHIP_TEXT.replace(
            "Pembelian Tidak Langsung - - - 379.428,00 Saham Biasa 6.982,00 25- Mar- 2026 Investasi jangka panjang",
            "Pembelian Tidak Langsung - - - 379.428,00 Saham \nBiasa 6.982,00 25-Mar-\n2026 Investasi jangka panjang",
        )
        result = parse_ownership_text(
            text,
            symbol="BBCA",
            title="LAPORAN KEPEMILIKAN SAHAM",
            announcement_date="2026-03-26",
            filing_id="20260326-1",
            attachment_url="https://www.idx.co.id/file.pdf",
        )
        self.assertEqual(result["amount_transaction"], 379_428)
        self.assertEqual(result["price"], 6_982)
        self.assertEqual(result["date"], "2026-03-25")


if __name__ == "__main__":
    unittest.main()
