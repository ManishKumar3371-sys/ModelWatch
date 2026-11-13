
import json
import sys
import traceback
import time
import uuid

from pathlib import Path
from datetime import datetime, timezone


BASE_DIR = Path(__file__).resolve().parent.parent

LOG_DIR = BASE_DIR / "experiments"
LOG_FILE = LOG_DIR / "training_logs.jsonl"


def start_training_run():
    """Create a unique training run."""

    return {
        "run_id": str(uuid.uuid4()),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "start_time": time.perf_counter()
    }


def finish_training_run(run, status, details=None, error=None):
    """Save training run details into the log file."""

    end_time = time.perf_counter()

    duration = round(
        end_time - run["start_time"], 3
    )

    log_record = {
        "run_id": run["run_id"],
        "started_at": run["started_at"],
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "duration_seconds": duration,
        "status": status,
        "details": details or {},
        "error": str(error) if error else None
    }

    LOG_DIR.mkdir(parents=True, exist_ok=True)

    with open(LOG_FILE, "a", encoding="utf-8") as file:
        file.write(json.dumps(log_record, indent=None) + "\n")

    return log_record

def install_failure_handler(run):
    """Log an unhandled training error."""

    original_hook = sys.excepthook

    def handle_exception(exc_type, exc_value, exc_traceback):
        if issubclass(exc_type, KeyboardInterrupt):
            original_hook(exc_type, exc_value, exc_traceback)
            return

        error_details = "".join(
            traceback.format_exception(
                exc_type, exc_value, exc_traceback
            )
        )

        finish_training_run(
            run,
            status="FAILED",
            error=error_details
        )

        original_hook(exc_type, exc_value, exc_traceback)

    sys.excepthook = handle_exception
