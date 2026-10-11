/** Locale-owned copy for the Prompt Optimizer composer activity. */
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'

/** Dictionary namespace for every optimizer control. */
export const NS = 'promptOptimizer'

/** Chinese dictionary and key source. */
export const zh = {
  optimize: '优化提示词',
  working: '正在优化提示词…',
  conflict: '草稿已变化，无法自动替换，可采用或重试。',
  failed: '优化失败：{message}',
  apply: '采用',
  discard: '放弃',
  retry: '重试',
} satisfies Record<string, string>

/** The promptOptimizer namespace key union. */
export type PromptOptimizerKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  optimize: 'Optimize prompt',
  working: 'Optimizing prompt…',
  conflict: 'Draft changed; apply manually or retry.',
  failed: 'Optimization failed: {message}',
  apply: 'Apply',
  discard: 'Discard',
  retry: 'Retry',
} satisfies Record<PromptOptimizerKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Prompt Optimizer composer copy. */
    promptOptimizer: PromptOptimizerKey
  }
}
