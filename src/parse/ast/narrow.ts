import { rootIntersection } from "../../nodes/node.ts"
import type { asIn } from "../../scopes/type.ts"
import type { Problems } from "../../traverse/problems.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { distributable } from "./distributableFunction.ts"
import { distributeFunctionToNode } from "./distributableFunction.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export const parseNarrowTuple: PostfixParser<"=>"> = (def, ctx) => {
    const inputNode = parseDefinition(def[0], ctx)
    return rootIntersection(
        inputNode,
        distributeFunctionToNode(
            def[2] as distributable<Narrow>,
            inputNode,
            ctx,
            "narrow"
        ),
        ctx.type
    )
}

export type Narrow<data = any> = (data: data, problems: Problems) => boolean

export type NarrowCast<data = any, to extends data = data> = (
    data: data,
    problems: Problems
) => data is to

export type validateNarrowTuple<def extends TupleExpression, $> = readonly [
    _: validateDefinition<def[0], $>,
    _: "=>",
    _: distributable<Narrow<asIn<inferDefinition<def[0], $>>>>
]

export type inferNarrow<inDef, narrow, $> = narrow extends Narrow
    ? inferNarrowFunction<inferDefinition<inDef, $>, narrow>
    : narrow extends { [domain in Domain]?: Narrow }
    ? {
          [domain in keyof narrow & Domain]: inferNarrowFunction<
              Extract<inferDefinition<inDef, $>, inferDomain<domain>>,
              narrow[domain]
          >
      }[keyof narrow & Domain]
    : never

type inferNarrowFunction<input, narrow> = narrow extends NarrowCast<
    input,
    infer to
>
    ? to
    : narrow extends Narrow<input>
    ? input
    : never
