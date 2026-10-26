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

// The engine beneath the plugin; `calls` counts what the tests watch. No agent is spawned yet.
const session = async ($: Engine, on: On) => {
  const calls = { messages: 0 }
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__crew-progress__${e.name}` } }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('agent.spawn', () => ({ model: 'claude-haiku-4-5', agentId: 'a1' }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }) as never)
  on('turn.step', async function* (_$, e) {
    return { turnId: e.turnId, index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage: USAGE } as never
  })
  on('session.messages', () => {
    calls.messages++
    return { value: THREAD as never }
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

test('perf: a thread is fetched once, not on every clock tick, and again after its agent steps', async ($, on) => {
  const { clock, calls } = await session($, on)
  await spawn($)
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'crew-agents', props: pane })
  await ui.press({ key: 'view-a1' })
  expect(calls.messages).toBe(1)
  await clock.advance(5000)
  expect(calls.messages).toBe(1)
  const stepped = $.turn.step as (e: unknown) => AsyncIterable<unknown>
  for await (const _ of stepped({ index: 0, messageCount: 1, turnId: 's1', model: 'claude-haiku-4-5', agentId: 'a1' })) void _
  await clock.settle()
  expect(calls.messages).toBe(2)
  await ui.unmount()
})
