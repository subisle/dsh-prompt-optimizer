/** Shared wire vocabulary between the client toolbar and the Host controller. */
import type {} from '@deepseek-ai/dsh-typert-protocol'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The submitted draft was empty or not text. */
    'prompt-optimizer/invalid-draft': {}
    /** The draft exceeded the configured size limit. */
    'prompt-optimizer/draft-too-large': {}
    /** No logged model route is available for the addressed session. */
    'prompt-optimizer/no-route': {}
    /** The auxiliary LLM call failed or ended with an error finish. */
    'prompt-optimizer/call-failed': {}
    /** The auxiliary call exceeded the configured deadline. */
    'prompt-optimizer/timeout': {}
    /** The model produced no text blocks. */
    'prompt-optimizer/empty-result': {}
  }
}

/** Draft plus context submitted to the optimizer. */
export interface OptimizeRequest {
  /** The raw composer draft, plain text. */
  readonly draft: string
  /** Recent conversation user turns, oldest first. */
  readonly context?: readonly string[]
  /** Session the request belongs to; routes the auxiliary call like the Session. */
  readonly sessionId?: string
}

/** Host controller's result: prompt plus the exact route used. */
export interface OptimizeHostResult {
  readonly prompt: string
  readonly provider: string
  readonly model: string
}

/** Successful optimization: the prompt plus the exact route used. */
export type OptimizeResult = {
  readonly ok: true
  readonly value: {
    readonly prompt: string
    readonly provider: string
    readonly model: string
  }
}

/** Failed optimization: a typed failure detail. */
export type OptimizeFailure = {
  readonly ok: false
  readonly error: { readonly message: string }
}

/** Outcome envelope the client toolbar consumes. */
export type OptimizeOutcome = OptimizeResult | OptimizeFailure
