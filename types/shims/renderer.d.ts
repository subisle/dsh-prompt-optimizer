/** Standalone typecheck shim: the renderer merge (ctx.slots) the composed program provides. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/dsh-client-ui-renderer/client' {
  export {}
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Slot registry service (ui-renderer's runtime face). */
    slots: {
      register(options: object, component: unknown): unknown
      inject(key: string, factory: () => unknown): unknown
    }
  }
}
