import { throwParseError } from "../../utils/errors.js"
import type { Dict, List } from "../../utils/generics.js"
import type {
    inferDefinition,
    InferenceContext,
    validateDefinition
} from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { TupleExpressionParser } from "./tuple.js"
import type { distributable } from "./utils.js"
import { entriesOfDistributableFunction } from "./utils.js"

export const parseMorphTuple: TupleExpressionParser<"=>"> = (def, scope) => {
    if (def.length !== 4) {
        return throwParseError(buildMalformedMorphExpressionMessage(def))
    }
    const inputNode = parseDefinition(def[0], scope)
    const outputNode = parseDefinition(def[2], scope)
    const distributedMorphEntries = entriesOfDistributableFunction(
        def[3] as distributable<Morph>,
        inputNode,
        scope
    )
    return outputNode
}

export type validateMorphTuple<
    inputDef,
    outputDef,
    c extends InferenceContext
> = [
    validateDefinition<inputDef, c>,
    "=>",
    validateDefinition<outputDef, c>,
    // TODO: Nested morphs. Should input be recursive? It would've already been transformed.
    distributable<
        Morph<inferDefinition<inputDef, c>, inferDefinition<outputDef, c>>
    >
]

const buildMalformedMorphExpressionMessage = (def: List) =>
    `Morph tuple expression must be structured as follows: [inDef, "=>", outDef, (In: inDef) => outDef ] (got ${JSON.stringify(
        def
    )})`

export type Morph<In = unknown, Out = unknown> = (In: In) => Out

export type InferMorph<inputDef, outputDef, scope extends Dict> = Morph<
    inferDefinition<inputDef, { scope: scope }>,
    inferDefinition<outputDef, { scope: scope }>
>

export type MorphBuilder<scope extends Dict = {}> = <
    inputDef,
    outputDef,
    // TODO: update IO
    morph extends InferMorph<inputDef, outputDef, scope>
>(
    inputDef: validateDefinition<inputDef, { scope: scope }>,
    outputDef: validateDefinition<outputDef, { scope: scope }>,
    morph: morph
) => [inputDef, "=>", outputDef, morph]

export const morph: MorphBuilder = (inputDef, outputDef, morph) => [
    inputDef as any,
    "=>",
    outputDef as any,
    morph
]
