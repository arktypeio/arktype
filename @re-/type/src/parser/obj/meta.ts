import { keySet } from "@re-/tools"
import type { Base } from "../../nodes/base.js"
import type { IntersectionAst } from "../../nodes/branches/intersection.js"
import type { UnionAst } from "../../nodes/branches/union.js"
import type { ArrayAst } from "../../nodes/unaries/array.js"
import type { OptionalAst } from "../../nodes/unaries/optional.js"
import { type, TypeOptions } from "../../type.js"
import type { parseFn } from "../common.js"
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

const f = type(["string", "|", {}])

export type ValidateMetaDefinition<
    Child,
    Token extends MetaToken,
    Args extends unknown[],
    Dict
> = Token extends "|" | "&" | "=>"
    ? Args extends [infer Head, ...infer Tail]
        ? [
              Root.Validate<Child, Dict>,
              Token,
              Root.Validate<Head, Dict>,
              ...Tail
          ]
        : [
              Root.Validate<Child, Dict>,
              `Meta token '${Token}' requires a right-hand definition.`
          ]
    : [Root.Validate<Child, Dict>, Token, ...Args]

export type ParseMetaDefinition<
    Child,
    Token extends MetaToken,
    Args extends unknown[],
    Dict
> = Token extends ";"
    ? Root.Parse<Child, Dict>
    : Token extends "?"
    ? OptionalAst<Root.Parse<Child, Dict>>
    : Token extends "[]"
    ? ArrayAst<Root.Parse<Child, Dict>>
    : Token extends "|"
    ? UnionAst<Root.Parse<Child, Dict>, Root.Parse<Args[0], Dict>>
    : Token extends "&"
    ? IntersectionAst<Root.Parse<Child, Dict>, Root.Parse<Args[0], Dict>>
    : {}
