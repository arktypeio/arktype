import type { distributable } from "../parse/ast/distributableFunction.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { Narrow } from "../parse/ast/narrow.ts"
import type {
    FunctionalTupleOperator,
    inferTupleExpression,
    TupleExpression,
    TuplePostfixOperator,
    UnparsedTupleExpressionInput,
    UnparsedTupleOperator
} from "../parse/ast/tuple.ts"
import type {
    inferDefinition,
    validateDefinition
} from "../parse/definition.ts"
import type { conform } from "../utils/generics.ts"
import type { PrecompiledDefaults } from "./standard.ts"
import { scopes } from "./standard.ts"
import type { asIn, asOut, Type, TypeOptions } from "./type.ts"

export type Expressions<$> = {
    intersection: BinaryExpressionParser<$, "&">
    union: BinaryExpressionParser<$, "|">
    arrayOf: UnaryExpressionParser<$, "[]">
    keyOf: UnaryExpressionParser<$, "keyof">
    node: UnvalidatedExpressionParser<$, "node">
    instanceOf: UnvalidatedExpressionParser<$, "instanceof">
    valueOf: UnvalidatedExpressionParser<$, "===">
    narrow: FunctionalExpressionParser<$, "=>">
    morph: FunctionalExpressionParser<$, "|>">
}

type Standard = Expressions<PrecompiledDefaults>

export const intersection: Standard["intersection"] =
    scopes.standard.intersection

export const union: Standard["union"] = scopes.standard.union

export const arrayOf: Standard["arrayOf"] = scopes.standard.arrayOf

export const keyOf: Standard["keyOf"] = scopes.standard.keyOf

export const instanceOf: Standard["instanceOf"] = scopes.standard.instanceOf

export const valueOf: Standard["valueOf"] = scopes.standard.valueOf

export const narrow: Standard["narrow"] = scopes.standard.narrow

export const morph: Standard["morph"] = scopes.standard.morph

export type BinaryExpressionParser<$, operator extends "&" | "|"> = {
    <l, r>(
        l: validateDefinition<l, $>,
        r: validateDefinition<r, $>
    ): parseTupleExpression<[l, operator, r], $>

    <l, r>(
        l: validateDefinition<l, $>,
        r: validateDefinition<r, $>,
        opts: TypeOptions
    ): parseTupleExpression<[l, operator, r], $>
}

export type UnaryExpressionParser<$, operator extends "keyof" | "[]"> = {
    <def>(def: validateDefinition<def, $>): parseTupleExpression<
        unaryToTupleExpression<def, operator>,
        $
    >

    <def>(
        def: validateDefinition<def, $>,
        opts: TypeOptions
    ): parseTupleExpression<unaryToTupleExpression<def, operator>, $>
}

export type UnvalidatedExpressionParser<
    $,
    operator extends UnparsedTupleOperator
> = {
    <def>(
        def: conform<def, UnparsedTupleExpressionInput<$>[operator]>
    ): parseTupleExpression<[operator, def], $>

    <def>(
        def: conform<def, UnparsedTupleExpressionInput<$>[operator]>,
        opts: TypeOptions
    ): parseTupleExpression<[operator, def], $>
}

export type FunctionalExpressionParser<
    $,
    operator extends FunctionalTupleOperator
> = {
    <inDef, fn extends FunctionWithInferredInput<$, operator, inDef>>(
        inDef: validateDefinition<inDef, $>,
        fn: fn
    ): parseTupleExpression<[inDef, operator, fn], $>

    <inDef, fn extends FunctionWithInferredInput<$, operator, inDef>>(
        inDef: validateDefinition<inDef, $>,
        fn: fn,
        opts: TypeOptions
    ): parseTupleExpression<[inDef, operator, fn], $>
}

export type FunctionWithInferredInput<
    $,
    operator extends FunctionalTupleOperator,
    inDef
> = operator extends "=>"
    ? distributable<Narrow<asIn<inferDefinition<inDef, $>>>>
    : Morph<asOut<inferDefinition<inDef, $>>>

type unaryToTupleExpression<
    def,
    operator extends "keyof" | "[]"
> = operator extends TuplePostfixOperator ? [def, "[]"] : [operator, def]

type parseTupleExpression<
    expression extends TupleExpression,
    $
> = inferTupleExpression<expression, $> extends infer result
    ? [result] extends [never]
        ? never
        : Type<result>
    : never
