import type { CheckResult, TraversalState } from "../compile/traverse.js"
import type { Problem } from "../main.js"
import { arrayIndexTypeNode } from "../nodes/composite/indexed.js"
import { predicateNode } from "../nodes/composite/predicate.js"
import type { NodeEntry } from "../nodes/composite/props.js"
import { propsNode } from "../nodes/composite/props.js"
import type { TypeNode } from "../nodes/composite/type.js"
import { builtins, typeNode } from "../nodes/composite/type.js"
import { arrayClassNode } from "../nodes/primitive/basis/class.js"
import type { ParseContext } from "../scope.js"
import type { extractIn, extractOut } from "../type.js"
import { throwParseError } from "../utils/errors.js"
import type { evaluate, isAny } from "../utils/generics.js"
import type { List } from "../utils/lists.js"
import type { AbstractableConstructor } from "../utils/objectKinds.js"
import { isArray } from "../utils/objectKinds.js"
import { stringify } from "../utils/serialize.js"
import {
    type InfixOperator,
    type PostfixExpression,
    writeUnsatisfiableExpressionError
} from "./ast/ast.js"
import type { inferIntersection } from "./ast/intersections.js"
import type { astToString } from "./ast/utils.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { Prefix } from "./string/reduce/shared.js"
import { writeMissingRightOperandMessage } from "./string/shift/operand/unenclosed.js"

export const parseTuple = (def: List, ctx: ParseContext): TypeNode => {
    const tupleExpressionResult = isIndexOneExpression(def)
        ? indexOneParsers[def[1]](def as never, ctx)
        : isIndexZeroExpression(def)
        ? prefixParsers[def[0]](def as never, ctx)
        : undefined
    if (tupleExpressionResult) {
        return tupleExpressionResult.isNever()
            ? throwParseError(
                  writeUnsatisfiableExpressionError(
                      def
                          .map((def) =>
                              typeof def === "string" ? def : stringify(def)
                          )
                          .join(" ")
                  )
              )
            : tupleExpressionResult
    }
    const props: NodeEntry[] = []
    let isVariadic = false
    for (let i = 0; i < def.length; i++) {
        let elementDef = def[i]
        ctx.path.push(`${i}`)
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
        const value = ctx.scope.parse(elementDef, ctx)
        if (isVariadic) {
            if (!value.extends(builtins.array())) {
                return throwParseError(writeNonArrayRestMessage(elementDef))
            }
            if (i !== def.length - 1) {
                return throwParseError(prematureRestMessage)
            }
            const elementType = value.getPath(arrayIndexTypeNode())
            props.push({ key: arrayIndexTypeNode(i), value: elementType })
        } else {
            props.push({
                key: {
                    name: `${i}`,
                    prerequisite: false,
                    optional: false
                },
                value
            })
        }
        ctx.path.pop()
    }
    if (!isVariadic) {
        props.push({
            key: {
                name: "length",
                prerequisite: true,
                optional: false
            },
            value: typeNode({ basis: ["===", def.length] })
        })
    }
    const predicate = predicateNode([arrayClassNode(), propsNode(props)])
    return typeNode([predicate])
}

type InfixExpression = [unknown, InfixOperator, ...unknown[]]

export type validateTuple<
    def extends List,
    $,
    args
> = def extends IndexZeroExpression
    ? validatePrefixExpression<def, $, args>
    : def extends PostfixExpression
    ? validatePostfixExpression<def, $, args>
    : def extends InfixExpression
    ? validateInfixExpression<def, $, args>
    : def extends
          | readonly ["", ...unknown[]]
          | readonly [unknown, "", ...unknown[]]
    ? [
          def[0] extends ""
              ? keyof $ | keyof args | IndexZeroOperator | Prefix
              : def[0],
          def[1] extends ""
              ? keyof $ | keyof args | IndexOneOperator | Prefix
              : def[1]
      ]
    : validateTupleLiteral<def, $, args>

export type validateTupleLiteral<
    def extends List,
    $,
    args,
    result extends unknown[] = []
> = def extends [infer head, ...infer tail]
    ? validateTupleLiteral<
          tail,
          $,
          args,
          [
              ...result,
              head extends variadicExpression<infer operand>
                  ? validateDefinition<
                        operand,
                        $,
                        args
                    > extends infer syntacticResult
                      ? syntacticResult extends operand
                          ? semanticallyValidateRestElement<
                                operand,
                                $,
                                args
                            > extends infer semanticResult
                              ? semanticResult extends operand
                                  ? tail extends []
                                      ? head
                                      : prematureRestMessage
                                  : semanticResult
                              : never
                          : syntacticResult
                      : never
                  : validateDefinition<head, $, args>
          ]
      >
    : result

type semanticallyValidateRestElement<operand, $, args> = inferDefinition<
    operand,
    $,
    args
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
    args,
    result extends unknown[] = []
> = def extends [infer head, ...infer tail]
    ? inferDefinition<
          head extends variadicExpression<infer operand> ? operand : head,
          $,
          args
      > extends infer element
        ? head extends variadicExpression
            ? element extends readonly unknown[]
                ? inferTupleLiteral<tail, $, args, [...result, ...element]>
                : never
            : inferTupleLiteral<tail, $, args, [...result, element]>
        : never
    : result

type variadicExpression<operandDef = unknown> =
    | variadicStringExpression<operandDef & string>
    | variadicTupleExpression<operandDef>

type variadicStringExpression<operandDef extends string = string> =
    `...${operandDef}`

type variadicTupleExpression<operandDef = unknown> = ["...", operandDef]

export type inferTuple<def extends List, $, args> = def extends TupleExpression
    ? inferTupleExpression<def, $, args>
    : inferTupleLiteral<def, $, args>

export type inferTupleExpression<
    def extends TupleExpression,
    $,
    args
> = def[1] extends "[]"
    ? inferDefinition<def[0], $, args>[]
    : def[1] extends "&"
    ? inferIntersection<
          inferDefinition<def[0], $, args>,
          inferDefinition<def[2], $, args>
      >
    : def[1] extends "|"
    ? inferDefinition<def[0], $, args> | inferDefinition<def[2], $, args>
    : def[1] extends ":"
    ? inferNarrow<inferDefinition<def[0], $, args>, def[2]>
    : def[1] extends "=>"
    ? parseMorph<def[0], def[2], $, args>
    : def[0] extends "==="
    ? def[1]
    : def[0] extends "instanceof"
    ? def[1] extends AbstractableConstructor<infer t>
        ? t
        : never
    : def[0] extends "keyof"
    ? inferKeyOfExpression<def[1], $, args>
    : never

export type validatePrefixExpression<
    def extends IndexZeroExpression,
    $,
    args
> = def["length"] extends 1
    ? [writeMissingRightOperandMessage<def[0]>]
    : [
          def[0] extends "keyof"
              ? inferDefinition<def, $, args> extends never
                  ? writeUnsatisfiableExpressionError<astToString<def>>
                  : def[0]
              : def[0],
          def[0] extends "==="
              ? def[1]
              : def[0] extends "instanceof"
              ? AbstractableConstructor
              : def[0] extends "keyof"
              ? validateDefinition<def[1], $, args>
              : never
      ]

export type validatePostfixExpression<
    def extends PostfixExpression,
    $,
    args
> = [validateDefinition<def[0], $, args>, "[]"]

export type validateInfixExpression<
    def extends InfixExpression,
    $,
    args
> = def["length"] extends 2
    ? [def[0], writeMissingRightOperandMessage<def[1]>]
    : [
          validateDefinition<def[0], $, args>,
          def[1] extends "&"
              ? inferDefinition<def, $, args> extends never
                  ? writeUnsatisfiableExpressionError<"intersection">
                  : def["1"]
              : def[1],
          def[1] extends "|"
              ? validateDefinition<def[2], $, args>
              : def[1] extends "&"
              ? validateDefinition<def[2], $, args>
              : def[1] extends ":"
              ? Narrow<extractIn<inferDefinition<def[0], $, args>>>
              : def[1] extends "=>"
              ? Morph<extractOut<inferDefinition<def[0], $, args>>, unknown>
              : validateDefinition<def[2], $, args>
      ]

export type UnparsedTupleExpressionInput = {
    instanceof: AbstractableConstructor
    "===": unknown
}

export type UnparsedTupleOperator = evaluate<keyof UnparsedTupleExpressionInput>

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) =>
    ctx.scope.parse(def[1], ctx).keyof()

export type inferKeyOfExpression<operandDef, $, args> = evaluate<
    keyof inferDefinition<operandDef, $, args>
>

const parseBranchTuple: PostfixParser<"|" | "&"> = (def, ctx) => {
    if (def[2] === undefined) {
        return throwParseError(writeMissingRightOperandMessage(def[1], ""))
    }
    const l = ctx.scope.parse(def[0], ctx)
    const r = ctx.scope.parse(def[2], ctx)
    return def[1] === "&" ? l.and(r) : l.or(r)
}

const parseArrayTuple: PostfixParser<"[]"> = (def, ctx) =>
    ctx.scope.parse(def[0], ctx).array()

export type PostfixParser<token extends IndexOneOperator> = (
    def: IndexOneExpression<token>,
    ctx: ParseContext
) => TypeNode

export type PrefixParser<token extends IndexZeroOperator> = (
    def: IndexZeroExpression<token>,
    ctx: ParseContext
) => TypeNode

export type TupleExpression = IndexZeroExpression | IndexOneExpression

export type TupleExpressionOperator = IndexZeroOperator | IndexOneOperator

export type IndexOneOperator = TuplePostfixOperator | TupleInfixOperator

export type TuplePostfixOperator = "[]"

export type TupleInfixOperator = "&" | "|" | "=>" | ":"

export type IndexOneExpression<
    token extends IndexOneOperator = IndexOneOperator
> = readonly [unknown, token, ...unknown[]]

const isIndexOneExpression = (def: List): def is IndexOneExpression =>
    indexOneParsers[def[1] as IndexOneOperator] !== undefined

export const parseMorphTuple: PostfixParser<"=>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(
            writeMalformedFunctionalExpressionMessage("=>", def[2])
        )
    }
    return ctx.scope.parse(def[0], ctx).constrain("morph", def[2] as Morph)
}

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type parseMorph<inDef, morph, $, args> = morph extends Morph
    ? (
          In: extractIn<inferDefinition<inDef, $, args>>
      ) => Out<inferMorphOut<ReturnType<morph>>>
    : never

export type MorphAst<i = any, o = unknown> = (In: i) => Out<o>

export type Out<o = unknown> = ["=>", o]

export type inferMorphOut<out> = [out] extends [CheckResult<infer t>]
    ? t
    : Exclude<out, Problem>

export const writeMalformedFunctionalExpressionMessage = (
    operator: FunctionalTupleOperator,
    value: unknown
) =>
    `${
        operator === ":" ? "Narrow" : "Morph"
    } expression requires a function following '${operator}' (was ${typeof value})`

export const parseNarrowTuple: PostfixParser<":"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(
            writeMalformedFunctionalExpressionMessage(":", def[2])
        )
    }
    return ctx.scope.parse(def[0], ctx).constrain("narrow", def[2] as Narrow)
}

export type Narrow<data = any> = (data: data, state: TraversalState) => boolean

export type NarrowCast<data = any, narrowed extends data = data> = (
    data: data,
    state: TraversalState
) => data is narrowed

export type inferNarrow<In, predicate> = predicate extends (
    data: any,
    ...args: any[]
) => data is infer narrowed
    ? narrowed
    : In

const indexOneParsers: {
    [token in IndexOneOperator]: PostfixParser<token>
} = {
    "|": parseBranchTuple,
    "&": parseBranchTuple,
    "[]": parseArrayTuple,
    ":": parseNarrowTuple,
    "=>": parseMorphTuple
}

export type FunctionalTupleOperator = ":" | "=>"

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
        return typeNode({
            basis: def[1] as AbstractableConstructor
        })
    },
    "===": (def) => typeNode({ basis: ["===", def[1]] })
}

const isIndexZeroExpression = (def: List): def is IndexZeroExpression =>
    prefixParsers[def[0] as IndexZeroOperator] !== undefined
