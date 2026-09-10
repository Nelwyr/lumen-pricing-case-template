"""Run the simulator integration checks in installed Chrome, with no dependencies."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import argparse
import re
import subprocess
import tempfile
import html

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", default=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    parser.add_argument("--page", default="tests/simulator-ui.browser.html")
    parser.add_argument("--screenshot", help="Optional screenshot output path")
    parser.add_argument("--window-size", default="1200,1000")
    args = parser.parse_args()
    requests = []

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_GET(self):
            requests.append(self.path)
            super().do_GET()

    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with tempfile.TemporaryDirectory(prefix="lumen-browser-check-") as profile:
            result = subprocess.run(
                [args.browser, "--headless", "--disable-gpu", "--no-first-run",
                 "--no-default-browser-check", f"--user-data-dir={profile}",
                 "--dump-dom", "--virtual-time-budget=15000",
                 f"--window-size={args.window_size}",
                 *([f"--screenshot={Path(args.screenshot).resolve()}"] if args.screenshot else []),
                 f"http://127.0.0.1:{server.server_port}/{args.page}"],
                capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60,
            )
            match = re.search(r'<pre id="report"[^>]*>(.*?)</pre>', result.stdout, re.S)
            report = html.unescape(match.group(1)) if match else "FAIL: No browser report"
            print(report)
            data_requests = [path for path in requests if path.startswith("/data/")]
            assert data_requests and all(path.startswith("/data/app_data/") for path in data_requests), "Unexpected data request"
            print("PASS: All browser data requests use /data/app_data/")
            if result.returncode or not report.startswith("PASS:"):
                raise SystemExit(1)
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
