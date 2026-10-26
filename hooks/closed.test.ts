import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PLUGIN = 'the-crew'
const MODEL = 'claude-sonnet-5-5'
const REQUEST = { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// A panel the person can open and close: `ui.panes` lists it only while it is open.
const panel = (on: On) => {
  const open = new Set<string>()
  on('ui.open', (_$, e) => (open.add(e.id), { value: { isPlaced: true } }) as never)
  on('ui.close', (_$, e) => (open.delete(e.id), { value: undefined }) as never)
  on('ui.panes', () => ({ value: [...open].map(id => ({ id, title: id })) }) as never)
  return open
}

const crew = ($: Engine) => ($.command.run as (e: unknown) => Promise<unknown>)({ command: 'crew', args: '' })

const step = async ($: Engine) => {
  const stream = ($.turn.step as (e: unknown) => AsyncIterable<unknown>)({ turnId: 'turn', index: 0, model: MODEL, messageCount: 1, agentId: 'a1' })
  for await (const _ of stream) void _
}

const pane = { title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } as const


test('closed: the panel keeps counting while closed, and /crew twice keeps what it counted', async ($, on) => {
  mock.clock(on)
  const open = panel(on)
  on('agent.spawn', () => ({ model: MODEL, agentId: 'a1' }))
  on('turn.step', async function* () {
    return { turnId: 'turn', index: 0, answer: '', toolUses: [], stopReason: 'tool_use', usage: { model: MODEL, ...REQUEST } } as never
  })
  await $.agent.spawn({ tool_use_id: 't1', prompt: 'p', description: 'Counted work', subagentType: 'general-purpose', provider: 'engine', parentModel: MODEL, background: false, fork: false } as never)
  await step($)

  await crew($)
  expect(open.has('crew-agents')).toBe(false)
  // Closed: the agent's requests are still counted.
  await step($)
  await step($)
  await crew($)
  expect(open.has('crew-agents')).toBe(true)
  // Sonnet 5.5 is $2 in and $10 out per million, so each request of 1000 in and 500 out is $0.007:
  // three requests counted, two of them while closed, show ≈$0.02, not the ≈$0.01 of the first alone.
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'Pane', requestId: 'crew-agents', props: pane })
  expect(await ui.find({ type: 'Text', text: /≈\$0\.02 / })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /≈\$0\.01 / })).toBeUndefined()
})
