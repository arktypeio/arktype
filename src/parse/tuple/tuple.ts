import { functorKeywords } from "../../nodes/keywords.ts"
import type { TypeNode } from "../../nodes/node.ts"
import { intersection, union } from "../../nodes/node.ts"
import type { ScopeRoot } from "../../scope.ts"
import type { asIn, asOut } from "../../type.ts"
import { domainOf } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { classOf, error, List, returnOf } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { inferIntersection, inferUnion } from "../string/ast.ts"
import { buildMissingRightOperandMessage } from "../string/shift/operand/unenclosed.ts"
import type { Scanner } from "../string/shift/scanner.ts"
import type { Out, validateMorphTuple } from "./morph.ts"
import { parseMorphTuple } from "./morph.ts"
import type { validateNarrowTuple } from "./narrow.ts"
import { parseNarrowTuple } from "./narrow.ts"

export const parseTuple = (def: List, $: ScopeRoot): TypeNode => {
    if (isPostfixExpression(def)) {
        return postfixParsers[def[1]](def as never, $)
    }
    if (isPrefixExpression(def)) {
        return prefixParsers[def[0]](def as never, $)
    }
    const props: Record<number, TypeNode> = {}
    for (let i = 0; i < def.length; i++) {
        props[i] = parseDefinition(def[i], $)
    }
    return {
        object: {
            subdomain: ["Array", "unknown", def.length],
            props
        }
    }
}

export type validateTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends "=>"
    ? validateMorphTuple<def, $>
    : def[1] extends ":"
    ? validateNarrowTuple<def, $>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? [def[0], error<buildMissingRightOperandMessage<def[1], "">>]
        : [validateDefinition<def[0], $>, def[1], validateDefinition<def[2], $>]
    : def[1] extends "[]"
    ? [validateDefinition<def[0], $>, "[]"]
    : def[0] extends "==="
    ? ["===", def[1]]
    : def[0] extends "instanceof"
    ? [
          "instanceof",
          def[1] extends classOf<unknown>
              ? def[1]
              : "Expected a constructor following instanceof"
      ]
    : never

export type inferTuple<def extends List, $> = def extends TupleExpression
    ? inferTupleExpression<def, $>
    : {
          [i in keyof def]: inferDefinition<def[i], $>
      }

type inferTupleExpression<def extends TupleExpression, $> = def[1] extends ":"
    ? [unknown, 3] extends [def[2], keyof def]
        ? inferDefinition<def[3], $>
        : def[2] extends (data: any) => data is infer narrowed
        ? narrowed
        : inferDefinition<def[0], $>
    : def[1] extends "=>"
    ? (
          In: asIn<inferDefinition<def[0], $>>
      ) => Out<
          [unknown, 3] extends [def[2], keyof def]
              ? asOut<inferDefinition<def[3], $>>
              : returnOf<def[2]>
      >
    : def[1] extends "&"
    ? inferIntersection<inferDefinition<def[0], $>, inferDefinition<def[2], $>>
    : def[1] extends "|"
    ? inferUnion<inferDefinition<def[0], $>, inferDefinition<def[2], $>>
    : def[1] extends "[]"
    ? inferDefinition<def[0], $>[]
    : def[0] extends "==="
    ? def[1]
    : def[0] extends "instanceof"
    ? def[1] extends classOf<infer t>
        ? t
        : never
    : never

const parseBranchTuple: PostfixParser<"|" | "&"> = (def, $) => {
    if (def[2] === undefined) {
        return throwParseError(buildMissingRightOperandMessage(def[1], ""))
    }
    const l = parseDefinition(def[0], $)
    const r = parseDefinition(def[2], $)
    return def[1] === "&" ? intersection(l, r, $) : union(l, r, $)
}

const parseArrayTuple: PostfixParser<"[]"> = (def, scope) =>
    functorKeywords.Array(parseDefinition(def[0], scope))

export type PostfixParser<token extends PostfixToken> = (
    def: PostfixExpression<token>,
    $: ScopeRoot
) => TypeNode

export type PrefixParser<token extends PrefixToken> = (
    def: PrefixExpression<token>,
    $: ScopeRoot
) => TypeNode

export type TupleExpression = PrefixExpression | PostfixExpression

export const buildMalformedFunctionalExpressionMessage = (
    operator: "=>" | ":",
    rightDef: unknown
) =>
    `Expression requires a function following '${operator}' (got ${typeof rightDef})`

export type TupleExpressionToken = PrefixToken | PostfixToken

// TODO: === (exact value)
// TODO: = (Default value)
// TODO: Pipe
// TODO: Merge
type PostfixToken = "[]" | "&" | "|" | ":" | "=>"

type PostfixExpression<token extends PostfixToken = PostfixToken> = [
    unknown,
    token,
    ...unknown[]
]

const isPostfixExpression = (def: List): def is PostfixExpression =>
    postfixParsers[def[1] as PostfixToken] !== undefined

const postfixParsers: {
    [token in PostfixToken]: PostfixParser<token>
} = {
    "|": parseBranchTuple,
    "&": parseBranchTuple,
    "[]": parseArrayTuple,
    ":": parseNarrowTuple,
    "=>": parseMorphTuple
}

type PrefixToken = "instanceof" | "==="

type PrefixExpression<token extends PrefixToken = PrefixToken> = [
    token,
    ...unknown[]
]

const prefixParsers: {
    [token in PrefixToken]: PrefixParser<token>
} = {
    instanceof: (def) => {
        if (typeof def[1] !== "function") {
            return throwParseError(
                `Expected a constructor following 'instanceof' operator (got ${typeof def[1]}).`
            )
        }
        return { object: { instanceof: def[1] as classOf<unknown> } }
    },
    "===": (def) => ({ [domainOf(def[1])]: { value: def[1] } })
}

const isPrefixExpression = (def: List): def is PrefixExpression =>
    prefixParsers[def[0] as PrefixToken] !== undefined
