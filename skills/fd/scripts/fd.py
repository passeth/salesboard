#!/usr/bin/env python3
"""Claude-first UI relay helper for the fd skill."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path


DEFAULT_MODEL = "opus"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a Claude-first UI planning or apply pass for Codex.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    doctor = subparsers.add_parser("doctor", help="Check Claude CLI availability.")
    doctor.add_argument(
        "--check-auth",
        action="store_true",
        help="Run a lightweight Claude request to verify login state.",
    )

    for name in ("plan", "apply"):
        sub = subparsers.add_parser(name, help=f"Run Claude in {name} mode.")
        sub.add_argument("task", help="UI task to send to Claude.")
        sub.add_argument(
            "--file",
            action="append",
            default=[],
            dest="files",
            help="Limit Claude to this file. Repeat for multiple files.",
        )
        sub.add_argument(
            "--entry",
            help="Primary entry file or component for the task.",
        )
        sub.add_argument(
            "--context-file",
            help="Path to a short context brief prepared by Codex.",
        )
        sub.add_argument(
            "--model",
            default=DEFAULT_MODEL,
            help=f"Claude model alias or full model name. Default: {DEFAULT_MODEL}",
        )
        sub.add_argument(
            "--allow-create",
            action="store_true",
            help="Allow Claude to create new files if needed.",
        )
        sub.add_argument(
            "--dangerously-skip-permissions",
            action="store_true",
            help="Pass through Claude's full permission bypass flags.",
        )
        sub.add_argument(
            "--dry-run",
            action="store_true",
            help="Print the generated Claude prompt without invoking Claude.",
        )

    return parser.parse_args()


def get_skill_root() -> Path:
    return Path(__file__).resolve().parent.parent


def read_rubric() -> str:
    rubric_path = get_skill_root() / "references" / "claude-ui-rubric.md"
    return rubric_path.read_text(encoding="utf-8").strip()


def read_context_file(path_str: str | None) -> str:
    if not path_str:
        return ""
    path = Path(path_str).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"Context file not found: {path}")
    return path.read_text(encoding="utf-8").strip()


def command_exists(name: str) -> bool:
    return shutil.which(name) is not None


def run_subprocess(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=str(cwd),
        text=True,
        capture_output=True,
        check=False,
    )


def run_doctor(check_auth: bool) -> int:
    if not command_exists("claude"):
        print("Claude CLI not found on PATH.")
        print("Install Claude Code and rerun this check.")
        return 1

    claude_path = shutil.which("claude")
    version = run_subprocess(["claude", "--version"], Path.cwd())
    print(f"claude: {claude_path}")
    if version.returncode == 0:
        print(f"version: {version.stdout.strip()}")
    else:
        print("version: unavailable")
        print(version.stderr.strip())

    if not check_auth:
        print("auth: not checked")
        print("Run with --check-auth to verify that Claude is logged in.")
        return 0

    probe = run_subprocess(
        ["claude", "-p", "--output-format", "text", "Reply with exactly: OK"],
        Path.cwd(),
    )
    combined = "\n".join(part for part in (probe.stdout, probe.stderr) if part).strip()
    if probe.returncode == 0 and combined.strip() == "OK":
        print("auth: OK")
        return 0

    print("auth: failed")
    if combined:
        print(combined)
    if "Not logged in" in combined:
        print("Run `claude /login` in your terminal, then rerun the command.")
    return 1


def indent_block(text: str) -> str:
    return textwrap.indent(text.strip(), "  ")


def build_prompt(
    *,
    mode: str,
    task: str,
    files: list[str],
    entry: str | None,
    context_text: str,
    allow_create: bool,
) -> str:
    file_lines = "\n".join(f"- {path}" for path in files) if files else "- No explicit file list provided."
    entry_line = entry or "No explicit entry file provided."
    context_block = context_text or "No extra context file provided."
    creation_rule = (
        "You may create new files, but only when the task clearly requires them."
        if allow_create
        else "Do not create new files unless the absence of a target file makes the task impossible."
    )

    if mode == "plan":
        mode_rules = textwrap.dedent(
            """\
            Do not edit any files.
            Produce a concrete UI implementation plan that Codex can execute.
            Include:
            1. visual direction
            2. target files
            3. section or component changes
            4. responsive and accessibility notes
            5. risks or assumptions
            """
        ).strip()
    else:
        mode_rules = textwrap.dedent(
            """\
            Edit the workspace directly to create a first-pass UI draft.
            Keep changes tightly scoped to the requested task.
            Avoid dependency installation, package-manager changes, and unrelated refactors.
            Avoid running shell commands unless absolutely necessary.
            After editing, print:
            1. changed files
            2. visual direction summary
            3. known gaps Codex should finish
            """
        ).strip()

    prompt = "\n\n".join(
        [
            "You are Claude Code acting as the UI-first pass in a two-agent workflow.\n"
            "Codex will finish product quality after your pass.",
            "Apply this rubric:\n" + indent_block(read_rubric()),
            "Task:\n" + indent_block(task),
            "Files in scope:\n" + indent_block(file_lines),
            "Primary entry:\n" + indent_block(entry_line),
            "Extra context:\n" + indent_block(context_block),
            "Constraints:\n"
            + indent_block(
                "\n".join(
                    [
                        f"- {creation_rule}",
                        "- Prefer preserving the existing design system when one exists.",
                        "- Push visual hierarchy, spacing, and typography harder when the surface is marketing or blank-canvas.",
                        "- Leave deeper logic hardening, overflow cleanup, accessibility verification, and tests for Codex unless a small fix is required to make the UI coherent.",
                    ]
                )
            ),
            "Mode-specific instructions:\n" + indent_block(mode_rules),
        ]
    )
    return prompt


def build_claude_command(args: argparse.Namespace, prompt: str) -> list[str]:
    cmd = ["claude", "-p", "--model", args.model, "--output-format", "text"]
    if args.command == "apply":
        if args.dangerously_skip_permissions:
            cmd.extend(
                [
                    "--dangerously-skip-permissions",
                    "--permission-mode",
                    "bypassPermissions",
                ]
            )
        else:
            cmd.extend(["--permission-mode", "acceptEdits"])
    cmd.append(prompt)
    return cmd


def run_mode(args: argparse.Namespace) -> int:
    if not command_exists("claude"):
        print("Claude CLI not found on PATH.", file=sys.stderr)
        return 1

    try:
        context_text = read_context_file(args.context_file)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    prompt = build_prompt(
        mode=args.command,
        task=args.task,
        files=args.files,
        entry=args.entry,
        context_text=context_text,
        allow_create=args.allow_create,
    )

    if args.dry_run:
        print(prompt)
        return 0

    cmd = build_claude_command(args, prompt)
    result = subprocess.run(cmd, text=True, check=False)
    return result.returncode


def main() -> int:
    args = parse_args()
    if args.command == "doctor":
        return run_doctor(args.check_auth)
    return run_mode(args)


if __name__ == "__main__":
    sys.exit(main())
