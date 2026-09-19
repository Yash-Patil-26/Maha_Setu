from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent

NPM_COMMAND = "npm.cmd" if sys.platform == "win32" else "npm"

PROCESSES = [
    {
        "name": "HUB",
        "command": [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        "cwd": ROOT / "backend",
    },
    {
        "name": "REV",
        "command": [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8001",
        ],
        "cwd": ROOT / "mock_systems" / "rev",
    },
    {
        "name": "BSS",
        "command": [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8002",
        ],
        "cwd": ROOT / "mock_systems" / "bss",
    },
    {
        "name": "FRONTEND",
        "command": [
            NPM_COMMAND,
            "run",
            "dev",
            "--",
            "--host",
            "127.0.0.1",
            "--port",
            "5173",
        ],
        "cwd": ROOT / "frontend",
    },
]


def start_process(
    name: str,
    command: list[str],
    cwd: Path,
) -> subprocess.Popen:
    print(f"[START] {name}: {' '.join(command)}")

    return subprocess.Popen(
        command,
        cwd=cwd,
    )


def main() -> int:
    processes: list[tuple[str, subprocess.Popen]] = []

    try:
        for process_config in PROCESSES:
            process = start_process(
                process_config["name"],
                process_config["command"],
                process_config["cwd"],
            )
            processes.append((process_config["name"], process))

        print()
        print("SETU services started.")
        print("HUB      : http://127.0.0.1:8000")
        print("REV      : http://127.0.0.1:8001")
        print("BSS      : http://127.0.0.1:8002")
        print("FRONTEND : http://127.0.0.1:5173")
        print()
        print("Press Ctrl+C to stop all services.")

        while True:
            for name, process in processes:
                return_code = process.poll()

                if return_code is not None:
                    print(f"[STOPPED] {name} exited with code {return_code}")
                    return return_code

    except KeyboardInterrupt:
        print()
        print("Stopping SETU services...")

    finally:
        for name, process in processes:
            if process.poll() is None:
                print(f"[STOP] {name}")
                process.terminate()

        for _, process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()

        print("All services stopped.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
