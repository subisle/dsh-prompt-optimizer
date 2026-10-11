/* Hand-written Typert client-face contribution for dsh-prompt-optimizer.
 * Mirrors the generated `lib/typert.remote-client.js` shape; the client bundle
 * requests this file through the module table (`dsh.client.external`). */
import { z } from 'zod'

let _optimize_request$schema$value
const _optimize_request$schema = () => (_optimize_request$schema$value ??= z.object({
  draft: z.string(),
  context: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
}))

let _optimize_result$schema$value
const _optimize_result$schema = () => (_optimize_result$schema$value ??= z.object({
  prompt: z.string(),
  provider: z.string(),
  model: z.string(),
}))

export const TYPERT_REMOTE = {
  package: 'dsh-prompt-optimizer',
  descriptors: [
    {
      id: 'dsh-prompt-optimizer#promptOptimizer/optimize',
      service: 'promptOptimizerController',
      namespace: 'promptOptimizer',
      method: 'optimize',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: 'dsh-prompt-optimizer#promptOptimizer/optimize:request',
            create: _optimize_request$schema,
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-prompt-optimizer#promptOptimizer/optimize:result',
        create: _optimize_result$schema,
      },
      cancellation: { parameter: 'signal' },
    },
  ],
}

export default TYPERT_REMOTE
