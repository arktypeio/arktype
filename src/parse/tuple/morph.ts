import { throwParseError } from "../../utils/errors.js"
import type { Dict, List } from "../../utils/generics.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
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
    scope extends Dict,
    input extends boolean
> = [
    validateDefinition<inputDef, scope, true>,
    "=>",
    validateDefinition<outputDef, scope, input>,
    // TODO: Nested morphs. Should input be recursive? It would've already been transformed.
    distributable<
        Morph<
            inferDefinition<inputDef, scope, scope, true>,
            inferDefinition<outputDef, scope, scope, input>
        >
    >
]

const buildMalformedMorphExpressionMessage = (def: List) =>
    `Morph tuple expression must be structured as follows: [inDef, "=>", outDef, (In: inDef) => outDef ] (got ${JSON.stringify(
        def
    )})`

export type Morph<In = unknown, Out = unknown> = (In: In) => Out

export type MorphBuilder<scope extends Dict = {}> = <
    inputDef,
    outputDef,
    // TODO: update IO
    morph extends Morph<
        inferDefinition<inputDef, scope, scope, false>,
        inferDefinition<outputDef, scope, scope, false>
    >
>(
    inputDef: validateDefinition<inputDef, scope, false>,
    outputDef: validateDefinition<inputDef, scope, false>,
    morph: morph
) => [inputDef, "=>", outputDef, morph]

export const morph: MorphBuilder = (inputDef, outputDef, morph) => [
    inputDef as any,
    "=>",
    outputDef as any,
    morph
]
