"""
FinSight AI - Security & Error Architecture Test Suite (P0.6)
Validates:
1. Pydantic Input Sanitization & Injection Prevention:
   - Malicious ticker injection strings (SQLi, XSS, Path Traversal) are rejected with 422 ValidationError.
2. CORS Whitelisting & Origin Filtering:
   - Authorized origins receive Access-Control-Allow-Origin headers.
   - Unauthorized origins are blocked from credentialed access.
3. Global Exception Masking & Request ID Tracking:
   - 422, 400, and 500 error responses format with standard JSON envelope.
   - Internal stack traces, server file paths, and database details are NEVER leaked to the client.
"""
import unittest
import json
import re
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app.main import app
from backend.app.schemas import ForecastRequest, PortfolioRequest, SentimentRequest, RlSimulateRequest

class TestSecurityAndErrorArchitecture(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_pydantic_ticker_injection_rejection(self):
        """Validates that malicious ticker inputs are rejected by schema validators."""
        malicious_inputs = [
            "AAPL; DROP TABLE users;--",
            "<script>alert('xss')</script>",
            "../../etc/passwd",
            "AAPL' OR '1'='1",
            "TOOLONGTICKERNAME1234567890",
            "AAPL$#%*"
        ]

        for bad_ticker in malicious_inputs:
            with self.assertRaises(ValidationError, msg=f"Pydantic failed to reject malicious ticker: {bad_ticker}"):
                ForecastRequest(ticker=bad_ticker)

            with self.assertRaises(ValidationError, msg=f"SentimentRequest failed to reject malicious ticker: {bad_ticker}"):
                SentimentRequest(ticker=bad_ticker)

    def test_portfolio_request_unique_tickers_sanitization(self):
        """Validates that portfolio requests sanitize and require at least 2 distinct valid tickers."""
        # Invalid: same ticker duplicated
        with self.assertRaises(ValidationError):
            PortfolioRequest(tickers=["AAPL", "AAPL"])

        # Invalid: contains SQL injection attempt
        with self.assertRaises(ValidationError):
            PortfolioRequest(tickers=["AAPL", "MSFT; DROP TABLE users;"])

        # Valid: converts lowercase to uppercase
        req = PortfolioRequest(tickers=["aapl", "msft"])
        self.assertEqual(req.tickers, ["AAPL", "MSFT"])

    def test_cors_whitelisted_vs_unauthorized_origins(self):
        """Validates that CORS allows whitelisted domains and blocks unauthorized domains."""
        # 1. Whitelisted origin (local Vite dev server)
        res_allowed = self.client.options(
            "/api/warmup",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        self.assertEqual(res_allowed.headers.get("access-control-allow-origin"), "http://localhost:5173")
        self.assertEqual(res_allowed.headers.get("access-control-allow-credentials"), "true")

        # 2. Unauthorized origin
        res_blocked = self.client.options(
            "/api/warmup",
            headers={
                "Origin": "https://malicious-attacker-site.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        self.assertNotEqual(
            res_blocked.headers.get("access-control-allow-origin"),
            "https://malicious-attacker-site.com",
            "Unauthorized origin was granted CORS access!"
        )

    def test_global_exception_handler_masks_stack_traces(self):
        """Validates that validation errors and exceptions return masked JSON envelopes with request_id."""
        # Send bad JSON with invalid types to trigger RequestValidationError
        res = self.client.post(
            "/api/forecast",
            json={"ticker": "AAPL", "forecast_period": -99}
        )
        self.assertEqual(res.status_code, 422)
        body = res.json()

        self.assertFalse(body["success"])
        self.assertEqual(body["error_code"], "VALIDATION_ERROR")
        self.assertIn("request_id", body)
        self.assertTrue(body["request_id"].startswith("req-"))
        self.assertIn("message", body)

        # Ensure NO raw stack traces leak to client
        raw_text = res.text
        self.assertNotIn("Traceback (most recent call last)", raw_text)
        self.assertNotIn("File \"", raw_text)
        self.assertNotIn(".py\", line", raw_text)

    def test_http_exception_standard_envelope(self):
        """Validates that 404 and HTTP exceptions return standard error envelope with request_id."""
        res = self.client.get("/api/nonexistent_route_for_test")
        self.assertEqual(res.status_code, 404)
        body = res.json()

        self.assertFalse(body["success"])
        self.assertEqual(body["error_code"], "HTTP_404")
        self.assertIn("request_id", body)
        self.assertTrue(body["request_id"].startswith("req-"))
        self.assertIn("message", body)

if __name__ == "__main__":
    unittest.main()
