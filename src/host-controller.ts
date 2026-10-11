/** Host controller behind the `promptOptimizer` Remote namespace. */
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ModelSelection, ModelSelectionProjectionState } from '@deepseek-ai/dsh-api-session-controller/types'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import type {} from '@deepseek-ai/dsh-session-projection'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type {
  FinishReason, GenerateOptions, RequestMessage, TextBlock,
} from '@deepseek-ai/dsh-llm/types'
import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { OptimizeHostResult, OptimizeRequest } from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Prompt Optimizer Remote controller. */
    promptOptimizerController: PromptOptimizerController
  }
}

/** Request size and call-budget knobs a deployment may tune. */
export interface Config {
  /** Maximum accepted draft length in characters. */
  maxDraftChars?: number
  /** Maximum conversation turns sent as reference context. */
  maxContextTurns?: number
  /** Maximum characters retained from one conversation turn. */
  maxContextChars?: number
  /** Output-token cap for the auxiliary optimization call. */
  maxOutputTokens?: number
  /** End-to-end deadline for the auxiliary call, in milliseconds. */
  timeoutMs?: number
}

/** Validated runtime configuration; every field carries its schema default. */
export type ResolvedConfig = Required<Config>

/** Validated configuration schema (defaults are the shipped policy). */
export const Config: Schema<Config> = Schema.object({
  maxDraftChars: Schema.natural().min(1).default(8000),
  maxContextTurns: Schema.natural().default(6),
  maxContextChars: Schema.natural().min(1).default(600),
  maxOutputTokens: Schema.natural().min(1).default(2048),
  timeoutMs: Schema.natural().min(1).default(60_000),
})

/** Fixed quality bar (boost-prompt layered framing + prompt-optimizer restraint rules). */
const SYSTEM = `You are a prompt optimization engine embedded in a coding agent's composer. Rewrite the user's raw draft prompt into a single, improved prompt for the SAME coding agent and the SAME session.

Improvement goals, applied with restraint:
1. Clarify intent: make the underlying goal explicit and unambiguous without inventing requirements.
2. Add only context already present in the conversation; never fabricate files, APIs, versions, or facts.
3. Improve structure: lead with the objective, then constraints, then expected output when the draft implies them.
4. Keep the user's language: optimize in the same language the draft uses.
5. Preserve every explicit detail: paths, names, commands, quantities, and priorities survive verbatim.
6. Do not answer the prompt. Do not execute it. Return the improved prompt text only.
7. Match the draft's scope: short casual drafts stay short and natural; detailed specs keep their detail, better organized.
8. Output exactly one prompt and nothing else: no preamble, no explanations, no code fences, no quotes.`

/** Build the one-shot user message: context section followed by the draft. */
function userText(draft: string, context: readonly string[]): string {
  const sections: string[] = []
  if (context.length > 0) {
    sections.push(
      'CONVERSATION CONTEXT (recent turns, for reference only — reuse facts, never invent beyond them):',
      ...context.map((text, index) => `${index + 1}. ${text}`),
    )
  }
  sections.push(
    'DRAFT PROMPT TO OPTIMIZE (rewrite this; preserve intent, language, and every explicit detail):',
    draft.trim(),
  )
  sections.push('Return the optimized prompt only.')
  return sections.join('\n\n')
}

/** Map a terminal finish to its fail-closed error message. */
function finishMessage(finish: FinishReason): string | undefined {
  if (finish.kind === 'error' || finish.kind === 'aborted') return finish.failure.message
  return undefined
}

/**
 * Remove the wrappers a model adds despite the instruction not to: one
 * whole-output Markdown fence, or one pair of matching straight/curly quotes.
 * @param text - assembled model text.
 * @returns the bare prompt.
 */
export function normalizePrompt(text: string): string {
  let value = text.trim()
  const fence = /^```[^\n]*\n([\s\S]*?)\n?```$/u.exec(value)
  if (fence?.[1] !== undefined) value = fence[1].trim()
  const quoted = /^(["'“”‘’])([\s\S]*)\1$/u.exec(value)
  if (quoted?.[2] !== undefined) {
    const inner = quoted[2].trim()
    // Only unwrap when the quotes wrap the whole prompt rather than sit inside it.
    if (inner.length > 0 && !inner.includes(quoted[1])) value = inner
  }
  return value.trim()
}

/**
 * Optimization is an auxiliary one-shot LLM call: it never activates or submits
 * to an Agent and never enters a Session log. The route is the Session's
 * currently selected model (pending selection, then last used, then the
 * deployment default).
 */
export default class PromptOptimizerController extends TypertRemoteService {
  static inject = ['llm', 'typert']

  private readonly config: ResolvedConfig

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'promptOptimizerController', { namespace: 'promptOptimizer' })
    this.config = {
      maxDraftChars: config.maxDraftChars ?? 8000,
      maxContextTurns: config.maxContextTurns ?? 6,
      maxContextChars: config.maxContextChars ?? 600,
      maxOutputTokens: config.maxOutputTokens ?? 2048,
      timeoutMs: config.timeoutMs ?? 60_000,
    }
  }

  /**
   * Optimize one draft with session context awareness.
   * @param request - draft, optional conversation turns, and session id.
   * @param signal - Client cancellation or Remote contribution disposal.
   * @returns the optimized prompt text and route.
   * @throws RemoteError with `prompt-optimizer/*` codes on invalid input or call failure.
   */
  @Remote
  async optimize(request: OptimizeRequest, signal: AbortSignal): Promise<OptimizeHostResult> {
    signal.throwIfAborted()
    const draft = request.draft
    if (typeof draft !== 'string' || draft.trim().length === 0) {
      throw new RemoteError('prompt-optimizer/invalid-draft', 'Draft must be non-empty text', {})
    }
    if (draft.length > this.config.maxDraftChars) {
      throw new RemoteError(
        'prompt-optimizer/draft-too-large',
        `Draft exceeds ${this.config.maxDraftChars} characters`,
        {},
      )
    }
    const context = (Array.isArray(request.context) ? request.context : [])
      .filter((turn): turn is string => typeof turn === 'string' && turn.trim().length > 0)
      .slice(-this.config.maxContextTurns)
      .map(turn => turn.length > this.config.maxContextChars
        ? `${turn.slice(0, this.config.maxContextChars)}…`
        : turn)
    const route = this.routeOf(request.sessionId)
    if (route === undefined) {
      throw new RemoteError('prompt-optimizer/no-route', 'No model route is available yet; send one message first', {})
    }
    const messages: RequestMessage[] = [createUserMessage({
      content: [{ type: 'text', text: userText(draft, context) }],
      source: { kind: 'user' },
    })]
    // Bound the call so a stalled provider cannot hold the composer forever.
    const timeout = AbortSignal.timeout(this.config.timeoutMs)
    const callSignal = AbortSignal.any([signal, timeout])
    const options: GenerateOptions = {
      provider: route.provider,
      model: route.model,
      ...(route.reasoningEffort === undefined
        ? {}
        : { reasoningEffort: route.reasoningEffort as GenerateOptions['reasoningEffort'] }),
      messages,
      system: SYSTEM,
      maxTokens: this.config.maxOutputTokens,
      sessionId: route.sessionId,
      purpose: 'compaction',
      signal: callSignal,
    }
    const assembler = new BlockAssembler()
    try {
      for await (const chunk of this.ctx.llm.stream(options)) assembler.push(chunk)
    } catch (error) {
      if (signal.aborted) throw new RemoteError('gateway/cancelled', 'Optimization was cancelled', {})
      if (timeout.aborted) {
        throw new RemoteError('prompt-optimizer/timeout', `Optimization exceeded ${this.config.timeoutMs}ms`, {})
      }
      throw new RemoteError('prompt-optimizer/call-failed', error instanceof Error ? error.message : String(error), {})
    }
    const failure = finishMessage(assembler.finish)
    if (failure !== undefined) {
      throw new RemoteError('prompt-optimizer/call-failed', failure, {})
    }
    const prompt = normalizePrompt(assembler.blocks()
      .filter((block): block is TextBlock => block.type === 'text')
      .map(block => block.text)
      .join(''))
    if (prompt.length === 0) {
      throw new RemoteError('prompt-optimizer/empty-result', 'The model returned no text', {})
    }
    return { prompt, provider: route.provider, model: route.model }
  }

  /**
   * Resolve the Session's currently selected model route: the user's pending
   * selection (not yet consumed by a request) wins, falling back to the route
   * the Session last used, then to the deployment's default model selection.
   * @param sessionId - session whose selection is read.
   * @returns provider, model, reasoning effort, and the branded session id, or undefined when no selection exists.
   */
  private routeOf(sessionId: unknown): {
    provider: string
    model: string
    reasoningEffort: string | undefined
    sessionId: SessionId | undefined
  } | undefined {
    if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
    const branded = sessionId as SessionId
    const agent = this.ctx.get('agents')?.get(branded) as Agent | undefined
    if (agent === undefined) return undefined
    // 1. The Session's durable model-selection fold: pending beats last-used.
    // Read through `ctx.get()` — an optional service a composition may omit.
    const projections = this.ctx.get('sessionProjections')
    const selection: ModelSelectionProjectionState | undefined = projections?.stateOf(agent.session, 'modelSelection')
    const picked: ModelSelection | null | undefined = selection?.pending ?? selection?.lastUsed
    if (picked !== null && picked !== undefined && picked.provider.length > 0 && picked.model.length > 0) {
      return {
        provider: picked.provider,
        model: picked.model,
        reasoningEffort: picked.reasoningEffort,
        sessionId: branded,
      }
    }
    // 2. The logged request header (the same fold's durable arm, older logs).
    const config = agent.session.requestHeader()?.config
    if (config !== undefined && config.provider.length > 0 && config.model.length > 0) {
      return {
        provider: config.provider,
        model: config.model,
        reasoningEffort: config.reasoningEffort === undefined ? undefined : String(config.reasoningEffort),
        sessionId: branded,
      }
    }
    // 3. The deployment's default model selection (a brand-new session that
    // has never routed inherits the configured default).
    let fallback: ModelSelection | undefined
    try {
      fallback = this.ctx.get('agentDefaultModel')?.currentSelection()
    } catch {
      fallback = undefined
    }
    if (fallback !== undefined && fallback.provider.length > 0 && fallback.model.length > 0) {
      return {
        provider: fallback.provider,
        model: fallback.model,
        reasoningEffort: fallback.reasoningEffort === undefined ? undefined : String(fallback.reasoningEffort),
        sessionId: branded,
      }
    }
    return undefined
  }
}
