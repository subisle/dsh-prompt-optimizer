/* Hand-written client-face declaration for the promptOptimizer Remote namespace. */
import type {
  RemoteResult,
  TypertRemoteContribution,
} from '@deepseek-ai/dsh-typert-protocol'
import type { OptimizeRequest, OptimizeResult } from './host-controller.ts'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespace$promptOptimizer {
    optimize: (request: OptimizeRequest, signal?: AbortSignal) => Promise<RemoteResult<OptimizeResult>>
  }
  interface TypertRemoteMap {
    'promptOptimizer/optimize': (request: OptimizeRequest, signal?: AbortSignal) => Promise<RemoteResult<OptimizeResult>>
  }
  interface TypertRemoteNamespaceMap {
    promptOptimizer: TypertRemoteNamespace$promptOptimizer
  }
}

export declare const TYPERT_REMOTE: TypertRemoteContribution
export default TYPERT_REMOTE
