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
import type { PrecompiledDefaults } from "./ark.ts"
import { scopes } from "./ark.ts"
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

type Ark = Expressions<PrecompiledDefaults>

/**
 * @operator {@link intersection | &}
 * @docgenTable
 * @string "L&R"
 * @tuple  [L, "&", R]
 * @helper  intersection(L,R)
 * @example string
 *      const intersection = type("/@arktype\.io$/ & email")
 * @example tuple
 *      const tupleIntersection = type(["/@arktype\.io$/", "&", "email"])
 * @example helper
 *      const helperIntersection = intersection("/@arktype\.io$/","email")
 */
export const intersection: Ark["intersection"] = scopes.ark.intersection

/**
 * @operator {@link union | |}
 * @docgenTable
 * @string "L|R"
 * @tuple [L, "|" , R]
 * @helper union(L,R)
 * @example string
 *      const union = type("string|number")
 * @example tuple
 *      const tupleUnion = type(["string", "|", "number"])
 * @example helper
 *      const helperUnion = union("string", "number")
 */
export const union: Ark["union"] = scopes.ark.union

/**
 * @operator {@link arrayOf}
 * @docgenTable
 * @string "T[]"
 * @tuple [T, "[]"]
 * @helper arrayOf(<object>)
 * @example string
 *      const numberArray = type("number[]")
 * @example tuple
 *      const tupleArray = type(["number", "[]"])
 * @example helper
 *      const helperArray = arrayOf("number")
 */
export const arrayOf: Ark["arrayOf"] = scopes.ark.arrayOf

/**
 * @operator {@link keyOf}
 * @docgenTable
 * @tuple "["keyOf", <object>]"
 * @helper  "keyOf(<object>)"
 * @example tuple
 *      const tupleKeyOf = type(["keyOf", {a:"string"}])
 * @example helper
 *      const helperKeyOf = keyOf({a:"string"})
 */
export const keyOf: Ark["keyOf"] = scopes.ark.keyOf

/**
 * @operator {@link instanceOf}
 * @docgenTable
 * @tuple ["instanceOf", <object>]
 * @helper instanceOf(<object>)
 * @example tuple
 *      const tupleInstanceOf = type(["instanceOf", Date])
 * @example helper
 *      const helperInstanceOf = instanceOf(Date)
 */
export const instanceOf: Ark["instanceOf"] = scopes.ark.instanceOf

/**
 * @operator {@link valueOf | ===}
 * @docgenTable
 * @tuple ["===", value]
 * @helper valueOf(<object>)
 * @example tuple
 *      const tupleValueOf = type(["valueOf", {a:"string"}])
 * @example helper
 *      const helperValueOf = valueOf({a:"string"})
 */
export const valueOf: Ark["valueOf"] = scopes.ark.valueOf

/**
 * @operator {@link narrow | =>}
 * @docgenTable
 * @tuple ["type", => , condition]
 * @example tuple
 *      const narrow = type( ["number", "=>" , (n) => n % 2 === 0])
 * @example helper
 *      const isEven = (x: unknown): x is number => x % 2 === 0
 */
export const narrow: Ark["narrow"] = scopes.ark.narrow

/**
 * @operator {@link morph | |>}
 * @docgenTable
 * @tuple [inputType, |>, (data) => output]
 * @helper morph(inputType, (data) => output)
 * @example tuple
 *      const tupleMorph = type( ["string", "|>" , (data) => `morphed ${data}`])
 * @example helper
 *      const helperMorph = morph("string", (data) => `morphed ${input}`)
 */
export const morph: Ark["morph"] = scopes.ark.morph

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
