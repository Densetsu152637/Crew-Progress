import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PLUGIN = 'the-crew'
const NOW = Date.parse('2026-10-24T12:00:00Z')
const pane = { title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } as const
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

// The engine beneath the plugin: subagent `a1` has run one turn and finished.
const finished = async ($: Engine, on: On) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__the-crew__${e.name}` } }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('agent.spawn', () => ({ model: 'claude-haiku-4-5', agentId: 'a1' }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }) as never)
  on('turn.step', async function* (_$, e) {
    return { turnId: e.turnId, index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage: USAGE } as never
  })
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'terminal', isInteractive: true } as never)
  await $.agent.spawn(SPAWN as never)
  const stream = ($.turn.step as (e: unknown) => AsyncIterable<unknown>)({ index: 0, messageCount: 1, turnId: 's1', model: 'claude-haiku-4-5', agentId: 'a1' })
  for await (const _ of stream) void _
  await $.turn.complete({ turnId: 's1', agentId: 'a1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
  return clock
}

// The subagent's row as the desktop panel draws it: its alt names its state.
const row = async ($: Engine, title = 'Side work') => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'crew-agents', props: pane })
  const svgs = await ui.findAll({ type: 'Svg' })
  await ui.unmount()
  const alts = svgs.map(el => String(el.props.alt)).filter(alt => /: [A-Z]\w+ [\d.]+, (running|finished)$/.test(alt))
  const found = svgs.find(el => String(el.props.alt).startsWith(`${title}:`))
  return { alt: String(found?.props.alt), source: String(found?.props.source), rows: alts.length, order: alts }
}

test('resume: a finished subagent reads as finished', async ($, on) => {
  await finished($, on)
  expect((await row($)).alt).toBe('Side work: Haiku 4.5, finished')
})

test('resume: a subagent resumed by a message is running again on its new task, its totals kept', async ($, on) => {
  await finished($, on)
  const before = await row($)
  await $.agent.spawn({ ...SPAWN, tool_use_id: 't2', prompt: 'One more thing.\nDetails follow.', resume: { agentId: 'a1' } } as never)
  const after = await row($, 'One more thing.')
  expect(after.alt).toBe('One more thing.: Haiku 4.5, running')
  expect(after.rows).toBe(1)
  // The cost of its first run stays on the row.
  expect(after.source).toContain(/≈\$[0-9.]+/.exec(before.source)?.[0] ?? 'no cost')
})

test('resume: a turn starting in a finished subagent puts it back to running', async ($, on) => {
  await finished($, on)
  await $.turn.start({ text: 'again', turnId: 's2', agentId: 'a1' } as never)
  expect((await row($, 'again')).alt).toBe('again: Haiku 4.5, running')
  await $.turn.complete({ turnId: 's2', agentId: 'a1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
  expect((await row($, 'again')).alt).toBe('again: Haiku 4.5, finished')
})

test('resume: SendMessage to a finished subagent renews its row with the summary before the send answers', async ($, on) => {
  let during = ''
  on('tool.call', { tool: 'SendMessage' }, async () => {
    during = (await row($, 'Check the edge cases')).alt
    return { result: { success: true } } as never
  })
  await finished($, on)
  await $.tool.call({ tool: 'mcp__the-crew__step', agentId: 'a1', done: 2, total: 2, note: 'old task' } as never)
  await $.tool.call({ tool: 'SendMessage', to: 'a1', summary: 'Check the edge cases', message: 'Role: leaf; Profile: debugger\nLook again.' } as never)
  expect(during).toBe('Check the edge cases: Haiku 4.5, running')
  const after = await row($, 'Check the edge cases')
  expect(after.source).not.toContain('old task')
  expect(after.source).toContain('debugger')
})

test('resume: a SendMessage by name finds the agent through the engine list', async ($, on) => {
  on('agent.list', () => ({ value: [{ id: 'a1', name: 'scout', description: 'Side work', type: 'general-purpose', status: 'completed' }] }) as never)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }) as never)
  await finished($, on)
  await $.tool.call({ tool: 'SendMessage', to: 'scout', message: 'Next: the docs.' } as never)
  expect((await row($, 'Next: the docs.')).alt).toBe('Next: the docs.: Haiku 4.5, running')
})

test('resume: a refused SendMessage leaves the row finished', async ($, on) => {
  on('tool.call', { tool: 'SendMessage' }, () => ({ deny: 'nobody by that name' }) as never)
  await finished($, on)
  await $.tool.call({ tool: 'SendMessage', to: 'a1', summary: 'New task', message: 'Go.' } as never)
  expect((await row($)).alt).toBe('Side work: Haiku 4.5, finished')
})

test('resume: a finished row the engine lists as running again moves under Running', async ($, on) => {
  let status = 'completed'
  on('agent.list', () => ({ value: [{ id: 'a1', description: 'Side work', type: 'general-purpose', status }] }) as never)
  const clock = await finished($, on)
  // With only finished rows the panel polls the engine's list slowly, every five seconds.
  await clock.advance(5000)
  expect((await row($)).alt).toBe('Side work: Haiku 4.5, finished')
  status = 'running'
  await clock.advance(5000)
  expect((await row($)).alt).toBe('Side work: Haiku 4.5, running')
})
