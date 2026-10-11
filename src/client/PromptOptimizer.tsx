/** The composer toolbar wand: optimize the current draft with one click. */
import './standard-props.ts'
import { useEffect, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InputState } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { OptimizeOutcome } from '../types.ts'
import { Button, IconSparkleRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './PromptOptimizer.module.css'
import { NS } from './locales.ts'
import { contextTurns } from './context.ts'

/** Entry-injected Host operations. */
export interface PromptOptimizerInjected {
  /** Run one Host-side optimization; resolves the outcome envelope. */
  optimize: (request: { draft: string; context: readonly string[]; sessionId: string }) => Promise<OptimizeOutcome>
}

/**
 * Full props of the `conversation.input.right` seat occupant: the slot's owner
 * share (none), the session standard kit, the locale seat, and this entry's
 * inject face.
 */
export type PromptOptimizerProps =
  PropsRuntime<'conversation.input.right'>
  & PropsLocale<typeof NS>
  & InjectFace<PromptOptimizerInjected>

type Phase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'working' }
  | { readonly kind: 'conflict'; readonly prompt: string }
  | { readonly kind: 'feedback'; readonly message: string }

/**
 * Render a compact wand button, or a status row while working, in the composer
 * tool row. The optimized draft replaces the composer draft on success; a
 * draft changed during the request is never overwritten silently.
 */
export function PromptOptimizer(props: PromptOptimizerProps) {
  const { sessionId, inputActions, optimize, t, useInput, useChat } = props
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const input = useInput((value: InputState | undefined) => value)
  const chat = useChat((value: ChatSnapshot | undefined) => value)
  // Click-time snapshots live in refs: event handlers read the latest values
  // without re-render timing hazards.
  const inputRef = useRef(input)
  const chatRef = useRef(chat)
  inputRef.current = input
  chatRef.current = chat
  const run = useRef(0)
  useEffect(() => {
    run.current += 1
    setPhase({ kind: 'idle' })
  }, [sessionId])
  useEffect(() => {
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && phase.kind !== 'idle') {
        event.preventDefault()
        run.current += 1
        setPhase({ kind: 'idle' })
      }
    }
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('keydown', escape) }
  }, [phase.kind])

  /** Read the current draft, call the Host optimizer, and stage the result. */
  async function runOptimize(): Promise<void> {
    const state = inputRef.current
    if (state === undefined || state.phase !== 'plain' || state.draft.trim().length === 0) return
    const draft = state.draft
    const generation = ++run.current
    setPhase({ kind: 'working' })
    let outcome: OptimizeOutcome
    try {
      outcome = await optimize({
        draft,
        context: contextTurns(chatRef.current?.legacy.nodes ?? []),
        sessionId,
      })
    } catch (error) {
      if (generation !== run.current) return
      setPhase({ kind: 'feedback', message: error instanceof Error ? error.message : String(error) })
      return
    }
    if (generation !== run.current) return
    if (!outcome.ok) {
      setPhase({ kind: 'feedback', message: t('failed', { message: outcome.error.message }) })
      return
    }
    const latest = inputRef.current
    if (latest === undefined || latest.draft !== draft || latest.phase !== 'plain') {
      setPhase({ kind: 'conflict', prompt: outcome.value.prompt })
      return
    }
    applyDraft(outcome.value.prompt)
  }

  /** Replace the whole draft with the optimized prompt and collapse the row. */
  function applyDraft(prompt: string): void {
    inputActions.setDraft(prompt)
    setPhase({ kind: 'idle' })
  }

  // Idle and working share one control: while the Host works, the button stays
  // exactly where it is, disabled, with no spinner, no extra icon, and no copy.
  if (phase.kind === 'idle' || phase.kind === 'working') {
    const working = phase.kind === 'working'
    const draftEmpty = input === undefined || input.draft.trim().length === 0
    const busy = input !== undefined && input.phase !== 'plain'
    return (
      <Tooltip label={working ? t('working') : t('optimize')} side="top" portal>
        <Button type="button" size="sm" disabled={working || draftEmpty || busy}
          className={working ? css.busy : undefined}
          aria-label={working ? t('working') : t('optimize')}
          aria-busy={working}
          data-prompt-optimizer={working ? 'working' : 'idle'}
          onMouseDown={event => { event.preventDefault() }}
          onClick={() => { void runOptimize() }}>
          <IconSparkleRegular size={16} />
        </Button>
      </Tooltip>
    )
  }

  if (phase.kind === 'conflict') {
    return (
      <div className={css.row} data-prompt-optimizer="conflict">
        <span className={css.message} role="status">{t('conflict')}</span>
        <Button type="button" size="sm" onClick={() => { applyDraft(phase.prompt) }}>{t('apply')}</Button>
        <Button type="button" size="sm" aria-label={t('discard')}
          onClick={() => { setPhase({ kind: 'idle' }) }}>
          ✕
        </Button>
      </div>
    )
  }

  return (
    <div className={css.row} data-prompt-optimizer="feedback">
      <span className={css.message} role="status" title={phase.message}>{phase.message}</span>
      <Button type="button" size="sm" onClick={() => { void runOptimize() }}>{t('retry')}</Button>
      <Button type="button" size="sm" aria-label={t('discard')}
        onClick={() => { setPhase({ kind: 'idle' }) }}>
        ✕
      </Button>
    </div>
  )
}
