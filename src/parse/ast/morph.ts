import type { Problem } from "../../main.js"
import type { CheckResult, TraversalState } from "../../nodes/traverse.js"
import type { extractIn } from "../../type.js"
import { throwParseError } from "../../utils/errors.js"
import type { inferDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { PostfixParser } from "./tuple.js"

export const parseMorphTuple: PostfixParser<"|>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedMorphExpressionMessage(def[2]))
    }
    return parseDefinition(def[0], ctx).constrain(
        "morph",
        def[2] as MorphImplementation
    )
}

export type MorphImplementation<i = any, o = unknown> = (
    In: i,
    state: TraversalState
) => o

export type Out<o = unknown> = ["|>", o]

export type MorphAst<i = any, o = unknown> = (In: i) => Out<o>

export type inferMorph<inDef, morph, $> = morph extends MorphImplementation
    ? (
          In: extractIn<inferDefinition<inDef, $>>
      ) => Out<inferMorphOut<ReturnType<morph>>>
    : never

export type inferMorphOut<out> = [out] extends [CheckResult<infer t>]
    ? t
    : Exclude<out, Problem>

export const writeMalformedMorphExpressionMessage = (value: unknown) =>
    `Morph expression requires a function following '|>' (was ${typeof value})`
