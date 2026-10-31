import type { SessionMessage } from 'claude-code'

import type { AgentRun, Flow, Panel } from '../types'

// What the panel keeps between runs of one session. The engine holds a plugin's state only for
// the process, so a session resumed later started with an empty panel; this is the copy that
// outlives the process, stored under the session's id (`$.store`).

/** The arguments of a tool call a thread line shows (see `toolLine`). */
export const TOOL_ARG_KEYS = ['description', 'file_path', 'path', 'command', 'pattern', 'url', 'query'] as const

export type KeptMessage = {
  role: 'user' | 'assistant'
  text: string
  toolUses: { tool_use_id: string; tool: string; input: Record<string, unknown> }[]
}

export type Snapshot = {
  /** Which idea of the panel wrote it; another one is let go, as a stored value of another shape. */
  shape: 1
  savedAt: number
  flow: Flow | null
  agents: AgentRun[]
  root: AgentRun | null
  panel: Pick<Panel, 'isCompact' | 'isDoneCollapsed' | 'viewing'>
  /** The conversations of the subagents, by agent id: the newest messages, as a thread draws them. */
  threads: Record<string, KeptMessage[]>
}

/** Sessions kept; the least recently saved ones are dropped past it. */
export const SESSIONS_KEPT = 10
/** Characters of thread text kept for one subagent, and for one session in all. */
export const AGENT_CHARS = 40_000
export const SESSION_CHARS = 120_000
const ARG_CHARS = 300

export const snapshotKey = (sessionId: string): string => `session:${sessionId}`
export const INDEX_KEY = 'sessions'

const clip = (s: string, max: number): string => (s.length > max ? s.slice(0, max) : s)

/**
 * A conversation cut to what the thread draws: only messages with text or tool calls, the text
 * cut to `textMax`, a tool call down to the arguments its line shows, the newest messages first
 * to spend `cap` characters.
 */
export function keepThread(messages: readonly SessionMessage[], textMax: number, cap: number): KeptMessage[] {
  const out: KeptMessage[] = []
  let budget = cap
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (!m || (!m.text && m.toolUses.length === 0)) continue
    const text = clip(m.text, textMax)
    const toolUses = m.toolUses.map(u => {
      const input: Record<string, unknown> = {}
      for (const k of TOOL_ARG_KEYS) {
        const v = u.input?.[k]
        if (typeof v === 'string') input[k] = clip(v, ARG_CHARS)
      }
      return { tool_use_id: u.tool_use_id, tool: u.tool, input }
    })
    const cost = text.length + toolUses.length * 120
    if (cost > budget && out.length > 0) break
    budget -= cost
    out.push({ role: m.role, text, toolUses })
  }
  return out.reverse()
}

/** Threads kept for the agents still on the panel, newest agents first, within the session's budget. */
export function keepThreads(kept: ReadonlyMap<string, KeptMessage[]>, agents: readonly AgentRun[]): Record<string, KeptMessage[]> {
  const out: Record<string, KeptMessage[]> = {}
  let budget = SESSION_CHARS
  for (const a of [...agents].reverse()) {
    const thread = a.agentId ? kept.get(a.agentId) : undefined
    if (!a.agentId || !thread) continue
    const cost = thread.reduce((n, m) => n + m.text.length + m.toolUses.length * 120, 0)
    if (cost > budget) continue
    budget -= cost
    out[a.agentId] = thread
  }
  return out
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * A stored snapshot as the panel resumes it: nothing runs in a process that has just started, so a
 * run that was running is failed at the time it was saved, and the main session rests. Undefined
 * for a value that is not a snapshot of this shape.
 */
export function reviveSnapshot(stored: unknown): Snapshot | undefined {
  if (!isObject(stored) || stored.shape !== 1 || !Array.isArray(stored.agents) || !isObject(stored.panel) || !isObject(stored.threads)) return undefined
  const s = stored as unknown as Snapshot
  const rest = (a: AgentRun): AgentRun => (a.status === 'running' ? { ...a, status: 'failed', endedAt: s.savedAt } : a)
  return {
    ...s,
    agents: s.agents.map(rest),
    root: s.root ? { ...s.root, status: s.root.status === 'running' ? 'idle' : s.root.status } : null,
    flow: s.flow ? { ...s.flow, running: 0 } : null,
  }
}

/** The index with `id` first, and the ids it no longer holds. */
export function touchIndex(index: unknown, id: string): { index: string[]; dropped: string[] } {
  const ids = (Array.isArray(index) ? index : []).filter((x): x is string => typeof x === 'string' && x !== id)
  const all = [id, ...ids]
  return { index: all.slice(0, SESSIONS_KEPT), dropped: all.slice(SESSIONS_KEPT) }
}
