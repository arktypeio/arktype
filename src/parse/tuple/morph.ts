import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { TupleExpressionParser } from "./tuple.ts"
import type { distributable } from "./utils.ts"
import { distributeFunctionToNode } from "./utils.ts"

export const parseMorphTuple: TupleExpressionParser<"=>"> = (def, $) => {
    const inputNode = parseDefinition(def[0], $)
    const distributedMorphEntries = distributeFunctionToNode(
        def[2] as distributable<Morph>,
        inputNode,
        $
    )
    return {
        input: inputNode,
        morph: distributedMorphEntries
    }
}

export type validateMorphTuple<inputDef, $> = [
    validateDefinition<inputDef, $>,
    "=>",
    distributable<Morph<inferDefinition<inputDef, $>, unknown>>
]

export type Morph<In = any, Out = unknown> = (In: In) => Out
