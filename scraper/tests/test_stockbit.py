import unittest
from unittest import mock
from urllib.parse import quote

from scraper.stockbit import (
    CHART_CACHE,
    get_chart,
    parse_broker_summary,
    parse_credential_storage,
    parse_quote,
)

ACCESS = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQwMDAwMDAwMDAsInR5cGUiOiJhY2Nlc3MifQ.signature"
REFRESH = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQwMDAwMDAwMDAsInR5cGUiOiJyZWZyZXNoIn0.signature"


class CredentialStorageTests(unittest.TestCase):
    def test_parses_url_encoded_cookie(self):
        blob = quote(
            '{"state":{"access":{"token":"%s"},"refresh":{"token":"%s"}}}'
            % (ACCESS, REFRESH)
        )
        session = parse_credential_storage(blob)
        self.assertEqual(session.access, ACCESS)
        self.assertEqual(session.refresh, REFRESH)

    def test_accepts_bare_refresh_token(self):
        session = parse_credential_storage(REFRESH)
        self.assertEqual(session.refresh, REFRESH)
        self.assertEqual(session.access, "")

    def test_rejects_garbage(self):
        self.assertIsNone(parse_credential_storage("not-a-session"))


class BrokerSummaryTests(unittest.TestCase):
    def test_maps_buyers_and_sellers(self):
        payload = {
            "data": {
                "from": "2026-11-02",
                "to": "2026-11-06",
                "bandar_detector": {"total_buyer": 2, "total_seller": 2},
                "broker_summary": {
                    "brokers_buy": [
                        {
                            "netbs_broker_code": "KZ",
                            "blot": "10",
                            "bval": "1000000",
                            "freq": "3",
                            "netbs_buy_avg_price": "1000",
                            "type": "Asing",
                        },
                        {
                            "netbs_broker_code": "AK",
                            "blot": "5",
                            "bval": "500000",
                            "freq": "2",
                            "netbs_buy_avg_price": "1000",
                        },
                    ],
                    "brokers_sell": [
                        {
                            "netbs_broker_code": "KZ",
                            "slot": "4",
                            "sval": "400000",
                            "freq": "1",
                            "netbs_sell_avg_price": "1000",
                        },
                        {
                            "netbs_broker_code": "CC",
                            "slot": "6",
                            "sval": "600000",
                            "freq": "2",
                            "netbs_sell_avg_price": "1000",
                        },
                    ],
                },
            }
        }
        result = parse_broker_summary(payload, "BBCA", "2026-11-06")
        self.assertEqual(result["source"], "stockbit")
        self.assertEqual(result["coverage"], "full")
        rows = {row["broker_code"]: row for row in result["data"][0]["summary"]}
        self.assertEqual(rows["KZ"]["blot"], 10)
        self.assertEqual(rows["KZ"]["slot"], 4)
        self.assertEqual(rows["KZ"]["nlot"], 6)
        self.assertEqual(rows["KZ"]["nval"], 600000)
        self.assertEqual(rows["CC"]["nlot"], -6)
        self.assertEqual(result["data"][0]["date"], "2026-11-06")


class ChartTests(unittest.TestCase):
    def setUp(self):
        CHART_CACHE.clear()

    def test_maps_daily_candles_and_deduplicates(self):
        payload = {
            "data": {
                "prices": [
                    {
                        "date": "1795399200000",
                        "value": "5750",
                        "open": "5700",
                        "high": "5800",
                        "low": "5650",
                        "volume": "1200",
                    },
                    {
                        "date": "1795485600000",
                        "value": "5800",
                        "open": "5750",
                        "high": "5850",
                        "low": "5700",
                        "volume": "2400",
                    },
                    {
                        "date": "1795485600000",
                        "value": "5800",
                        "open": "5750",
                        "high": "5850",
                        "low": "5700",
                        "volume": "2400",
                    },
                ]
            }
        }
        with mock.patch("scraper.stockbit._request_json", return_value=payload) as request:
            result = get_chart("bbca", "1Y")

        self.assertEqual(result["symbol"], "BBCA")
        self.assertEqual(result["source"], "stockbit")
        self.assertEqual(len(result["candles"]), 2)
        self.assertEqual(result["candles"][0]["time"], 1795399200)
        self.assertEqual(result["candles"][0]["close"], 5750)
        self.assertEqual(result["candles"][0]["volume"], 120000)
        self.assertEqual(result["last"]["close"], 5800)
        self.assertEqual(result["previous_close"], 5750)
        request.assert_called_once_with(
            "/charts/BBCA/daily",
            {"timeframe": "1y", "chart_type": "PRICE_CHART_TYPE_CANDLE"},
        )

    def test_intraday_keeps_only_latest_session(self):
        payload = {
            "data": {
                "prices": [
                    {"date": "1795399200000", "value": "5700", "volume": "10"},
                    {"date": "1795485600000", "value": "5750", "volume": "20"},
                    {"date": "1795489200000", "value": "5780", "volume": "30"},
                ]
            }
        }
        with mock.patch("scraper.stockbit._request_json", return_value=payload):
            result = get_chart("BBCA", "1D")

        self.assertEqual(len(result["candles"]), 2)
        self.assertEqual(result["candles"][-1]["close"], 5780)
        self.assertEqual(result["previous_close"], 5700)

    def test_empty_payload_reports_limitation(self):
        with mock.patch(
            "scraper.stockbit._request_json", return_value={"data": {"prices": []}}
        ):
            result = get_chart("BBCA", "5Y")

        self.assertEqual(result["candles"], [])
        self.assertIsNone(result["last"])
        self.assertTrue(result["limitations"])


class QuoteTests(unittest.TestCase):
    def test_maps_orderbook_quote(self):
        payload = {
            "data": {
                "symbol": "BBCA",
                "lastprice": "5825",
                "open": "5825",
                "high": "5850",
                "low": "5750",
                "close": "5800",
                "change": 25,
                "volume": "164649600",
                "value": "955107295000",
                "frequency": "1000",
                "fbuy": "800159955000",
                "fsell": "477131635000",
                "fnet": "323028320000",
                "has_foreign_bs": True,
                "bid": [{"price": "5800", "volume": "3637200"}],
                "offer": [{"price": "5825", "volume": "13477800"}],
                "ara": {"value": "6,975", "visible": True},
                "arb": {"value": "5,425", "visible": True},
            }
        }
        quote = parse_quote(payload, "BBCA")
        self.assertEqual(quote["symbol"], "BBCA")
        self.assertEqual(quote["last"], 5825)
        self.assertEqual(quote["previous_close"], 5800)
        self.assertEqual(quote["change_pct"], 0.43)
        self.assertEqual(quote["volume"], 164649600)
        self.assertEqual(quote["value"], 955107295000)
        self.assertEqual(quote["foreign_net"], 323028320000)
        self.assertTrue(quote["foreign_current"])
        self.assertEqual(quote["bid"], 5800)
        self.assertEqual(quote["offer"], 5825)
        self.assertEqual(quote["ara"], 6975)
        self.assertEqual(quote["arb"], 5425)


if __name__ == "__main__":
    unittest.main()
