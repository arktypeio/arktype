import type { Problem } from "../../nodes/problems.ts"
import type { CheckResult, TraversalState } from "../../nodes/traverse.ts"
import type { asIn, asOut } from "../../scopes/type.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export const parseMorphTuple: PostfixParser<"|>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedMorphExpressionMessage(def[2]))
    }
    const node = parseDefinition(def[0], ctx)
    ctx.type.includesMorph = true

    return {
        ...node,
        morphs: node.morphs ? [...node.morphs, def[2]] : def[2]
    }
}

export type validateMorphTuple<def extends TupleExpression, $> = readonly [
    validateDefinition<def[0], $>,
    "|>",
    Morph<asOut<inferDefinition<def[0], $>>, unknown>
]

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type ParsedMorph<i = any, o = unknown> = (In: i) => o

export type inferMorph<inDef, morph, $> = morph extends Morph
    ? (In: asIn<inferDefinition<inDef, $>>) => inferMorphOut<ReturnType<morph>>
    : never

type inferMorphOut<out> = [out] extends [CheckResult<infer t>]
    ? t
    : Exclude<out, Problem>

export const writeMalformedMorphExpressionMessage = (value: unknown) =>
    `Morph expression requires a function following '|>' (was ${typeof value})`
