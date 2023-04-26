import { validateAst } from "../../src/parse/ast/ast.js"
import { inferTuple } from "../../src/parse/ast/tuple.js"
import type { Infer } from "../../src/parse/definition.js"
import { inferRecord } from "../../src/parse/record.js"
import { inferString, parseString } from "../../src/parse/string/string.js"
import type {
    Dict,
    List,
    error,
    evaluate,
    isAny,
    isUnknown,
    nominal,
    stringKeyOf
} from "../../src/utils/generics.js"

export type inferDefinition<def, $> = def extends string
    ? inferString<def, $>
    : { [k in keyof def]: inferDefinition<def[k], $> }

export type validateString<
    def extends string,
    $
> = def extends `${infer l}|${infer r}` ? {} : {}

//     parseString<
//     def,
//     $
// > extends infer ast
//     ? ast extends error<infer message>
//         ? message
//         : validateAst<ast, $> extends error<infer message>
//         ? message
//         : def
//     : never

// we ignore functions in validation so that cyclic thunk definitions can be inferred in scopes
export type validateDefinition<def, $> = def extends (...args: any[]) => any
    ? def
    : def extends string
    ? validateString<def, $>
    : isUnknown<def> extends true
    ? stringKeyOf<$>
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], $>
      }>

type parseScope<aliases> = {
    [k in keyof aliases]: inferDefinition<aliases[k], bootstrapScope<aliases>>
}

export type resolve<name extends keyof $, $> = isAny<$[name]> extends true
    ? any
    : $[name] extends alias<infer def>
    ? inferDefinition<def, $>
    : $[name]

export type alias<def = {}> = nominal<def, "alias">

type bootstrapScope<aliases> = {
    [k in keyof aliases]: alias<aliases[k]>
}

type ScopeParser = <aliases>(
    aliases: validateAliases<aliases>
) => parseScope<aliases>

type validateAliases<aliases> = evaluate<{
    [name in keyof aliases]: validateDefinition<
        aliases[name],
        bootstrapScope<aliases>
    >
}>

declare const scope: ScopeParser

const result = scope({
    a: {
        b: "b"
    },
    b: {
        a: "a|1"
    }
})
