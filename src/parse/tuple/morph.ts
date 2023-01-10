import { throwParseError } from "../../utils/errors.ts"
import type { List } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { TupleExpressionParser } from "./tuple.ts"
import type { distributable } from "./utils.ts"
import { entriesOfDistributableFunction } from "./utils.ts"

export const parseMorphTuple: TupleExpressionParser<"=>"> = (def, $) => {
    if (def.length !== 4) {
        return throwParseError(buildMalformedMorphExpressionMessage(def))
    }
    const inputNode = parseDefinition(def[0], $)
    const outputNode = parseDefinition(def[2], $)
    const distributedMorphEntries = entriesOfDistributableFunction(
        def[3] as distributable<Morph>,
        inputNode,
        $
    )
    return outputNode
}

export type validateMorphTuple<inputDef, $> = [
    validateDefinition<inputDef, $>,
    "=>",
    distributable<Morph<inferDefinition<inputDef, $>, unknown>>
]

const buildMalformedMorphExpressionMessage = (def: List) =>
    `Morph tuple expression must be structured as follows: [inDef, "=>", (In: inDef) => Out ] (got ${JSON.stringify(
        def
    )})`

export type Morph<In = unknown, Out = unknown> = (In: In) => Out

export type MorphBuilder<$ = {}> = <
    inputDef,
    morph extends Morph<inferDefinition<inputDef, $>>
>(
    inputDef: validateDefinition<inputDef, $>,
    morph: morph
) => [inputDef, "=>", morph]

export const morph: MorphBuilder = (inputDef, morph) => [
    inputDef as any,
    "=>",
    morph
]
