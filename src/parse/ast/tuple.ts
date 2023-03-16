import type { Node, ResolvedNode } from "../../nodes/node.ts"
import { rootIntersection, rootUnion, toArrayNode } from "../../nodes/node.ts"
import type { Prop } from "../../nodes/rules/props.ts"
import { domainOf } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type {
    conform,
    constructor,
    Dict,
    error,
    evaluate,
    List
} from "../../utils/generics.ts"
import type {
    inferDefinition,
    ParseContext,
    validateDefinition
} from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import { writeMissingRightOperandMessage } from "../string/shift/operand/unenclosed.ts"
import type { Scanner } from "../string/shift/scanner.ts"
import type { validateConfigTuple } from "./config.ts"
import { parseConfigTuple } from "./config.ts"
import type { inferIntersection } from "./intersection.ts"
import type { inferKeyOfExpression, validateKeyOfExpression } from "./keyof.ts"
import { parseKeyOfTuple } from "./keyof.ts"
import type { inferMorph, validateMorphTuple } from "./morph.ts"
import { parseMorphTuple } from "./morph.ts"
import type { inferNarrow, validateNarrowTuple } from "./narrow.ts"
import { parseNarrowTuple } from "./narrow.ts"
import type { inferNode } from "./node.ts"
import type { inferUnion } from "./union.ts"

export const parseTuple = (def: List, ctx: ParseContext): Node => {
    if (isIndexOneExpression(def)) {
        return indexOneParsers[def[1]](def as never, ctx)
    }
    if (isIndexZeroExpression(def)) {
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
            instance: Array,
            props
        }
    }
}

export type validateTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends "[]"
    ? conform<def, readonly [validateDefinition<def[0], $>, "[]"]>
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
    : def[1] extends "=>"
    ? validateNarrowTuple<def, $>
    : def[1] extends "|>"
    ? validateMorphTuple<def, $>
    : def[1] extends ":"
    ? validateConfigTuple<def, $>
    : def[0] extends "==="
    ? conform<def, readonly ["===", unknown]>
    : def[0] extends "instanceof"
    ? conform<def, readonly ["instanceof", constructor]>
    : def[0] extends "node"
    ? conform<def, readonly ["node", ResolvedNode<$>]>
    : def[0] extends "keyof"
    ? conform<def, validateKeyOfExpression<def[1], $>>
    : never

export type UnparsedTupleExpressionInput<$> = {
    instanceof: constructor
    node: ResolvedNode<$>
    "===": unknown
}

export type UnparsedTupleOperator = evaluate<
    keyof UnparsedTupleExpressionInput<Dict>
>

export type inferTuple<def extends List, $> = def extends TupleExpression
    ? inferTupleExpression<def, $>
    : {
          [i in keyof def]: inferDefinition<def[i], $>
      }

export type inferTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends "[]"
    ? inferDefinition<def[0], $>[]
    : def[1] extends "&"
    ? inferIntersection<inferDefinition<def[0], $>, inferDefinition<def[2], $>>
    : def[1] extends "|"
    ? inferUnion<inferDefinition<def[0], $>, inferDefinition<def[2], $>>
    : def[1] extends "=>"
    ? inferNarrow<def[0], def[2], $>
    : def[1] extends "|>"
    ? inferMorph<def[0], def[2], $>
    : def[1] extends ":"
    ? inferDefinition<def[0], $>
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
    return def[1] === "&"
        ? rootIntersection(l, r, ctx.type)
        : rootUnion(l, r, ctx.type)
}

const parseArrayTuple: PostfixParser<"[]"> = (def, scope) =>
    toArrayNode(parseDefinition(def[0], scope))

export type PostfixParser<token extends IndexOneOperator> = (
    def: IndexOneExpression<token>,
    ctx: ParseContext
) => Node

export type PrefixParser<token extends IndexZeroOperator> = (
    def: IndexZeroExpression<token>,
    ctx: ParseContext
) => Node

export type TupleExpression = IndexZeroExpression | IndexOneExpression

export const writeMalformedFunctionalExpressionMessage = (
    operator: FunctionalTupleOperator,
    rightDef: unknown
) =>
    `Expression requires a function following '${operator}' (was ${typeof rightDef})`

export type TupleExpressionOperator = IndexZeroOperator | IndexOneOperator

type IndexOneOperator = TuplePostfixOperator | TupleInfixOperator

export type TuplePostfixOperator = "[]"

export type TupleInfixOperator = "&" | "|" | ":" | "=>" | "|>"

export type IndexOneExpression<
    token extends IndexOneOperator = IndexOneOperator
> = readonly [unknown, token, ...unknown[]]

const isIndexOneExpression = (def: List): def is IndexOneExpression =>
    indexOneParsers[def[1] as IndexOneOperator] !== undefined

const indexOneParsers: {
    [token in IndexOneOperator]: PostfixParser<token>
} = {
    "|": parseBranchTuple,
    "&": parseBranchTuple,
    "[]": parseArrayTuple,
    "=>": parseNarrowTuple,
    "|>": parseMorphTuple,
    ":": parseConfigTuple
}

export type FunctionalTupleOperator = "=>" | "|>"

export type IndexZeroOperator = "keyof" | "instanceof" | "===" | "node"

export type IndexZeroExpression<
    token extends IndexZeroOperator = IndexZeroOperator
> = readonly [token, ...unknown[]]

const prefixParsers: {
    [token in IndexZeroOperator]: PrefixParser<token>
} = {
    keyof: parseKeyOfTuple,
    instanceof: (def) => {
        if (typeof def[1] !== "function") {
            return throwParseError(
                `Expected a constructor following 'instanceof' operator (was ${typeof def[1]}).`
            )
        }
        return { object: { instance: def[1] as constructor } }
    },
    "===": (def) => ({ [domainOf(def[1])]: { value: def[1] } }),
    node: (def) => def[1] as ResolvedNode
}

const isIndexZeroExpression = (def: List): def is IndexZeroExpression =>
    prefixParsers[def[0] as IndexZeroOperator] !== undefined
