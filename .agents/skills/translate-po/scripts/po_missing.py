#!/usr/bin/env python3
"""Find missing translations in Lingui .po catalog files.

Usage:
    python3 po_missing.py <locales_dir> [--locale <code>]

Examples:
    python3 po_missing.py frontend/src/locales
    python3 po_missing.py frontend/src/locales --locale es

Output (stdout): JSON object mapping locale codes to arrays of missing entries.
    {"es": [{"msgid": "Hello", "line": 42}], "fr": [...]}

Summary (stderr): Human-readable summary of missing counts.

Exit code: 0 if all translated, 1 if any missing.
"""

import argparse
import json
import os
import sys


def parse_po_string(lines, idx):
    """Parse a potentially multi-line PO string starting at lines[idx].

    Returns (full_string, next_idx).
    The line at idx should start with msgid/msgstr followed by a quoted string.
    """
    # Extract the first quoted value from the keyword line
    line = lines[idx]
    # Find first quote after keyword
    q_start = line.index('"')
    # The value is everything between the outer quotes
    value = line[q_start + 1 : line.rindex('"')]
    idx += 1

    # Continuation lines are just quoted strings
    while idx < len(lines) and lines[idx].startswith('"'):
        value += lines[idx][1 : lines[idx].rindex('"')]
        idx += 1

    return value, idx


def find_missing(po_path):
    """Parse a .po file and return list of entries with empty msgstr."""
    with open(po_path, encoding="utf-8") as f:
        lines = f.read().splitlines()

    missing = []
    i = 0
    is_header = True

    while i < len(lines):
        line = lines[i]

        # Skip blank lines, comments
        if not line or line.startswith("#"):
            # Obsolete entries start with #~, skip them
            if line.startswith("#~"):
                i += 1
                continue
            i += 1
            continue

        # Parse msgid
        if line.startswith("msgid "):
            msgid_line = i + 1  # 1-based line number
            msgid, i = parse_po_string(lines, i)

            # Skip msgctxt if present before msgid (already past it)
            # Parse msgstr
            while i < len(lines) and (
                not lines[i] or lines[i].startswith("#")
            ):
                i += 1

            if i < len(lines) and lines[i].startswith("msgstr "):
                msgstr, i = parse_po_string(lines, i)

                # Header block: msgid is empty with non-empty msgstr
                if is_header and msgid == "":
                    is_header = False
                    continue

                is_header = False

                if msgstr == "" and msgid != "":
                    missing.append({"msgid": msgid, "line": msgid_line})
            else:
                i += 1
        elif line.startswith("msgctxt "):
            # Skip msgctxt value, msgid will follow
            _, i = parse_po_string(lines, i)
        else:
            i += 1

    return missing


def main():
    parser = argparse.ArgumentParser(
        description="Find missing translations in .po files"
    )
    parser.add_argument("locales_dir", help="Path to locales directory")
    parser.add_argument(
        "--locale", help="Check only this locale", default=None
    )
    args = parser.parse_args()

    locales_dir = args.locales_dir

    if not os.path.isdir(locales_dir):
        print(f"Error: {locales_dir} is not a directory", file=sys.stderr)
        sys.exit(2)

    # Discover locales (skip 'en' as source)
    if args.locale:
        locales = [args.locale]
    else:
        locales = sorted(
            d
            for d in os.listdir(locales_dir)
            if os.path.isdir(os.path.join(locales_dir, d)) and d != "en"
        )

    result = {}
    total_missing = 0

    for locale in locales:
        po_path = os.path.join(locales_dir, locale, "messages.po")
        if not os.path.isfile(po_path):
            print(
                f"Warning: {po_path} not found, skipping", file=sys.stderr
            )
            continue

        missing = find_missing(po_path)
        if missing:
            result[locale] = missing
            total_missing += len(missing)
            print(f"{locale}: {len(missing)} missing", file=sys.stderr)

    if total_missing == 0:
        print("All locales fully translated", file=sys.stderr)

    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    print()  # trailing newline

    sys.exit(1 if total_missing > 0 else 0)


if __name__ == "__main__":
    main()
