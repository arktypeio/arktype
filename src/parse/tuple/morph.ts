import { domainOf, hasSubdomain } from "../../utils/domains.js"
import { throwParseError } from "../../utils/errors.js"
import type { Dict } from "../../utils/generics.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import { buildMissingRightOperandMessage } from "../string/shift/operand/unenclosed.js"
import type { TupleExpressionParser } from "./tuple.js"
import type { distributable } from "./utils.js"

export const parseMorphTuple: TupleExpressionParser<"=>"> = (def, scope) => {
    if (def[2] === undefined) {
        return throwParseError(buildMissingRightOperandMessage("=>", ""))
    }
    if (!hasSubdomain(def[3], "Function")) {
        return throwParseError(buildMalformedMorphMessage(def[3]))
    }
    const inputNode = parseDefinition(def[0], scope)
    const outputNode = parseDefinition(def[2], scope)
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

export type Morph<In, Out> = (In: In) => Out

const buildMalformedMorphMessage = (actual: unknown) =>
    `Operator "=>" requires a Function at index 3 (got ${domainOf(actual)})`
