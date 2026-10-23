import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PLUGIN = 'crew-progress'
const NOW = Date.parse('2026-10-23T12:00:00Z')
const pane = { title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } as const

// Subagent a1's conversation: its brief, a reply with one tool call, the tool's result, its answer.
const THREAD = [
  { role: 'user', text: 'Check the build.', toolUses: [] },
  { role: 'assistant', text: 'Looking at the config.', toolUses: [{ tool_use_id: 'u1', tool: 'Read', input: { file_path: '/repo/build.json' } }] },
  { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 'u1', text: '{}' }] },
  { role: 'assistant', text: 'The build is fine.', toolUses: [] },
]

// The engine beneath the plugin: one subagent `a1`, whose thread `messages` answers.
const session = async ($: Engine, on: On, messages: unknown = THREAD) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__crew-progress__${e.name}` } }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('agent.spawn', () => ({ model: 'claude-haiku-4-5', agentId: 'a1' }))
  on('session.messages', (_$, e) => ({ value: (e.agentId === 'a1' ? messages : { deny: `no agent ${e.agentId}` }) as never }))
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'terminal', isInteractive: true } as never)
  await $.agent.spawn({
    tool_use_id: 't1',
    prompt: 'Role: leaf; Profile: tester',
    description: 'Side work',
    subagentType: 'general-purpose',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background: false,
    fork: false,
  } as never)
}

const mount = ($: Engine, surface: 'terminal' | 'desktop') =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane', requestId: 'crew-agents', props: pane })

test("view: pressing a subagent's row opens its thread in place of the agents", async ($, on) => {
  await session($, on)
  const ui = await mount($, 'desktop')
  // The row's title is the pressable: no separate open button, no title in the row's drawing.
  expect((await ui.find({ type: 'Button', key: 'view-a1' }))?.props.label).toBe('Side work')
  const row = await ui.find({ type: 'Svg', alt: /^Side work:/ })
  expect(String(row?.props.source)).not.toContain('>Side work<')
  await ui.press({ key: 'view-a1' })

  // The mounted pane redraws on the press: the same mount now shows the thread.
  const thread = ui
  expect((await thread.find({ type: 'Button', key: 'back' }))?.props.label).toBe('‹ Agents')
  const texts = (await thread.findAll({ type: 'Markdown' })).map(el => String(el.props.text))
  expect(texts).toEqual(['Check the build.', 'Looking at the config.', 'The build is fine.'])
  expect(await thread.find({ type: 'Text', text: /→ Read · \/repo\/build\.json/ })).toBeDefined()
  // The agents list is gone while the thread shows: only the viewed run's row is drawn.
  expect((await thread.findAll({ type: 'Svg' })).map(el => String(el.props.alt))).toEqual(['Side work: Haiku 4.5'])
})

test('view: the back button returns to the agents', async ($, on) => {
  await session($, on)
  const ui = await mount($, 'desktop')
  await ui.press({ key: 'view-a1' })
  await ui.press({ key: 'back' })
  expect(await ui.findAll({ type: 'Button', key: 'back' })).toHaveLength(0)
  expect(await ui.find({ type: 'Button', key: 'view-a1' })).toBeDefined()
})

test('view: a thread the session cannot read says why', async ($, on) => {
  await session($, on, { deny: 'no transcript for a1' })
  const ui = await mount($, 'desktop')
  await ui.press({ key: 'view-a1' })
  expect(await ui.find({ type: 'Text', text: /no transcript for a1/ })).toBeDefined()
})

test('view: an empty thread says so', async ($, on) => {
  await session($, on, [])
  const ui = await mount($, 'desktop')
  await ui.press({ key: 'view-a1' })
  expect(await ui.find({ type: 'Text', text: /No messages yet/ })).toBeDefined()
})

test("view: the terminal panel's rows open nothing", async ($, on) => {
  await session($, on)
  const ui = await mount($, 'terminal')
  expect(await ui.findAll({ type: 'Button', key: 'view-a1' })).toHaveLength(0)
})

test('view: the back button sits in its own row above the thread', async ($, on) => {
  await session($, on)
  const ui = await mount($, 'desktop')
  await ui.press({ key: 'view-a1' })
  const tree = JSON.stringify(await ui.drawn())
  // The header row comes before the thread's clipped window, and nothing is laid over it.
  expect(tree.indexOf('"back"')).toBeLessThan(tree.indexOf('Check the build.'))
  expect(tree).not.toContain('"absolute"')
})

test('view: a long thread shows its newest messages at the bottom', async ($, on) => {
  const long = Array.from({ length: 60 }, (_, i) => ({ role: 'assistant', text: `Message ${i}.`, toolUses: [] }))
  await session($, on, long)
  const ui = await mount($, 'desktop')
  await ui.press({ key: 'view-a1' })
  const texts = (await ui.findAll({ type: 'Markdown' })).map(el => String(el.props.text))
  expect(texts.at(-1)).toBe('Message 59.')
  expect(texts).not.toContain('Message 0.')
})
