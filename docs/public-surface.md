# Public surface (frozen for 1.0)

From 1.0.0, the-crew follows [Semantic Versioning](https://semver.org/) over what this page lists. A change that breaks anything here, or removes it, is a **major** release. Additions that existing callers can ignore (a new profile, a new optional field, a new option whose default keeps today's behaviour) are **minor**. Fixes, and anything under [Not public](#not-public), are **patch** or minor and may change at any time. Breaking changes are called out in [CHANGELOG.md](../CHANGELOG.md).

## Identity

| Name | Value |
| --- | --- |
| Plugin name | `the-crew` |
| Marketplace | `the-crew` (this repository's `.claude-plugin/marketplace.json`) |
| Plugin id | `the-crew@the-crew` |
| Settings key | `pluginConfigs.the-crew.options` |
| Pane id | `crew-agents` |

## Tools

Both are registered through `$.tool.register` and reach the model as MCP-style tools.

### `mcp__the-crew__progress`

Reports an orchestrated plan to the progress bar above the prompt and the agents panel. **Caller rule:** only the main session. A call that carries an `agentId` (from a subagent's loop) changes nothing and answers `ignored: only the main session reports the flow`. Fields left out keep their previous value. A call with a new `title` starts a new flow (agents still running stay).

Input (all optional; no `required`):

| Field | Type | Meaning |
| --- | --- | --- |
| `title` | string | Short name of the overall task. |
| `total` | integer >= 0 | Number of planned worker tasks. |
| `done` | integer >= 0 | Tasks accepted after review. |
| `phase` | `"plan"`, `"design"`, `"delegate"`, `"review"` or `"close"` | Current phase. |
| `finished` | boolean | True once the flow is closed. |
| `tasks` | array | The planned tasks, numbered from 1 in order. Each: `title` (string, required; equal to the Agent tool `description` it will be delegated with, so runs match tasks), `tier` (string, required; one of `fable`, `heavy`, `careful`, `medium`, `light`), `after` (integer array, optional; numbers of tasks it waits for). |

Result: a string beginning `ok:` followed by the flow's label.

Bounds the mod enforces (the schema is advice to the model; these are the limits): at most 200 tasks, 20 `after` entries per task, 120 characters per title.

### `mcp__the-crew__step`

A subagent reports its own steps. **Caller rule:** only a subagent (the call carries an `agentId`); from the main session it answers `ignored: only subagents report steps`. If no panel row matches the agent it answers `ignored: no panel row for agent <id>`. The tool is registered with `isDeferred: false`, so it is in every agent's tool list.

Input:

| Field | Type | Meaning |
| --- | --- | --- |
| `done` | integer >= 0, **required** | Steps finished so far. |
| `total` | integer >= 1 | Steps planned; may change. |
| `note` | string | The step in progress, a few words. |

Result: `ok` when a row matched.

## Brief tag and costumes

A subagent is drawn as a role, chosen by the first rule that matches:

1. Its agent type is a profile name, with or without a plugin prefix (`implementer`, `my-plugin:implementer`), case-insensitive.
2. Its brief contains a tag line such as `Role: <leaf|manager>; Profile: <name>`. Only `Profile:` is read (`\bProfile:\s*([a-z-]+)`, case-insensitive, first match); the `Role:` part is convention for the brief and is not parsed. A name that is not a known profile falls through to the next rule.
3. Its agent type is a Claude Code built-in (mapping below).
4. A `savvy-*` agent type is drawn as the plain crab and labelled with its tier (`savvy-careful` shows `careful`).
5. Otherwise the plain crab, `other`, labelled with its agent type.

Known profiles, each with a costume of the same name: `explorer`, `implementer`, `validator`, `critic`, `documenter`, `tester`, `manager`, `researcher`, `debugger`, `analyst`, `architect`, `auditor`, `navigator`, `inspector`. The main session's own row is drawn as `root`, which a brief cannot select. Savvy tiers: `fable`, `heavy`, `careful`, `medium`, `light`.

Built-in agent types (exact names, matched after removing a `plugin:` prefix):

| Agent type | Costume |
| --- | --- |
| `Explore`, `explore` | `explorer` |
| `Plan`, `plan` | `architect` |
| `web-fetch` | `researcher` |
| `general-purpose`, `claude` | `generalist` |
| `claude-code-guide` | `guide` |
| `statusline-setup` | `statusline` |

For a built-in, the label under the title stays the agent type (for example `Explore`), so it is not mistaken for the profile whose costume it borrows. Adding a profile or a built-in mapping is minor; changing which costume an existing name selects is major.

## Command

`/crew` toggles the agents panel. `/crew open` opens it, or brings it forward, without toggling.

## Options (`userConfig`)

| Option | Values | Default | Meaning |
| --- | --- | --- | --- |
| `autoOpen` | `any`, `savvy` | `any` | `any`: the panel opens, once per session, when any subagent starts or a plan is reported. `savvy`: only for savvy-flow workers and reported plans. |
| `openAtStart` | `on`, `off` | `on` | `on`: the panel opens when a session starts (once per session). `off`: it opens only per `autoOpen` or `/crew`. |

Removing an option, changing a default, or changing what a value means is major. Adding a value or a new option is minor. (`language` was removed in 0.14.1.)

## Not public

These can change in any release, and nothing outside the mod should read or rely on them:

- Session state keys (`the-crew.agents`, `the-crew.flow`, `the-crew.now`, `the-crew.panel`, `the-crew.root`, `the-crew.threadRows`) and the contract in `types/index.d.ts`.
- The SVG markup, element keys, button labels and layout of the panel, the band and the thread view.
- Costume art, colours, animations and their timings; the gallery images in `media/costumes`.
- The cost estimate, its price table, and the figures shown.
- Whether and when the panel opens beyond the options above; the text of tool results after the leading `ok` or `ignored`; transcript, debug and error wording.
- Everything under `hooks/`, `tools/` and `types/vendor/`, and the tests.
