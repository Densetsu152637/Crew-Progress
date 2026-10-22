# crew-progress

A Claude Code mod: a live panel of your crew (the main session plus every subagent) and a progress bar above the prompt. It is a fork of [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) by [johnnyvizz](https://github.com/johnnyvizz), MIT licensed, with two additions:

- **Main session row.** The panel's first row is the main session itself, wearing a crown: its model and effort, how full its context window is, an estimated cost, and how long the session has run. It walks while a main turn runs and rests between turns.
- **A costume per workflow profile.** A subagent is drawn as the profile it was dispatched with, each with its own pixel-crab costume and colour, instead of the generic crab.

Everything else works as in savvy-progress: running, finished and planned subagents with model, effort, task progress, context, estimated cost and time; the savvy-flow tiers and their costumes; the progress bar for orchestrated flows.

## Install

At the prompt of a terminal session:

```
/plugin install crew-progress --marketplace Densetsu152637/Crew-Progress
```

From a shell:

```
claude plugin install crew-progress --marketplace Densetsu152637/Crew-Progress
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `Densetsu152637/Crew-Progress`, then Add plugin.

crew-progress uses its own names throughout (`/crew`, the `crew-agents` pane, `mcp__crew-progress__*` tools), so it can be installed beside savvy-progress; you will usually want only one of them enabled, since both draw a panel.

## Using it

- `/crew` shows or hides the panel; `/crew open` opens it, or brings it forward, without toggling.
- With the default `autoOpen: any`, the panel opens by itself once per session when a subagent starts, and whenever a flow reports a plan.

### The main session row

| Shown | Where it comes from |
| --- | --- |
| Model and effort | The main loop's latest model request (`turn.step`); `—` until the first one after the mod loads. |
| Context | The engine's own measure of the live window after each main turn (`session.measure`, `SessionContextUsage`), and the request's input side between measures. |
| Estimated cost | Each main-loop request's token counts priced with the same table as the subagents (`PRICES` in `hooks/register.tsx`). |
| Time | Since the session began (`$.session.usage().startedAt`). |

The cost is an estimate and counts only requests made while the mod is loaded: requests from before it loaded are not in it. The row is not reset by `/clear` (its cost, tokens and time keep counting from the first start). The engine's own ledger (`/cost`) also includes subagents, so it is not used for this row.

### Profiles and costumes

A subagent's costume is picked in this order, the first match winning:

1. Its agent type is a profile name, e.g. `implementer` or `my-plugin:implementer`.
2. Its brief carries a tag such as `Role: leaf; Profile: implementer` anywhere in it; the first `Profile:` counts.
3. Its type is a savvy-flow tier (`savvy-careful`, ...), drawn as in savvy-progress.
4. Otherwise the plain crab, labelled with its agent type (the built-in Explore agent keeps its pirate).

| Profile | Costume | Motion while running |
| --- | --- | --- |
| root (main session) | gold crown with jewels | jewels sparkle |
| manager | headset with mic, conductor's baton | baton conducts |
| explorer | pith helmet, lantern | lantern swings |
| implementer | bandana, claw hammer | hammer strikes |
| validator | visor cap, clipboard with a check mark | check mark blinks |
| critic | beret, gold monocle | monocle glints |
| documenter | scroll and quill | quill writes |
| tester | lab goggles, bubbling flask | bubbles rise |

The profile's name appears under the agent's title, where savvy-flow agents show their tier. `prefers-reduced-motion` stops every animation.

## Tools it adds

- `mcp__crew-progress__progress`: an orchestrator reports the plan, phase and accepted tasks for the progress bar. Only the main session can; a call from a subagent is ignored.
- `mcp__crew-progress__step`: a subagent reports its own steps (`done`, `total`, `note`). A worker that does not report shows its context fill in grey instead. `savvy-*` workers get one line at the end of their brief asking for these reports.

Costs are rough estimates from token counts and list prices (as of 2026-10-10), not a bill. Cache writes are priced at the 1-hour rate.

## Settings

`language`: `auto` (default), `en`, `ru` or `he`. Hebrew draws the bar and the panel right to left. `auto` follows Claude Code's `language` setting, then the system locale, and falls back to English.

`autoOpen`: `any` (default) or `savvy`. With `any` the panel also opens, once per session, when any subagent starts; with `savvy` only for savvy-flow workers and reported plans.

`openAtStart`: `on` (default) or `off`. With `on` the panel opens when a session starts (once per session, so closing it stays closed); with `off` it opens only per `autoOpen` or `/crew`.

Set them in `/config`, or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "crew-progress": { "options": { "language": "en", "autoOpen": "any", "openAtStart": "on" } } } }
```

## Development

`claude plugin validate .` checks the manifest and the hooks module; `claude plugin test .` runs the tests in `hooks/*.test.ts(x)`.

## Credits and licence

Built on [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) by johnnyvizz: the panel, the progress bar, the cost table and the pixel crabs (themselves after DockCrab's Clawd). MIT licence; see [LICENSE](LICENSE), which carries both copyrights.
