import type { inferNode } from "../../nodes/infer.ts"
import type { ResolvedNode, TypeNode } from "../../nodes/node.ts"
import { arrayOf, intersection, union } from "../../nodes/node.ts"
import type { Prop } from "../../nodes/rules/props.ts"
import type { asIn, asOut } from "../../scopes/type.ts"
import { domainOf } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type {
    conform,
    constructor,
    error,
    List,
    returnOf
} from "../../utils/generics.ts"
import type {
    inferDefinition,
    ParseContext,
    validateDefinition
} from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { inferIntersection, inferUnion } from "../string/ast.ts"
import { writeMissingRightOperandMessage } from "../string/shift/operand/unenclosed.ts"
import type { Scanner } from "../string/shift/scanner.ts"
import type { inferKeyOfExpression, validateKeyOfExpression } from "./keyof.ts"
import { parseKeyOfTuple } from "./keyof.ts"
import type { Out, validateMorphTuple } from "./morph.ts"
import { parseMorphTuple } from "./morph.ts"
import type { validateNarrowTuple } from "./narrow.ts"
import { parseNarrowTuple } from "./narrow.ts"

export const parseTuple = (def: List, ctx: ParseContext): TypeNode => {
    if (isPostfixExpression(def)) {
        return postfixParsers[def[1]](def as never, ctx)
    }
    if (isPrefixExpression(def)) {
        return prefixParsers[def[0]](def as never, ctx)
    }
    const props: Record<number | "length", Prop> = {
        //  length is created as a prerequisite prop, ensuring if it is invalid,
        //  no other props will be checked, which is usually desirable for tuple
        //  definitions.
        length: ["!", { number: { value: def.length } }]
    }
    for (let i = 0; i < def.length; i++) {
        ctx.path.push(`${i}`)
        props[i] = parseDefinition(def[i], ctx)
        ctx.path.pop()
    }
    return {
        object: {
            class: "Array",
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
        ? [def[0], error<writeMissingRightOperandMessage<def[1], "">>]
        : conform<
              def,
              readonly [
                  validateDefinition<def[0], $>,
                  def[1],
                  validateDefinition<def[2], $>
              ]
          >
    : def[1] extends "[]"
    ? conform<def, readonly [validateDefinition<def[0], $>, "[]"]>
    : def[0] extends "==="
    ? conform<def, readonly ["===", unknown]>
    : def[0] extends "instanceof"
    ? conform<def, readonly ["instanceof", constructor]>
    : def[0] extends "node"
    ? conform<def, readonly ["node", ResolvedNode<$>]>
    : def[0] extends "keyof"
    ? validateKeyOfExpression<def[1], $>
    : never

export type inferTuple<def extends List, $> = def extends TupleExpression
    ? inferTupleExpression<def, $>
    : {
          [i in keyof def]: inferDefinition<def[i], $>
      }

export type inferTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends ":"
    ? "3" extends keyof def
        ? inferDefinition<def[3], $>
        : inferDefinition<def[0], $>
    : def[1] extends "=>"
    ? (
          In: asIn<inferDefinition<def[0], $>>
      ) => Out<
          "3" extends keyof def
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
    ? def[1] extends constructor<infer t>
        ? t
        : never
    : def[0] extends "node"
    ? def[1] extends ResolvedNode<$>
        ? inferNode<def[1], $>
        : never
    : def[0] extends "keyof"
    ? inferKeyOfExpression<def[1], $>
    : never

const parseBranchTuple: PostfixParser<"|" | "&"> = (def, ctx) => {
    if (def[2] === undefined) {
        return throwParseError(writeMissingRightOperandMessage(def[1], ""))
    }
    const l = parseDefinition(def[0], ctx)
    const r = parseDefinition(def[2], ctx)
    return def[1] === "&" ? intersection(l, r, ctx.type) : union(l, r, ctx.type)
}

const parseArrayTuple: PostfixParser<"[]"> = (def, scope) =>
    arrayOf(parseDefinition(def[0], scope))

export type PostfixParser<token extends PostfixToken> = (
    def: PostfixExpression<token>,
    ctx: ParseContext
) => TypeNode

export type PrefixParser<token extends PrefixToken> = (
    def: PrefixExpression<token>,
    ctx: ParseContext
) => TypeNode

export type TupleExpression = PrefixExpression | PostfixExpression

export const writeMalformedFunctionalExpressionMessage = (
    operator: "=>" | ":",
    rightDef: unknown
) =>
    `Expression requires a function following '${operator}' (was ${typeof rightDef})`

export type TupleExpressionToken = PrefixToken | PostfixToken

type PostfixToken = "[]" | "&" | "|" | ":" | "=>"

export type PostfixExpression<token extends PostfixToken = PostfixToken> =
    readonly [unknown, token, ...unknown[]]

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

type PrefixToken = "keyof" | "instanceof" | "===" | "node"

export type PrefixExpression<token extends PrefixToken = PrefixToken> =
    readonly [token, ...unknown[]]

const prefixParsers: {
    [token in PrefixToken]: PrefixParser<token>
} = {
    keyof: parseKeyOfTuple,
    instanceof: (def) => {
        if (typeof def[1] !== "function") {
            return throwParseError(
                `Expected a constructor following 'instanceof' operator (was ${typeof def[1]}).`
            )
        }
        return { object: { class: def[1] as constructor } }
    },
    "===": (def) => ({ [domainOf(def[1])]: { value: def[1] } }),
    node: (def) => def[1] as ResolvedNode
}

const isPrefixExpression = (def: List): def is PrefixExpression =>
    prefixParsers[def[0] as PrefixToken] !== undefined
