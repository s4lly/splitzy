---
name: translate-po
description: Translate missing .po catalog entries for Lingui i18n. Use when the user asks to translate .po files, fill in missing translations, sync i18n catalogs, check translation coverage, or run the translation workflow. Also use when user mentions "missing translations", "empty msgstr", "translate locales", or wants to update locale catalogs after adding new UI strings. This skill handles the .po file translation workflow; for how to USE Lingui macros in code, see lingui-best-practices. For adding translator comments to source code, see enhanced-message-context.
---

# Translate PO Catalogs

Fill missing translations in Lingui `.po` catalog files using helper scripts for batch operations.

## Project Context

- **Source locale:** `en`
- **Target locales:** `es`, `fr`, `de`, `ja`, `zh`
- **Catalog path:** `frontend/src/locales/{locale}/messages.po`
- **Config:** `frontend/lingui.config.ts`
- **npm scripts (run from `frontend/`):**
  - `pnpm run i18n:extract` -- sync catalogs with source code
  - `pnpm run i18n:compile` -- compile `.po` to TypeScript bundles
  - `pnpm run i18n` -- extract + compile

## Workflow

### Step 1: Extract

Sync catalogs so new source strings appear in all locale files:

```bash
cd frontend && pnpm run i18n:extract
```

### Step 2: Find Missing Translations

```bash
python3 .agents/skills/translate-po/scripts/po_missing.py frontend/src/locales
```

Outputs JSON to stdout with missing entries per locale. If the output is `{}`, all translations are filled -- skip to Step 5 (compile).

To check a single locale:

```bash
python3 .agents/skills/translate-po/scripts/po_missing.py frontend/src/locales --locale es
```

### Step 3: Generate Translations

For each locale with missing entries, generate translations as a JSON object mapping `msgid` to `msgstr`:

```json
{"Hello": "Hola", "Save": "Guardar"}
```

Work **one locale at a time**. Read the missing msgids from Step 2 output and translate them all for the target locale.

### Step 4: Fill Translations

Write the translations into the `.po` file:

```bash
python3 .agents/skills/translate-po/scripts/po_fill.py frontend/src/locales/es/messages.po --json '{"Hello": "Hola", "Save": "Guardar"}'
```

For large batches, pipe JSON via stdin:

```bash
echo '{"Hello": "Hola", "Save": "Guardar"}' | python3 .agents/skills/translate-po/scripts/po_fill.py frontend/src/locales/es/messages.po --stdin
```

For a single entry:

```bash
python3 .agents/skills/translate-po/scripts/po_fill.py frontend/src/locales/es/messages.po --msgid "Hello" --msgstr "Hola"
```

Repeat for each locale that has missing entries.

### Step 5: Verify and Compile

Re-run the missing check:

```bash
python3 .agents/skills/translate-po/scripts/po_missing.py frontend/src/locales
```

If any locale still has missing entries, repeat Steps 3-4 for those locales.

Once all locales report 0 missing, compile:

```bash
cd frontend && pnpm run i18n:compile
```

## Translation Quality Guidelines

- **Preserve ICU placeholders exactly:** `{0}`, `{1}`, `{count, plural, one {item} other {items}}` must appear verbatim in the translation (only translate the human-readable parts inside plural/select branches)
- **Preserve markup placeholders:** `<0>`, `<1>` etc. must remain in the translation
- **Plural forms:** Japanese and Chinese typically only use the `other` form. European languages use `one` and `other`. Match the source pattern.
- **Formality:** Match the register used by existing translations in that locale's catalog
- **Context:** Check surrounding entries and any `#.` comments in the `.po` file for translator notes

## Important Behavior

- Do NOT output markdown tables summarizing translations across all locales. They are verbose and waste tokens. Just translate and fill, reporting brief per-locale progress (e.g., "Filled 7 entries for de").
- Only produce a translation summary table if the user explicitly asks for one.
- The `po_fill.py` script will NOT overwrite existing translations -- it only fills empty `msgstr ""` entries. This is a safety guard.

## Related Skills

- **lingui-best-practices** -- How to use Lingui macros in source code (`Trans`, `t`, `useLingui`, `Plural`)
- **enhanced-message-context** -- Adding translator comments to source code for better translation quality
