# Issue tracker: Linear (via MCP)

Issues and PRDs for this repo live in **Linear**, workspace team **Goofin** (key `GOO`).
All operations go through the `claude_ai_Linear` MCP tools — never `gh issue`.

## Before you start

The Linear MCP tools are **deferred**: their schemas aren't loaded at session start.
Load everything you need in ONE call, e.g.

    ToolSearch: "select:mcp__claude_ai_Linear__list_issues,mcp__claude_ai_Linear__get_issue,mcp__claude_ai_Linear__save_issue,mcp__claude_ai_Linear__save_comment,mcp__claude_ai_Linear__list_comments"

This MCP is interactively authenticated — it may be **absent in headless / cron / background
workflow runs**. If the tools can't be loaded, say so and stop; don't silently fall back to
GitHub issues.

## Conventions

Team is always `Goofin` unless the user says otherwise. `project` is optional but preferred
when the work belongs to an existing project.

- **Create an issue**: `save_issue` with `{team: "Goofin", title, description}` — omit `id`.
  `description` is Markdown; use literal newlines, not `\n` escapes.
- **Update an issue**: `save_issue` with `{id: "GOO-123", ...}`. `labels` **replaces** the
  full set — read current labels first and pass them all back, or you'll drop them.
- **Read an issue**: `get_issue` for the body, `list_comments` for the discussion.
- **List issues**: `list_issues` with `{team: "Goofin"}` plus `label`, `state`, `project`,
  or `assignee` filters. `assignee: "me"` for your own.
- **Comment**: `save_comment` with the issue id.
- **Close**: `save_issue` with `{id, state: "Done"}` — or `Canceled` for won't-do,
  `Duplicate` for duplicates. Leave a `save_comment` explaining why first.
- **Create a label**: `create_issue_label` (the triage labels don't exist yet; they'll be
  created on first use).

Existing labels: `Bug`, `Improvement`, `Feature`.
Workflow states: `Backlog`, `Todo`, `In Progress`, `In Review`, `Done`, `Canceled`, `Duplicate`.

## Pull requests as a request surface

**PRs as a request surface: no.** Code review happens on GitHub (`s4lly/splitzy`); the triage
queue is Linear-only. When a GitHub PR needs tracking, link it onto the Linear issue with
`save_issue`'s `links: [{url, title}]` rather than pulling the PR into triage.

## When a skill says "publish to the issue tracker"

Create a Linear issue on team `Goofin` via `save_issue`.

## When a skill says "fetch the relevant ticket"

`get_issue` with the identifier (e.g. `GOO-42`), then `list_comments` for the thread.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue; tickets are its **sub-issues**.

- **Map**: an issue labelled `wayfinder:map` holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `save_issue` with `parentId: "<map identifier>"` and a
  `wayfinder:<type>` label (`research` / `prototype` / `grilling` / `task`).
  Claimed tickets get `assignee: "me"`.
- **Blocking**: Linear's native relations — `save_issue` with `blockedBy: ["GOO-12"]`
  (append-only; `removeBlockedBy` to clear). A ticket is unblocked when every blocker
  is in a completed or canceled state.
- **Frontier query**: `list_issues` with `{parentId: "<map>"}`, drop anything already
  `Done`/`Canceled`, anything with an unfinished blocker, and anything assigned;
  first in map order wins.
- **Claim**: `save_issue` with `{id, assignee: "me"}` — the session's first write.
- **Resolve**: `save_comment` with the answer, `save_issue` to `Done`, then append a
  context pointer to the map's Decisions-so-far.
