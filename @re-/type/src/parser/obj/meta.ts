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

export type ValidateMetaDefinition<
    Child,
    Token extends MetaToken,
    Args extends unknown[],
    Space
> = Token extends "|" | "&" | "=>"
    ? Args extends [infer Head, ...infer Tail]
        ? [
              Root.Validate<Child, Space>,
              Token,
              Root.Validate<Head, Space>,
              ...Tail
          ]
        : [
              Root.Validate<Child, Space>,
              `Meta token '${Token}' requires a right-hand definition.`
          ]
    : [Root.Validate<Child, Space>, Token, ...Args]

export type ParseMetaDefinition<
    Child,
    Token extends MetaToken,
    Args extends unknown[],
    Space
> = Token extends ";"
    ? Root.Parse<Child, Space>
    : Token extends "?"
    ? OptionalAst<Root.Parse<Child, Space>>
    : Token extends "[]"
    ? ArrayAst<Root.Parse<Child, Space>>
    : Token extends "|"
    ? UnionAst<Root.Parse<Child, Space>, Root.Parse<Args[0], Space>>
    : Token extends "&"
    ? IntersectionAst<Root.Parse<Child, Space>, Root.Parse<Args[0], Space>>
    : {}
