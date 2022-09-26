import type { Get } from "@re-/tools"
import { keySet } from "@re-/tools"
import type { Base } from "../../nodes/base.js"
import { type } from "../../type.js"
import type { ParseError, parseFn, ParserContext } from "../common.js"
import type { Root } from "../root.js"

// TODO: Find a better way to organize tokens.
export const metaTokens = keySet({
    ";": 1,
    "=>": 1,
    "[]": 1,
    "?": 1,
    "|": 1,
    "&": 1
})

export type UnaryToken = "?" | "[]" | TypelessToken

export type BinaryToken = "|" | "&" | "=>"

export type TypelessToken = ":"

export type MetaToken = keyof typeof metaTokens

// export type MetaDefinition<
//     Child = unknown,
//     Token extends MetaToken = MetaToken,
//     Args extends unknown[] = unknown[]
// > = [Child, Token, ...Args]

export type MetaDefinition = [unknown, MetaToken, ...unknown[]]

export const isMetaDefinition = (def: unknown[]): def is MetaDefinition =>
    (def[1] as any) in metaTokens

export const parseMetaDefinition: parseFn<MetaDefinition> = (
    [definition, token, ...args],
    context
) => (token === ";" ? ({} as Base.node) : ({} as Base.node))

const z = type([{ a: "string" }, "&", { b: "number" }]).ast

export type ParseMetaDefinition<
    Def extends MetaDefinition,
    Ctx extends ParserContext
> = Def[1] extends BinaryToken
    ? Def[2] extends undefined
        ? [
              Root.Parse<Def[0], Ctx>,
              ParseError<`Meta token '${Def[1]}' requires a right-hand definition.`>
          ]
        : [Root.Parse<Def[0], Ctx>, Def[1], Root.Parse<Def[2], Ctx>]
    : [Root.Parse<Def[0], Ctx>, Def[1]]
