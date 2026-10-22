# crew-progress

A Claude Code mod: a live panel of your crew (the main session plus every subagent) and a progress bar above the prompt. It is a fork of [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) by [johnnyvizz](https://github.com/johnnyvizz), MIT licensed, with two additions:

- **Main session row.** The panel's first row is the main session itself, wearing a crown: its model and effort, how full its context window is, an estimated cost, and how long the session has run. It walks while a main turn runs and rests between turns.
- **A costume per workflow profile.** A subagent is drawn as the profile it was dispatched with, each with its own pixel-crab costume and colour, instead of the generic crab.

Everything else works as in savvy-progress: running, finished and planned subagents with model, effort, task progress, context, estimated cost and time; the savvy-flow tiers and their costumes; the progress bar for orchestrated flows.

## Costume gallery

Every crab the mod ships, as it looks while its agent runs (`prefers-reduced-motion` stops the animation). The images are generated from the drawing code; see [Development](#development).

| Crab | Costume | What it is | Defined by |
| --- | --- | --- | --- |
| <img src="media/costumes/root.svg" width="102" alt="root crab"> | Main session (root) | gold crown with jewels; the jewels sparkle | [workflows/AGENTS.root.md](https://github.com/Densetsu152637/Agent-Custom-Workflow/blob/main/workflows/AGENTS.root.md) |
| <img src="media/costumes/manager.svg" width="102" alt="manager crab"> | manager profile | headset with mic and a conductor's baton; the baton conducts | [workflows/AGENTS.manager.md](https://github.com/Densetsu152637/Agent-Custom-Workflow/blob/main/workflows/AGENTS.manager.md) |
| <img src="media/costumes/explorer.svg" width="102" alt="explorer crab"> | explorer profile | pith helmet and a lantern; the lantern swings | [profiles/AGENTS.explorer.md](https://github.com/Densetsu152637/Agent-Custom-Workflow/blob/main/profiles/AGENTS.explorer.md) |
| <img src="media/costumes/implementer.svg" width="102" alt="implementer crab"> | implementer profile | bandana and a claw hammer; the hammer strikes | [profiles/AGENTS.implementer.md](https://github.com/Densetsu152637/Agent-Custom-Workflow/blob/main/profiles/AGENTS.implementer.md) |
| <img src="media/costumes/validator.svg" width="102" alt="validator crab"> | validator profile | visor cap and a clipboard; the check mark blinks | [profiles/AGENTS.validator.md](https://github.com/Densetsu152637/Agent-Custom-Workflow/blob/main/profiles/AGENTS.validator.md) |
| <img src="media/costumes/critic.svg" width="102" alt="critic crab"> | critic profile | beret and a gold monocle; the monocle glints | [profiles/AGENTS.critic.md](https://github.com/Densetsu152637/Agent-Custom-Workflow/blob/main/profiles/AGENTS.critic.md) |
| <img src="media/costumes/documenter.svg" width="102" alt="documenter crab"> | documenter profile | scroll and a quill; the quill writes | [profiles/AGENTS.documenter.md](https://github.com/Densetsu152637/Agent-Custom-Workflow/blob/main/profiles/AGENTS.documenter.md) |
| <img src="media/costumes/tester.svg" width="102" alt="tester crab"> | tester profile | lab goggles and a flask; the bubbles rise | [profiles/AGENTS.tester.md](https://github.com/Densetsu152637/Agent-Custom-Workflow/blob/main/profiles/AGENTS.tester.md) |
| <img src="media/costumes/fable.svg" width="102" alt="fable crab"> | savvy-flow tier fable | astronaut in a glass dome; floats, the antenna and star blink | [savvy-flow](https://github.com/johnnyvizz/claude-kit) tier |
| <img src="media/costumes/heavy.svg" width="102" alt="heavy crab"> | savvy-flow tier heavy | detective in a deerstalker; the magnifier sweeps and glints | [savvy-flow](https://github.com/johnnyvizz/claude-kit) tier |
| <img src="media/costumes/careful.svg" width="102" alt="careful crab"> | savvy-flow tier careful | engineer in a hard hat; the wrench turns a bolt | [savvy-flow](https://github.com/johnnyvizz/claude-kit) tier |
| <img src="media/costumes/medium.svg" width="102" alt="medium crab"> | savvy-flow tier medium | chef in a toque; tosses the omelette | [savvy-flow](https://github.com/johnnyvizz/claude-kit) tier |
| <img src="media/costumes/light.svg" width="102" alt="light crab"> | savvy-flow tier light | racer in a helmet; runs at double pace, the flag flutters | [savvy-flow](https://github.com/johnnyvizz/claude-kit) tier |
| <img src="media/costumes/explore.svg" width="102" alt="explore crab"> | built-in Explore agent | pirate with a cutlass; the cutlass fences | Claude Code's `Explore` agent type |
| <img src="media/costumes/other.svg" width="102" alt="other crab"> | any other agent | the plain crab; walks | fallback |

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
2. Its brief carries a tag such as `Role: leaf; Profile: implementer` anywhere in it ([the brief tag convention](https://github.com/Densetsu152637/Agent-Custom-Workflow/blob/main/templates/subagent-brief.md#compact-schema)); the first `Profile:` counts.
3. Its type is a savvy-flow tier (`savvy-careful`, ...), drawn as in savvy-progress.
4. Otherwise the plain crab, labelled with its agent type (the built-in Explore agent keeps its pirate).

The profiles are those of [Agent-Custom-Workflow](https://github.com/Densetsu152637/Agent-Custom-Workflow); the [costume gallery](#costume-gallery) shows each one and links its profile file.

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

The crab drawings live in `hooks/crabs.ts` (pixel grids, `COSTUMES`, `CRAB_CSS`), which `hooks/register.tsx` imports. After changing a costume, regenerate the gallery images with Node 22.18 or later, which runs the TypeScript directly:

```
node tools/render-costumes.mjs          # writes media/costumes/<costume>.svg, one per COSTUMES entry
node tools/render-costumes.mjs --check  # exits 1 when an image is missing, stale or has no costume
```

## Credits and licence

Built on [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) by johnnyvizz: the panel, the progress bar, the cost table and the pixel crabs (themselves after DockCrab's Clawd). MIT licence; see [LICENSE](LICENSE), which carries both copyrights.
