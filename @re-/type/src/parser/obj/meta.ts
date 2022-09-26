import { keySet } from "@re-/tools"
import type { Base } from "../../nodes/base.js"
import type { IntersectionAst } from "../../nodes/branches/intersection.js"
import type { UnionAst } from "../../nodes/branches/union.js"
import type { ArrayAst } from "../../nodes/unaries/array.js"
import type { OptionalAst } from "../../nodes/unaries/optional.js"
import { type } from "../../type.js"
import type { parseFn, ParserContext } from "../common.js"
import type { Root } from "../root.js"

export const metaTokens = keySet({
    ";": 1,
    "=>": 1,
    "[]": 1,
    "?": 1,
    "|": 1,
    "&": 1
})

export type MetaToken = keyof typeof metaTokens

export type MetaDefinition<
    Child = unknown,
    Token extends MetaToken = MetaToken,
    Args extends unknown[] = unknown[]
> = [Child, Token, ...Args]

export const isMetaDefinition = (def: unknown[]): def is MetaDefinition =>
    (def[1] as any) in metaTokens

export const parseMetaDefinition: parseFn<MetaDefinition> = (
    [definition, token, ...args],
    context
) => (token === ";" ? ({} as Base.node) : ({} as Base.node))

export type ValidateMetaDefinition<
    Child,
    Token extends MetaToken,
    Args extends unknown[],
    Ctx extends ParserContext
> = Token extends "|" | "&" | "=>"
    ? Args extends [infer Head, ...infer Tail]
        ? [Root.Validate<Child, Ctx>, Token, Root.Validate<Head, Ctx>, ...Tail]
        : [
              Root.Validate<Child, Ctx>,
              `Meta token '${Token}' requires a right-hand definition.`
          ]
    : [Root.Validate<Child, Ctx>, Token, ...Args]

export type ParseMetaDefinition<
    Child,
    Token extends MetaToken,
    Args extends unknown[],
    Ctx extends ParserContext
> = Token extends ";"
    ? Root.Parse<Child, Ctx>
    : Token extends "?"
    ? OptionalAst<Root.Parse<Child, Ctx>>
    : Token extends "[]"
    ? ArrayAst<Root.Parse<Child, Ctx>>
    : Token extends "|"
    ? UnionAst<Root.Parse<Child, Ctx>, Root.Parse<Args[0], Ctx>>
    : Token extends "&"
    ? IntersectionAst<Root.Parse<Child, Ctx>, Root.Parse<Args[0], Ctx>>
    : {}
