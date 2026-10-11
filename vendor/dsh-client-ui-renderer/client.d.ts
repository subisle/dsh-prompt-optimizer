/** Local typecheck stub for the renderer client face. */
export {}
declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Slot registry service (ui-renderer's runtime face). */
    slots: {
      register(options: object, component: unknown): unknown
      inject(key: string, factory: () => unknown): unknown
    }
  }
}
