import { PredicateNode } from "../../nodes/predicate.js"
import {
    type IndexedNodeEntry,
    type NamedNodes,
    PropsNode
} from "../../nodes/props.js"
import {
    arrayBasisNode,
    arrayIndexTypeNode,
    TypeNode
} from "../../nodes/type.js"
import type { inferIn, inferOut, TypeConfig } from "../../type.js"
import type { error } from "../../utils/errors.js"
import { throwParseError } from "../../utils/errors.js"
import type { evaluate, isAny } from "../../utils/generics.js"
import type { List } from "../../utils/lists.js"
import { type constructor, isArray } from "../../utils/objectKinds.js"
import type { mutable } from "../../utils/records.js"
import type {
    inferDefinition,
    ParseContext,
    validateDefinition
} from "../definition.js"
import { parseDefinition } from "../definition.js"
import { writeMissingRightOperandMessage } from "../string/shift/operand/unenclosed.js"
import type { InfixOperator, PostfixExpression } from "./ast.js"
import type { Filter, inferFilter } from "./filter.js"
import { parseNarrowTuple } from "./filter.js"
import type { inferMorph, Morph } from "./morph.js"
import { parseMorphTuple } from "./morph.js"

export const parseTuple = (def: List, ctx: ParseContext): TypeNode => {
    if (isIndexOneExpression(def)) {
        return indexOneParsers[def[1]](def as never, ctx)
    }
    if (isIndexZeroExpression(def)) {
        return prefixParsers[def[0]](def as never, ctx)
    }
    const named: mutable<NamedNodes> = {}
    const indexed: IndexedNodeEntry[] = []
    let isVariadic = false
    for (let i = 0; i < def.length; i++) {
        let elementDef = def[i]
        ctx.path.push(i)
        if (typeof elementDef === "string" && elementDef.startsWith("...")) {
            elementDef = elementDef.slice(3)
            isVariadic = true
        } else if (
            isArray(elementDef) &&
            elementDef.length === 2 &&
            elementDef[0] === "..."
        ) {
            elementDef = elementDef[1]
            isVariadic = true
        }
        const value = parseDefinition(elementDef, ctx)
        if (isVariadic) {
            if (!value.extends(unknownArray)) {
                return throwParseError(writeNonArrayRestMessage(elementDef))
            }
            if (i !== def.length - 1) {
                return throwParseError(prematureRestMessage)
            }
            const elementType = value.getPath(arrayIndexTypeNode())
            indexed.push([arrayIndexTypeNode(i), elementType])
        } else {
            named[i] = {
                kind: "required",
                value
            }
        }
        ctx.path.pop()
    }
    if (!isVariadic) {
        named.length = {
            kind: "prerequisite",
            value: TypeNode.from({ basis: ["===", def.length] })
        }
    }
    const props = new PropsNode([named, indexed])
    const predicate = new PredicateNode([arrayBasisNode, props])
    return new TypeNode([predicate])
}

const unknownArray = TypeNode.from({
    basis: Array
})

// TODO: unify
type InfixExpression = [unknown, InfixOperator, ...unknown[]]

export type validateTuple<def extends List, $> = def extends IndexZeroExpression
    ? validatePrefixExpression<def, $>
    : def extends PostfixExpression
    ? validatePostfixExpression<def, $>
    : def extends InfixExpression
    ? validateInfixExpression<def, $>
    : validateTupleLiteral<def, $>

type validateTupleLiteral<
    def extends List,
    $,
    result extends unknown[] = []
> = def extends [infer head, ...infer tail]
    ? validateTupleLiteral<
          tail,
          $,
          [
              ...result,
              head extends variadicExpression<infer operand>
                  ? validateDefinition<operand, $> extends infer syntacticResult
                      ? syntacticResult extends operand
                          ? semanticallyValidateRestElement<
                                operand,
                                $
                            > extends infer semanticResult
                              ? semanticResult extends operand
                                  ? tail extends []
                                      ? head
                                      : prematureRestMessage
                                  : semanticResult
                              : never
                          : syntacticResult
                      : never
                  : validateDefinition<head, $>
          ]
      >
    : result

type semanticallyValidateRestElement<operand, $> = inferDefinition<
    operand,
    $
> extends infer result
    ? result extends never
        ? writeNonArrayRestMessage<operand>
        : isAny<result> extends true
        ? writeNonArrayRestMessage<operand>
        : result extends readonly unknown[]
        ? operand
        : writeNonArrayRestMessage<operand>
    : never

export const writeNonArrayRestMessage = <operand>(operand: operand) =>
    `Rest element ${
        typeof operand === "string" ? `'${operand}'` : ""
    } must be an array` as writeNonArrayRestMessage<operand>

type writeNonArrayRestMessage<operand> = `Rest element ${operand extends string
    ? `'${operand}'`
    : ""} must be an array`

export const prematureRestMessage = `Rest elements are only allowed at the end of a tuple`

type prematureRestMessage = typeof prematureRestMessage

type inferTupleLiteral<
    def extends List,
    $,
    result extends unknown[] = []
> = def extends [infer head, ...infer tail]
    ? inferDefinition<
          head extends variadicExpression<infer operand> ? operand : head,
          $
      > extends infer element
        ? head extends variadicExpression
            ? element extends readonly unknown[]
                ? inferTupleLiteral<tail, $, [...result, ...element]>
                : never
            : inferTupleLiteral<tail, $, [...result, element]>
        : never
    : result

type variadicExpression<operandDef = unknown> =
    | variadicStringExpression<operandDef & string>
    | variadicTupleExpression<operandDef>

type variadicStringExpression<operandDef extends string = string> =
    `...${operandDef}`

type variadicTupleExpression<operandDef = unknown> = ["...", operandDef]

type validatePrefixExpression<
    def extends IndexZeroExpression,
    $
> = def["length"] extends 1
    ? [writeMissingRightOperandMessage<def[0]>]
    : [
          def[0],
          def[0] extends "==="
              ? def[1]
              : def[0] extends "instanceof"
              ? constructor
              : def[0] extends "keyof"
              ? validateDefinition<def[1], $>
              : never
      ]

export type inferTuple<def extends List, $> = def extends TupleExpression
    ? inferTupleExpression<def, $>
    : inferTupleLiteral<def, $>

export type inferTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends "[]"
    ? inferDefinition<def[0], $>[]
    : def[1] extends "&"
    ? inferDefinition<def[0], $> & inferDefinition<def[2], $>
    : def[1] extends "|"
    ? inferDefinition<def[0], $> | inferDefinition<def[2], $>
    : def[1] extends "=>"
    ? inferFilter<def[0], def[2], $>
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
    : def[0] extends "keyof"
    ? inferKeyOfExpression<def[1], $>
    : never

type validatePostfixExpression<def extends PostfixExpression, $> = [
    validateDefinition<def[0], $>,
    "[]"
]

type validateInfixExpression<
    def extends InfixExpression,
    $
> = def["length"] extends 2
    ? [def[0], error<writeMissingRightOperandMessage<def[1]>>]
    : [
          validateDefinition<def[0], $>,
          def[1],
          def[1] extends "|" | "&"
              ? validateDefinition<def[2], $>
              : // TODO: move?
              def[1] extends "=>"
              ? Filter<inferIn<inferDefinition<def[0], $>>>
              : def[1] extends "|>"
              ? Morph<inferOut<inferDefinition<def[0], $>>, unknown>
              : validateDefinition<def[2], $>
      ]

export type UnparsedTupleExpressionInput = {
    instanceof: constructor
    "===": unknown
}

export type UnparsedTupleOperator = evaluate<keyof UnparsedTupleExpressionInput>

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) =>
    parseDefinition(def[1], ctx).keyOf()

export type inferKeyOfExpression<operandDef, $> = evaluate<
    keyof inferDefinition<operandDef, $>
>

export type ConfigTuple<
    def = unknown,
    config extends TypeConfig = TypeConfig
> = readonly [def, ":", config]

export const parseConfigTuple: PostfixParser<":"> = (def, ctx) =>
    parseDefinition(def[0], ctx)

const parseBranchTuple: PostfixParser<"|" | "&"> = (def, ctx) => {
    if (def[2] === undefined) {
        return throwParseError(writeMissingRightOperandMessage(def[1], ""))
    }
    const l = parseDefinition(def[0], ctx)
    const r = parseDefinition(def[2], ctx)
    return def[1] === "&" ? l.and(r) : l.or(r)
}

const parseArrayTuple: PostfixParser<"[]"> = (def, scope) =>
    parseDefinition(def[0], scope).array()

export type PostfixParser<token extends IndexOneOperator> = (
    def: IndexOneExpression<token>,
    ctx: ParseContext
) => TypeNode

export type PrefixParser<token extends IndexZeroOperator> = (
    def: IndexZeroExpression<token>,
    ctx: ParseContext
) => TypeNode

export type TupleExpression = IndexZeroExpression | IndexOneExpression

export const writeMalformedFunctionalExpressionMessage = (
    operator: FunctionalTupleOperator,
    rightDef: unknown
) =>
    `Expression requires a function following '${operator}' (was ${typeof rightDef})`

export type TupleExpressionOperator = IndexZeroOperator | IndexOneOperator

export type IndexOneOperator = TuplePostfixOperator | TupleInfixOperator

export type TuplePostfixOperator = "[]"

export type TupleInfixOperator = "&" | "|" | "=>" | "|>" | ":"

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

export type IndexZeroOperator = "keyof" | "instanceof" | "==="

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
        return TypeNode.from({
            basis: def[1] as constructor
        })
    },
    "===": (def) => TypeNode.from({ basis: ["===", def[1]] })
}

const isIndexZeroExpression = (def: List): def is IndexZeroExpression =>
    prefixParsers[def[0] as IndexZeroOperator] !== undefined
