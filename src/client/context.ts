/** Read the recent conversation turns for context-aware optimization. */
import type { ConversationNode, UserMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client'

/**
 * Extract readable text from one user message's content blocks.
 * @param node - finalized user message node.
 * @returns joined plain text, or an empty string for non-text content.
 */
function userTextOf(node: UserMessageNode): string {
  const parts: string[] = []
  for (const block of node.content) {
    if (block.type === 'text') parts.push(block.text)
  }
  return parts.join('\n').trim()
}

/**
 * Build the context list: the most recent distinct user turns in conversation
 * order. Reference chips render as `@path` text inside content blocks, so the
 * conversation's file references survive into the optimizer context.
 * @param nodes - ordered conversation nodes from the chat snapshot.
 * @param limit - maximum turns returned.
 * @returns user turn texts, oldest first, ending at the latest turn.
 */
export function contextTurns(nodes: readonly ConversationNode[], limit = 6): string[] {
  const turns: string[] = []
  for (const node of nodes) {
    if (node.kind !== 'user') continue
    const text = userTextOf(node)
    if (text.length === 0) continue
    if (turns[turns.length - 1] === text) continue
    turns.push(text)
  }
  return turns.slice(-limit)
}

