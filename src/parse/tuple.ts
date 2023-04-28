import { type } from "../main.js"
import type { TraversalState } from "../nodes/traverse.js"
import type { inferIn, inferOut } from "../type.js"
import type { constructor, error, List } from "../utils/generics.js"
import type { InfixOperator, PostfixExpression } from "./ast/ast.js"
import type { Filter, validateFilterTuple } from "./ast/filter.js"
import type { IndexZeroExpression } from "./ast/tuple.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { writeMissingRightOperandMessage } from "./string/shift/operand/unenclosed.js"

export type Operator = "&" | "|" | "=>" | "|>" | ":" | "[]"

const t = type([{ a: "number" }, { b: "string" }])
//    ^?

const tzz = type(["===", { a: "number", b: "string" }])
//    ^?

// @ts-expect-error
const tzzz = type(["keyof", { a: "numbe", b: "string" }])
//    ^?

const gfdg = type(["instanceof", Array])

const zzst = type([{ a: "boolean" }, "|>", () => false])

// const tz = type([{ a: "number" }, "|", { b: "string" }])
// //    ^?

// type([{ a: "number" }, "|", { c: "string" }])

type InfixExpression = [unknown, InfixOperator, ...unknown[]]

export type validateTuple<def extends List, $> = def extends TupleExpression
    ? validateTupleExpression<def, $>
    : validateTupleLiteral<def, $>

type TupleExpression = IndexZeroExpression | PostfixExpression | InfixExpression

type validateTupleExpression<
    def extends TupleExpression,
    $
> = def extends IndexZeroExpression
    ? validatePrefixExpression<def, $>
    : def extends PostfixExpression
    ? validatePostfixExpression<def, $>
    : validateInfixExpression<def, $>

export type validateTupleLiteral<
    def extends List,
    $,
    result extends unknown[] = []
> = def extends [infer head, ...infer tail]
    ? validateTupleLiteral<tail, $, [...result, validateDefinition<head, $>]>
    : result

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
          def[1] extends "=>"
              ? Filter<inferIn<inferDefinition<def[0], $>>>
              : def[1] extends "|>"
              ? Morph<inferOut<inferDefinition<def[0], $>>, unknown>
              : def[1] extends "|" | "&"
              ? validateDefinition<def[2], $>
              : validateDefinition<def[2], $>
      ]

type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

// : def[1] extends "=>"
// ? validateFilterTuple<def, $>
// : def[1] extends "|>"
// ? validateMorphTuple<def, $>
// : def[1] extends ":"
// ? validateConfigTuple<def, $>
// : never
