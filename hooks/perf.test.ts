import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PLUGIN = 'crew-progress'
const PROGRESS = 'mcp__crew-progress__progress'
const NOW = Date.parse('2026-10-25T12:00:00Z')
const pane = { title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } as const
const band = { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} }
const USAGE = { model: 'claude-haiku-4-5', input_tokens: 1000, output_tokens: 1000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
const SPAWN = {
  tool_use_id: 't1',
  prompt: 'Role: leaf; Profile: tester',
  description: 'Side work',
  subagentType: 'general-purpose',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'claude-opus-5-5',
  background: false,
  fork: false,
}
const THREAD = [{ role: 'assistant', text: 'Looking.', toolUses: [] }]
// What each agent's conversation holds now; a test pushes a row here, then raises the event that stored it.
const rows: Record<string, unknown[]> = {}
let current: ReturnType<typeof mock.clock> | undefined

// The engine beneath the plugin; `calls` counts what the tests watch. No agent is spawned yet.
const session = async ($: Engine, on: On) => {
  const calls = { messages: 0 }
  rows.a1 = [...THREAD]
  rows.a2 = [...THREAD]
  const clock = mock.clock(on, { now: NOW })
  current = clock
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__crew-progress__${e.name}` } }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('agent.spawn', (_$, e) => ({ model: 'claude-haiku-4-5', agentId: e.tool_use_id === 't2' ? 'a2' : 'a1' }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }) as never)
  on('turn.step', async function* (_$, e) {
    return { turnId: e.turnId, index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage: USAGE } as never
  })
  on('session.messages', (_$, e) => {
    calls.messages++
    return { value: [...(rows[e.agentId ?? ''] ?? [])] as never }
  })
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'terminal', isInteractive: true } as never)
  return { clock, calls }
}

const spawn = ($: Engine) => $.agent.spawn(SPAWN as never)
const finish = ($: Engine) =>
  $.turn.complete({ turnId: 's1', agentId: 'a1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)

const sources = async ($: Engine, component: 'Pane' | 'AbovePrompt') => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'desktop',
    component,
    requestId: component === 'Pane' ? 'crew-agents' : undefined,
    props: component === 'Pane' ? pane : band,
  } as never)
  const svgs = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  await ui.unmount()
  return svgs
}

test('perf: a finished or idle panel and bar draw no animation', async ($, on) => {
  await session($, on)
  await $.tool.call({ tool: PROGRESS, title: 'Ship it', phase: 'delegate', total: 1 } as never)
  await spawn($)
  // Running: the bar and the row animate, in a few elements.
  const live = [...(await sources($, 'AbovePrompt')), ...(await sources($, 'Pane'))].join('')
  expect(live).toContain('infinite')
  const bar = (await sources($, 'AbovePrompt'))[0] ?? ''
  expect(bar.match(/<g class="t[0-3]"/g)?.length ?? 0).toBeLessThanOrEqual(8)
  expect(bar.match(/<rect class="t\d"/g)).toBeNull()

  await finish($)
  await $.tool.call({ tool: PROGRESS, done: 1, finished: true } as never)
  const still = [...(await sources($, 'AbovePrompt')), ...(await sources($, 'Pane'))].join('')
  expect(still).not.toContain('infinite')
  expect(still).not.toContain('@keyframes')
})

// The main session's row says how long it has run by the panel's `now`, which only the clock ticker and events move.
const mainTime = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'crew-agents', props: pane })
  const row = (await ui.findAll({ type: 'Svg' })).find(el => String(el.props.alt).startsWith('Main session:'))
  await ui.unmount()
  return /\s(\d+:\d\d)<\/text>/.exec(String(row?.props.source))?.[1]
}

test('perf: the clock ticks only while the main turn runs', async ($, on) => {
  const { clock } = await session($, on)
  await clock.advance(60_000)
  expect(await mainTime($)).toBe('0:00')

  await $.turn.start({ text: 'go', turnId: 'm1' } as never)
  await clock.advance(3000)
  expect(await mainTime($)).toBe('1:03')

  await $.turn.complete({ turnId: 'm1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
  // Nothing runs: the clock is cancelled, no tick moves the panel's time on.
  await clock.advance(60_000)
  expect(await mainTime($)).toBe('1:03')

  // The next turn starts it again.
  await $.turn.start({ text: 'again', turnId: 'm2' } as never)
  await clock.advance(2000)
  expect(await mainTime($)).toBe('2:05')
})

test('perf: the clock stops when the last agent finishes and starts with the next one', async ($, on) => {
  const { clock } = await session($, on)
  await spawn($)
  await clock.advance(3000)
  expect(await mainTime($)).toBe('0:03')

  await finish($)
  await clock.advance(60_000)
  expect(await mainTime($)).toBe('0:03')

  await $.turn.start({ text: 'again', turnId: 's2', agentId: 'a1' } as never)
  await clock.advance(2000)
  expect(await mainTime($)).toBe('1:05')
})

test("perf: a finished row's drawing is reused while the clock ticks", async ($, on) => {
  const { clock } = await session($, on)
  await spawn($)
  await finish($)
  await $.agent.spawn({ ...SPAWN, tool_use_id: 't2', description: 'Second task' } as never)
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'crew-agents', props: pane })
  const source = async (title: string) =>
    String((await ui.findAll({ type: 'Svg' })).find(el => String(el.props.alt).startsWith(`${title}:`))?.props.source)
  const done1 = await source('Side work')
  const run1 = await source('Second task')
  await clock.advance(3000)
  const done2 = await source('Side work')
  const run2 = await source('Second task')
  // The same string, not merely an equal one, would be a hit; equality holds for the finished row alone.
  expect(done2).toBe(done1)
  // The running row's elapsed time moved on.
  expect(run2).not.toBe(run1)
  expect(run2).toContain('0:03')
  await ui.unmount()
})

// A row stored in an agent's conversation; the redraw it asks for settles on the mocked clock.
const note = async ($: Engine, agentId: string, text: string) => {
  await $.session.append({ message: { type: 'user', content: [{ type: 'text', text }] }, agentId } as never)
  await current?.settle()
}

const thread = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'crew-agents', props: pane })
  await ui.press({ key: 'view-a1' })
  return ui
}
const texts = async (ui: Awaited<ReturnType<typeof thread>>) => (await ui.findAll({ type: 'Markdown' })).map(el => String(el.props.text))

test('perf: a thread is fetched once, not on every clock tick', async ($, on) => {
  const { clock, calls } = await session($, on)
  await spawn($)
  const ui = await thread($)
  expect(calls.messages).toBe(1)
  await clock.advance(5000)
  expect(calls.messages).toBe(1)
  await ui.unmount()
})

test('thread: a row stored for the viewed agent is fetched once and shown', async ($, on) => {
  const { calls } = await session($, on)
  await spawn($)
  const ui = await thread($)
  expect(await texts(ui)).toEqual(['Looking.'])
  rows.a1?.push({ role: 'assistant', text: 'Found it.', toolUses: [] })
  await note($, 'a1', 'Found it.')
  expect(calls.messages).toBe(2)
  expect(await texts(ui)).toEqual(['Looking.', 'Found it.'])
  await ui.unmount()
})

test("thread: another agent's rows fetch nothing", async ($, on) => {
  const { calls } = await session($, on)
  await spawn($)
  await $.agent.spawn({ ...SPAWN, tool_use_id: 't2', description: 'Other work' } as never)
  const ui = await thread($)
  await note($, 'a2', 'Elsewhere.')
  expect(calls.messages).toBe(1)
  await ui.unmount()
})

test('thread: a step whose row is stored later still shows once it is stored', async ($, on) => {
  const { calls } = await session($, on)
  await spawn($)
  const ui = await thread($)
  const stepped = $.turn.step as (e: unknown) => AsyncIterable<unknown>
  for await (const _ of stepped({ index: 0, messageCount: 1, turnId: 's1', model: 'claude-haiku-4-5', agentId: 'a1' })) void _
  // The step's reply is not stored yet: the thread is as it was.
  expect(await texts(ui)).toEqual(['Looking.'])
  rows.a1?.push({ role: 'assistant', text: 'Late reply.', toolUses: [] })
  await note($, 'a1', 'Late reply.')
  expect(await texts(ui)).toEqual(['Looking.', 'Late reply.'])
  expect(calls.messages).toBeLessThanOrEqual(3)
  await ui.unmount()
})

test('thread: closing the thread stops the fetches', async ($, on) => {
  const { calls } = await session($, on)
  await spawn($)
  const ui = await thread($)
  await ui.press({ key: 'back' })
  const before = calls.messages
  await note($, 'a1', 'After close.')
  await finish($)
  expect(calls.messages).toBe(before)
  await ui.unmount()
})
