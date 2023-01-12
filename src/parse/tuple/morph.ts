import { throwParseError } from "../../utils/errors.ts"
import type { nominal } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { TupleExpressionParser } from "./tuple.ts"

export const parseMorphTuple: TupleExpressionParser<"=>"> = (def, $) => {
    const inputNode = parseDefinition(def[0], $)
    if (typeof def[2] !== "function") {
        return throwParseError(buildMalformedMorphExpressionMessage(def[2]))
    }
    return {
        input: inputNode,
        morph: def[2] as Morph
    }
}

export type validateMorphTuple<inputDef, $> = [
    validateDefinition<inputDef, $>,
    "=>",
    Morph<inferDefinition<inputDef, $>, unknown>
]

export type Morph<In = any, Out = unknown> = (In: In) => Out

export const buildMalformedMorphExpressionMessage = (value: unknown) =>
    `Morph expression requires a function following '=>' (got ${typeof value} at index 2)`
