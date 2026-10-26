import { expect, mock, test } from 'claude-code/testing'

const startSession = async ($: any, on: any) => {
  mock.clock(on, { now: Date.parse('2026-10-23T12:00:00Z') })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('settings.read', async () => ({ value: {} }) as never)
  on('tool.register', (_$: any, e: any) => ({ value: { tool: `mcp__the-crew__${e.name}` } }))
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] } }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  const opened: string[] = []
  on('ui.open', (_$: any, e: any) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'terminal', isInteractive: true } as never)
  return opened
}

test('openAtStart on (default): the panel opens when the session starts', async ($, on) => {
  const opened = await startSession($, on)
  expect(opened).toEqual(['crew-agents'])
})

test('openAtStart off: the panel does not open at session start', { options: { openAtStart: 'off' } }, async ($, on) => {
  const opened = await startSession($, on)
  expect(opened).toEqual([])
})
