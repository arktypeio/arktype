import type { TypeOptions } from "../../scopes/type.ts"
import type { inferred, validateDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export type ConfigTuple<
    def = unknown,
    config extends TypeOptions = TypeOptions
> = readonly [def, ":", config]

export const parseConfigTuple: PostfixParser<":"> = (def, ctx) => {
    const anonymousType = ctx.type.scope.type(def[0] as inferred<unknown>, {
        name: ctx.type.scope.getAnonymousTypeName(),
        ...(def[2] as TypeOptions)
    })
    return anonymousType.name
}

export type validateConfigTuple<def extends TupleExpression, $> = readonly [
    _: validateDefinition<def[0], $>,
    _: ":",
    _: TypeOptions
]
