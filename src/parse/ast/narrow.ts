import type { DomainsNode } from "../../nodes/node.ts"
import { isConfigNode, rootIntersection } from "../../nodes/node.ts"
import type { asIn } from "../../scopes/type.ts"
import type { TraversalState } from "../../traverse/traverse.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { distributable } from "./distributableFunction.ts"
import { distributeFunctionToNode } from "./distributableFunction.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export const parseNarrowTuple: PostfixParser<"=>"> = (def, ctx) => {
    const inputNode = parseDefinition(def[0], ctx)
    const resolution = ctx.type.scope.resolveNode(inputNode)
    const hasConfig = isConfigNode(resolution)
    const typeNode = hasConfig ? resolution.node : resolution
    const result = rootIntersection(
        inputNode,
        distributeFunctionToNode(
            def[2] as distributable<Narrow>,
            typeNode,
            ctx,
            "narrow"
        ),
        ctx.type
    )
    return hasConfig
        ? { config: resolution.config, node: result as DomainsNode }
        : result
}

export type Narrow<data = any> = (data: data, state: TraversalState) => boolean

export type NarrowPredicate<data = any, narrowed extends data = data> = (
    data: data,
    state: TraversalState
) => data is narrowed

export type validateNarrowTuple<def extends TupleExpression, $> = readonly [
    validateDefinition<def[0], $>,
    "=>",
    distributable<Narrow<asIn<inferDefinition<def[0], $>>>>
]

export type inferNarrow<inDef, narrow, $> = narrow extends {
    [domain in Domain]?: any
}
    ? {
          [domain in keyof narrow]: inferNarrowFunction<
              Extract<
                  asIn<inferDefinition<inDef, $>>,
                  inferDomain<domain & Domain>
              >,
              narrow[domain]
          >
      }[keyof narrow]
    : inferNarrowFunction<asIn<inferDefinition<inDef, $>>, narrow>

type inferNarrowFunction<input, narrow> = narrow extends (
    data: any,
    ...args: any[]
) => data is infer narrowed
    ? narrowed
    : input
