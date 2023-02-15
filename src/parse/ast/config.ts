import type { TypeOptions } from "../../scopes/type.ts"
import type { inferred, validateDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export type ConfigTuple<
    def = unknown,
    config extends TypeOptions = TypeOptions
> = readonly [def, ":", config]

export const parseConfigTuple: PostfixParser<":"> = (def, ctx) => {
    const opts = def[2] as TypeOptions
    if (!opts.name && ctx.path.length) {
        opts.name = `${ctx.path}`
    }
    const anonymousType = ctx.type.scope.type(def[0] as inferred<unknown>, opts)
    return ctx.type.scope.addAnonymousReference(anonymousType, ctx)
}

export type validateConfigTuple<def extends TupleExpression, $> = readonly [
    _: validateDefinition<def[0], $>,
    _: ":",
    _: TypeOptions
]
