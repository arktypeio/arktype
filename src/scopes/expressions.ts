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
 * @operator {@link intersection}
 * @docgenTable
 * @tuple  [a, &, b]
 * @helper  intersection(a,b)
 * @string "a&b"
 * @example const intersection = type("string&uppercase")
 * @example const intersection = type(["string", "&", "uppercase"])
 * @example const intersection = intersection("string","uppercase")
 */
export const intersection: Ark["intersection"] = scopes.ark.intersection

/**
 * @operator {@link union}
 * @docgenTable
 * @tuple [a, | , b]
 * @helper union(a,b)
 * @string "a|b"
 * @example const union = type("string|number")
 * @example const union = type(["string", "|", "number"])
 * @example const union = union("string", "number")
 */
export const union: Ark["union"] = scopes.ark.union

/**
 * @operator {@link arrayOf}
 * @docgenTable
 * @string "type[]"
 * @tuple ["arrayOf", <object>]
 * @helper arrayOf(<object>)
 * @example const arrayOf = type("number[]")
 * @example const arrayOf = type(["arrayOf", "number"])
 * @example const arrayOf = arrayOf("number")
 */
export const arrayOf: Ark["arrayOf"] = scopes.ark.arrayOf

/**
 * @operator {@link keyOf}
 * @docgenTable
 * @tuple ["keyOf", <object>]
 * @helper  keyOf(<object>)
 * @example const keyOf = type(["keyOf", {a:"string"}])
 * @example const keyOf = keyOf({a:"string"})
 */
export const keyOf: Ark["keyOf"] = scopes.ark.keyOf

/**
 * @operator {@link instanceOf}
 * @docgenTable
 * @helper instanceOf(<object>)
 * @tuple ["instanceOf", <object>]
 * @example const instanceOf = type(["instanceOf", Date])
 * @example const instanceOf = instanceOf(Date)
 */
export const instanceOf: Ark["instanceOf"] = scopes.ark.instanceOf

/**
 * @operator {@link valueOf}
 * @docgenTable
 * @tuple ["===", value]
 * @helper valueOf(<object>)
 * @example const valueOf = type(["valueOf", {a:"string"}])
 * @example const valueOf = valueOf({a:"string"})
 */
export const valueOf: Ark["valueOf"] = scopes.ark.valueOf

/**
 * @operator {@link narrow}
 * @docgenTable
 * @tuple ["type", => , condition]
 * @example const narrow = type( ["number", => , (n) => n % 2 === 0])
 * @example const isEven = (x: unknown): x is number => x % 2 === 0
 */
export const narrow: Ark["narrow"] = scopes.ark.narrow

/**
 * @operator {@link morph}
 * @docgenTable
 * @tuple [inputType, |>, (data) => output]
 * @helper morph(inputType, (data) => output)
 * @example const morph = type( ["string", |> , (data) => `morphed ${data}`])
 * @example const morph = morph("string", (data) => `morphed ${input}`)
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
