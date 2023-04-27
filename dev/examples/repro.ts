import type { evaluate, isAny, nominal } from "../../src/utils/generics.js"

declare const scope: ScopeParser

const result = scope({
    a: {
        b: "b"
    },
    b: {
        a: "a|3"
    }
})

type Z = typeof result.b
//   ^?

type parseString<def extends string, $> = def extends `${infer l}|${infer r}`
    ? [parseString<l, $>, "|", parseString<r, $>]
    : def extends keyof $
    ? def
    : def extends `${number}`
    ? def
    : "Invalid definition"

type inferAst<ast, $> = ast extends [infer l, "|", infer r]
    ? inferAst<l, $> | inferAst<r, $>
    : ast extends keyof $
    ? resolve<ast, $>
    : ast extends `${infer value extends number}`
    ? value
    : never

type inferString<def extends string, $> = inferAst<parseString<def, $>, $>

export type inferDefinition<def, $> = def extends string
    ? inferString<def, $>
    : { [k in keyof def]: inferDefinition<def[k], $> }

export type resolve<name extends keyof $, $> = isAny<$[name]> extends true
    ? any
    : $[name] extends alias<infer def>
    ? inferDefinition<def, $>
    : $[name]

type parseScope<aliases> = evaluate<{
    [k in keyof aliases]: inferDefinition<aliases[k], bootstrapScope<aliases>>
}>

export type alias<def = {}> = nominal<def, "alias">

type bootstrapScope<aliases> = {
    [k in keyof aliases]: alias<aliases[k]>
}

type ScopeParser = <const aliases>(aliases: aliases) => parseScope<aliases>
