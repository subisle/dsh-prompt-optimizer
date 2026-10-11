/** Standard session props merged by ui-session, ui-conversation, and ui-chat in
 * the composed Client program. Declared locally so this standalone bundle's
 * program sees the same seat the renderer provides at runtime
 * (`conversation.input.activity` scope: session). */
import type { InputState } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { InputActions } from '@deepseek-ai/dsh-client-ui-conversation/client'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SessionStandardProps {
    /** Current Session identity. */
    sessionId: import('@deepseek-ai/dsh-session/types').SessionId
    /** Selector hook over the Session input machine (absent before binding). */
    useInput: <S>(selector: (value: InputState | undefined) => S) => S
    /** Selector hook over the registered Chat target snapshot. */
    useChat: <S>(selector: (value: ChatSnapshot | undefined) => S) => S
    /** Stable public input actions for this Session. */
    inputActions: InputActions
    /** Current Session lifecycle and control state. */
    useSession: <S>(selector: (value: SessionSnapshot) => S) => S
  }
}
