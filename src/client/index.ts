/** Browser entry for the composer Prompt Optimizer toolbar activity. */
import type { Context } from '@deepseek-ai/cordis'
import remote from '@deepseek-ai/dsh-prompt-optimizer/remote'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { mountPromptOptimizer } from './mount.ts'

/**
 * Services required before `apply` runs: the Remote carrier, the slot registry,
 * and the locale registry. The plugin's own namespace is deliberately absent —
 * this plugin mounts it, and the UI resolves it lazily so a missing Host half
 * reports on click instead of stalling activation (a PENDING entry surfaces as
 * a boot failure).
 */
export const inject = ['remote', 'slots', 'locale']

export type { PromptOptimizerInjected, PromptOptimizerProps } from './PromptOptimizer.tsx'
export type { OptimizeOutcome, OptimizeResult, OptimizeFailure } from '../types.ts'
export type { PromptOptimizerKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { promptOptimizer: import('./locales.ts').PromptOptimizerKey }
}

/**
 * Mount the Host Remote namespace, then register the composer toolbar entry.
 * @param ctx - browser plugin context.
 * @returns disposer joining UI and Remote withdrawal.
 */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const unmountRemote = await ctx.remote.$mount(remote as TypertRemoteContribution)
  const ui = ctx.inject(['slots', 'locale'], child => mountPromptOptimizer(child))
  try {
    await ui
  } catch (error) {
    await ui.dispose()
    await unmountRemote()
    throw error
  }
  return async () => {
    await ui.dispose()
    await unmountRemote()
  }
}
