/** Standalone typecheck shim: the self remote face resolves to lib output when installed. */
declare module '@deepseek-ai/dsh-prompt-optimizer/remote' {
  import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
  export declare const TYPERT_REMOTE: TypertRemoteContribution
  export default TYPERT_REMOTE
}
