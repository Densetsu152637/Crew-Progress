export type Phase = 'plan' | 'design' | 'delegate' | 'review' | 'close'

export type PlannedTask = {
  title: string
  tier: string
  after: number[]
}

export type Flow = {
  title: string
  total: number
  done: number
  running: number
  phase: Phase
  isFinished: boolean
  tasks: PlannedTask[]
}

/** `idle` is the main session's row between turns. */
export type AgentStatus = 'running' | 'done' | 'failed' | 'idle'

export type AgentRun = {
  id: string
  agentId?: string
  type: string
  /**
   * What the run is drawn as: a workflow profile (`implementer`, from its type or its
   * brief's `Profile:` tag), a savvy tier, `root` for the main session, or `other`.
   */
  role?: string
  description: string
  model: string
  effort?: string
  status: AgentStatus
  startedAt: number
  endedAt?: number
  contextTokens: number
  contextMax: number
  tokens: number
  costUsd: number
  steps: number
  round: number
  /** Self-reported by the worker through the `step` tool. */
  stepDone?: number
  stepTotal?: number
  stepNote?: string
}

export type Panel = {
  isCompact: boolean
  isDoneCollapsed: boolean
  autoOpenedFor: string
}

declare module 'claude-code' {
  interface PluginState {
    'crew-progress': {
      flow: Flow | null
      agents: AgentRun[]
      /** The main session's own usage, drawn as the panel's first row. */
      root: AgentRun | null
      panel: Panel
      now: number
    }
  }
}
