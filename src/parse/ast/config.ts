import type { TypeOptions } from "../../scopes/type.ts"
import type { validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export type ConfigTuple<
    def = unknown,
    config extends TypeOptions = TypeOptions
> = readonly [def, ":", config]

export const parseConfigTuple: PostfixParser<":"> = (def, ctx) => {
    const inputNode = parseDefinition(def[0], ctx)
    return inputNode
}

export type validateConfigTuple<def extends TupleExpression, $> = readonly [
    _: validateDefinition<def[0], $>,
    _: ":",
    _: TypeOptions
]
