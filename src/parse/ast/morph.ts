import type { CheckResult, TraversalState } from "../../compile/traverse.js"
import type { Problem } from "../../main.js"
import type { extractIn } from "../../type.js"
import { throwParseError } from "../../../dev/utils/errors.js"
import type { inferDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { PostfixParser } from "./tuple.js"

export const parseMorphTuple: PostfixParser<"|>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedMorphExpressionMessage(def[2]))
    }
    return parseDefinition(def[0], ctx).constrain("morph", def[2] as Morph)
}

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type parseMorph<inDef, morph, $> = morph extends Morph
    ? (
          In: extractIn<inferDefinition<inDef, $>>
      ) => Out<inferMorphOut<ReturnType<morph>>>
    : never

export type MorphAst<i = any, o = unknown> = (In: i) => Out<o>

export type Out<o = unknown> = ["|>", o]

export type inferMorphOut<out> = [out] extends [CheckResult<infer t>]
    ? t
    : Exclude<out, Problem>

export const writeMalformedMorphExpressionMessage = (value: unknown) =>
    `Morph expression requires a function following '|>' (was ${typeof value})`
