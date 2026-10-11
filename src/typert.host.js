/* Hand-written Typert host-face manifest for dsh-prompt-optimizer.
 * Mirrors the generated `lib/typert.host.js` shape the Loader auto-registers. */
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

export const TYPERT = {
  package: 'dsh-prompt-optimizer',
  face: 'host',
  schemas: [
  ],
  invocations: [
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
  model: {
    services: [
      {
        description: 'Prompt Optimizer Remote controller: auxiliary one-shot LLM optimization of composer drafts.',
        summary: 'Auxiliary one-shot prompt optimization over the current session route.',
        tags: [],
        jsDoc: '/**\n * Optimization is an auxiliary one-shot LLM call: it never activates or submits to an Agent, never enters a Session log, and reuses the Session own provider/model route.\n */',
        key: 'promptOptimizerController',
        exportName: 'PromptOptimizerController',
        members: [
          {
            kind: 'method',
            name: 'optimize',
            signature: 'optimize(request: OptimizeRequest, signal: AbortSignal): Promise<OptimizeResult>',
            summary: 'Optimize one draft with session context awareness.',
            jsDoc: '/**\n * Optimize one draft with session context awareness.\n */',
          },
        ],
        types: [],
      },
    ],
    events: [
    ],
    objects: [
    ],
  },
  events: [
  ],
  objects: [
  ],
}
