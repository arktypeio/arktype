import type { TypeConfig, TypeOptions } from "../../scopes/type.ts"
import type { validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export type ConfigTuple<
    def = unknown,
    config extends TypeOptions = TypeOptions
> = readonly [def, ":", config]

/**
 * @operator {@link parseConfigTuple | :}
 * @docgenTable
 * @tuple ["type", ":", config]
 */
export const parseConfigTuple: PostfixParser<":"> = (def, ctx) => ({
    node: ctx.type.scope.resolveTypeNode(parseDefinition(def[0], ctx)),
    config: def[2] as TypeConfig
})

export type validateConfigTuple<def extends TupleExpression, $> = readonly [
    _: validateDefinition<def[0], $>,
    _: ":",
    _: TypeOptions
]
