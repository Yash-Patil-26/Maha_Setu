from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env"

if sys.platform == "win32":
    PROJECT_PYTHON = ROOT / "backend" / ".venv" / "Scripts" / "python.exe"
    NPM_COMMAND = "npm.cmd"
else:
    PROJECT_PYTHON = ROOT / "backend" / ".venv" / "bin" / "python"
    NPM_COMMAND = "npm"


def load_local_env(env_file: Path) -> dict[str, str]:
    if not env_file.is_file():
        raise RuntimeError(f"Required environment file not found: {env_file}")

    env = os.environ.copy()

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#"):
            continue

        if line.startswith("export "):
            line = line[7:].lstrip()

        key, separator, value = line.partition("=")

        if not separator:
            continue

        key = key.strip()

        if not key:
            continue

        value = value.strip()

        if len(value) >= 2:
            if value[0] == value[-1] and value[0] in {"'", '"'}:
                value = value[1:-1]

        env.setdefault(key, value)

    return env


def resolve_project_python() -> str:
    if not PROJECT_PYTHON.is_file():
        raise RuntimeError(
            "Project virtual environment was not found:\n"
            f"  {PROJECT_PYTHON}\n\n"
            "Create backend/.venv before starting SETU."
        )

    probe = subprocess.run(
        [str(PROJECT_PYTHON), "-m", "uvicorn", "--version"],
        capture_output=True,
        text=True,
    )

    if probe.returncode != 0:
        detail = probe.stderr.strip() or probe.stdout.strip()
        raise RuntimeError(
            "Project virtual environment cannot run uvicorn.\n"
            f"Python: {PROJECT_PYTHON}\n"
            f"Details: {detail}"
        )

    return str(PROJECT_PYTHON)


def build_processes(python_executable: str) -> list[dict]:
    return [
        {
            "name": "HUB",
            "command": [
                python_executable,
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
                python_executable,
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
                python_executable,
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
    env: dict[str, str],
) -> subprocess.Popen:
    print(f"[START] {name}: {' '.join(command)}")

    return subprocess.Popen(
        command,
        cwd=cwd,
        env=env,
    )


def main() -> int:
    try:
        env = load_local_env(ENV_FILE)
        python_executable = resolve_project_python()
    except RuntimeError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    print(f"[ENV] Loaded: {ENV_FILE}")
    print(f"[PYTHON] Project interpreter: {python_executable}")

    processes: list[tuple[str, subprocess.Popen]] = []

    try:
        for process_config in build_processes(python_executable):
            process = start_process(
                process_config["name"],
                process_config["command"],
                process_config["cwd"],
                env,
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
