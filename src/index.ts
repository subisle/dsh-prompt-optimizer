/** Host face of the Prompt Optimizer bundle: mounts the Remote controller. */
import type { Context } from '@deepseek-ai/cordis'
import PromptOptimizerController, { Config } from './host-controller.ts'
import type { Config as PromptOptimizerConfig } from './host-controller.ts'

export const name = 'prompt-optimizer-host'
export const inject = ['llm', 'typert']

/** Validated plugin configuration schema (the exported `PromptOptimizerConfig` type). */
export { Config }

export type { PromptOptimizerConfig }
export type { OptimizeRequest, OptimizeHostResult as OptimizeResult } from './types.ts'
export { normalizePrompt, userText } from './host-controller.ts'

/**
 * Mount the promptOptimizer Remote namespace with the deployment's config.
 * @param ctx - host plugin context.
 * @param config - validated call-budget and size limits.
 */
export function apply(ctx: Context, config: PromptOptimizerConfig = {}): void {
  ctx.plugin(PromptOptimizerController, config)
}
