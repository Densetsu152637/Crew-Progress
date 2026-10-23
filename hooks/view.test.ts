import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PLUGIN = 'crew-progress'
const NOW = Date.parse('2026-10-23T12:00:00Z')
const pane = (view: { agentId?: string }) =>
  ({ title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view }) as const

// The engine beneath the plugin: one subagent `a1`, and every view the panel asks for kept in `views`.
const session = async ($: Engine, on: On, views: unknown[], deny?: string) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__crew-progress__${e.name}` } }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('agent.spawn', () => ({ model: 'claude-haiku-4-5', agentId: 'a1' }))
  on('ui.view', (_$, e) => (views.push(e), { value: deny ? { deny } : {} }))
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

const mount = ($: Engine, surface: 'terminal' | 'desktop', view: { agentId?: string } = {}) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane', requestId: 'crew-agents', props: pane(view) })

for (const surface of ['terminal', 'desktop'] as const) {
  test(`view (${surface}): a subagent's row opens its task in the main view`, async ($, on) => {
    const views: unknown[] = []
    await session($, on, views)
    const ui = await mount($, surface)
    const open = await ui.find({ type: 'Button', key: 'view-a1' })
    expect(open?.props.label).toBe('Open task ›')
    await ui.press({ key: 'view-a1' })
    expect(views).toEqual([{ agentId: 'a1' }])
  })

  test(`view (${surface}): the row in view goes back to the main conversation`, async ($, on) => {
    const views: unknown[] = []
    await session($, on, views)
    const ui = await mount($, surface, { agentId: 'a1' })
    const back = await ui.find({ type: 'Button', key: 'view-a1' })
    expect(back?.props.label).toBe('‹ Back to main')
    await ui.press({ key: 'view-a1' })
    expect(views).toEqual([{}])
  })
}

test('view: a refused view is said in a toast', async ($, on) => {
  const views: unknown[] = []
  const toasts: unknown[] = []
  on('ui.toast', (_$, e) => (toasts.push(e), { value: undefined }))
  await session($, on, views, 'no agent holds the id')
  const ui = await mount($, 'desktop')
  await ui.press({ key: 'view-a1' })
  expect(JSON.stringify(toasts)).toContain('no agent holds the id')
})
