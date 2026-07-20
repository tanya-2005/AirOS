"""
Optional continuous-ingestion scheduler. Every INTERVAL_SECONDS (default 15
minutes): fetch AQI, fetch weather for those same stations, both of which
already append to the history log themselves (see history_store.py) — this
script's only job is to call them on a timer instead of you running them
by hand.

This is entirely optional — manual one-off runs of `fetch_waqi.py` and
`fetch_weather.py` keep working exactly as before, with or without this
running. Nothing else in the project depends on the scheduler being alive;
the backend just reads whatever's newest in data/ on every request.

Deliberately NOT using a system cron/Task Scheduler entry, a process
manager, or a task queue library — a single long-running Python process
with time.sleep() is the whole "scheduler," which matches the project's
own hackathon-friendly, no-new-infrastructure constraint. See the README
for how to run this as an actual background/cron job instead, if you want
it to survive your terminal closing.

Usage:
    python scheduler.py --city delhi
    python scheduler.py --city delhi --interval 300   # every 5 min instead
"""
import argparse
import sys
import time
import traceback
from datetime import datetime, timezone

import fetch_waqi
import fetch_weather

DEFAULT_INTERVAL_SECONDS = 15 * 60


def _log(msg):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts} UTC] {msg}", flush=True)


def run_cycle(city):
    """One fetch-AQI-then-weather cycle. Errors are caught and logged, never
    left to kill the scheduler loop — a single bad cycle (WAQI down, rate
    limited, network blip) should not stop the next one from running."""
    try:
        out_path, records, skipped = fetch_waqi.run_ingestion(city=city)
        if out_path is None:
            _log(f"AQI fetch produced nothing usable this cycle (city={city}) — skipping weather too.")
            return
        _log(f"AQI: wrote {len(records)} stations ({skipped} skipped).")
    except Exception:
        _log(f"AQI fetch failed this cycle:\n{traceback.format_exc()}")
        return

    try:
        out_path, records, failed = fetch_weather.run_ingestion(city=city)
        if out_path is None:
            _log("Weather fetch produced nothing usable this cycle.")
        else:
            _log(f"Weather: wrote {len(records)} stations ({len(failed)} failed).")
    except Exception:
        _log(f"Weather fetch failed this cycle:\n{traceback.format_exc()}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="delhi")
    ap.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS,
                     help=f"seconds between cycles (default {DEFAULT_INTERVAL_SECONDS} = 15 min)")
    ap.add_argument("--once", action="store_true",
                     help="run a single cycle and exit, instead of looping forever")
    args = ap.parse_args()

    _log(f"AirOS ingestion scheduler starting — city={args.city}, interval={args.interval}s")
    _log("This is optional: Ctrl+C any time, manual fetch_waqi.py/fetch_weather.py runs still work.")

    if args.once:
        run_cycle(args.city)
        return

    try:
        while True:
            run_cycle(args.city)
            _log(f"Sleeping {args.interval}s until next cycle...")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        _log("Stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
