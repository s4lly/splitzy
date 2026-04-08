#!/usr/bin/env python3
"""Write translations into a Lingui .po catalog file.

Usage:
    python3 po_fill.py <po_file> --json '<json_object>'
    python3 po_fill.py <po_file> --stdin
    python3 po_fill.py <po_file> --msgid "text" --msgstr "translation"

The script only fills entries with empty msgstr. It will NOT overwrite
existing translations unless --force is used.

Examples:
    python3 po_fill.py messages.po --json '{"Hello": "Hola", "Save": "Guardar"}'
    echo '{"Hello": "Hola"}' | python3 po_fill.py messages.po --stdin
    python3 po_fill.py messages.po --msgid "Hello" --msgstr "Hola"
"""

import argparse
import json
import re
import sys


def escape_po(s):
    """Escape a string for PO format."""
    s = s.replace("\\", "\\\\")
    s = s.replace('"', '\\"')
    s = s.replace("\n", "\\n")
    s = s.replace("\t", "\\t")
    return s


def read_po_string(lines, idx):
    """Read a potentially multi-line PO string starting at lines[idx].

    Returns (value, next_idx).
    """
    line = lines[idx]
    q_start = line.index('"')
    value = line[q_start + 1 : line.rindex('"')]
    idx += 1

    while idx < len(lines) and lines[idx].startswith('"'):
        value += lines[idx][1 : lines[idx].rindex('"')]
        idx += 1

    return value, idx


def fill_translations(po_path, translations, force=False):
    """Fill empty msgstr entries in a .po file.

    Args:
        po_path: Path to the .po file
        translations: Dict mapping msgid -> msgstr
        force: If True, overwrite existing translations

    Returns:
        (filled_count, not_found_msgids)
    """
    with open(po_path, encoding="utf-8") as f:
        lines = f.read().splitlines()

    remaining = dict(translations)  # copy to track what we've matched
    filled = 0
    is_header = True
    i = 0
    output_lines = list(lines)  # work on a copy

    while i < len(lines):
        line = lines[i]

        # Skip blank lines, comments, obsolete entries
        if not line or line.startswith("#"):
            i += 1
            continue

        if line.startswith("msgctxt "):
            _, i = read_po_string(lines, i)
            continue

        if line.startswith("msgid "):
            msgid_idx = i
            msgid, i = read_po_string(lines, i)

            # Skip to msgstr
            while i < len(lines) and (
                not lines[i] or lines[i].startswith("#")
            ):
                i += 1

            if i < len(lines) and lines[i].startswith("msgstr "):
                msgstr_idx = i
                msgstr, i = read_po_string(lines, i)

                # Skip header
                if is_header and msgid == "":
                    is_header = False
                    continue
                is_header = False

                # Check if this msgid is in our translations
                if msgid in remaining:
                    if msgstr == "" or force:
                        new_msgstr = escape_po(remaining[msgid])
                        output_lines[msgstr_idx] = f'msgstr "{new_msgstr}"'
                        # Remove any continuation lines that were part of old msgstr
                        # (unlikely for empty msgstr, but handle for --force)
                        cont_idx = msgstr_idx + 1
                        while cont_idx < len(output_lines) and lines[
                            cont_idx
                        ].startswith('"'):
                            output_lines[cont_idx] = None  # mark for removal
                            cont_idx += 1
                        filled += 1
                    del remaining[msgid]
            else:
                i += 1
        else:
            i += 1

    # Remove lines marked as None
    output_lines = [l for l in output_lines if l is not None]

    # Write back
    with open(po_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(output_lines))
        f.write("\n")

    return filled, list(remaining.keys())


def main():
    parser = argparse.ArgumentParser(
        description="Fill translations in a .po file"
    )
    parser.add_argument("po_file", help="Path to the .po file")
    parser.add_argument(
        "--json", dest="json_str", help="JSON object mapping msgid to msgstr"
    )
    parser.add_argument(
        "--stdin", action="store_true", help="Read JSON from stdin"
    )
    parser.add_argument("--msgid", help="Single msgid to translate")
    parser.add_argument("--msgstr", help="Translation for the single msgid")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing translations",
    )
    args = parser.parse_args()

    # Build translations dict from input
    if args.stdin:
        translations = json.load(sys.stdin)
    elif args.json_str:
        translations = json.loads(args.json_str)
    elif args.msgid and args.msgstr:
        translations = {args.msgid: args.msgstr}
    else:
        print(
            "Error: provide --json, --stdin, or --msgid/--msgstr",
            file=sys.stderr,
        )
        sys.exit(2)

    if not isinstance(translations, dict):
        print("Error: translations must be a JSON object", file=sys.stderr)
        sys.exit(2)

    filled, not_found = fill_translations(
        args.po_file, translations, force=args.force
    )
    total = len(translations)

    print(f"Filled {filled}/{total} entries in {args.po_file}")
    if not_found:
        print(f"Not found: {json.dumps(not_found, ensure_ascii=False)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
