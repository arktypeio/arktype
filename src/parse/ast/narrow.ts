import type { TypeNode } from "../../nodes/node.js"
import { isConfigNode, rootIntersection } from "../../nodes/node.js"
import type { asIn } from "../../scopes/type.js"
import type { Problems } from "../../traverse/problems.js"
import type { Domain, inferDomain } from "../../utils/domains.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { distributable } from "./distributableFunction.js"
import { distributeFunctionToNode } from "./distributableFunction.js"
import type { PostfixParser, TupleExpression } from "./tuple.js"

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
        ? { config: resolution.config, node: result as TypeNode }
        : result
}

export type Narrow<data = any> = (data: data, problems: Problems) => boolean

export type NarrowPredicate<data = any, narrowed extends data = data> = (
    data: data,
    problems: Problems
) => data is narrowed

export type validateNarrowTuple<def extends TupleExpression, $> = readonly [
    _: validateDefinition<def[0], $>,
    _: "=>",
    _: distributable<Narrow<asIn<inferDefinition<def[0], $>>>>
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
