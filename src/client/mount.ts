/** Composition wiring: register the conversation.input.right entry. */
import './standard-props.ts'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-typert-protocol'
import type {} from '../typert.remote-client.js'
import { PromptOptimizer } from './PromptOptimizer.tsx'
import { en, NS, zh } from './locales.ts'

/**
 * Register the composer toolbar entry and its dictionaries.
 *
 * The seat is the additive `conversation.input.right` list, not the single
 * `conversation.input.activity` cell: that cell hosts one occupant and the
 * shipped voice-input plugin already claims it, so a second same-priority
 * registration would conflict.
 *
 * The Host namespace is resolved through `ctx.get()` on every call: a disabled
 * or failed Host half then reports a clear failure on click instead of leaving
 * this entry PENDING (which surfaces as a boot failure).
 * @param ctx - browser plugin context.
 */
export function mountPromptOptimizer(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }))
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'prompt-optimizer',
    order: 20,
    locale: NS,
    inject: () => ({
      optimize: async (request: import('../types.ts').OptimizeRequest) => {
        const namespace = ctx.get('remote.promptOptimizer')
        if (namespace === undefined) {
          throw new Error('提示词优化服务未就绪（Host 半边未加载），请重启应用')
        }
        return await namespace.optimize(request)
      },
    }),
  }, PromptOptimizer))
}
