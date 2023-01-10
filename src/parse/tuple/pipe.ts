import type { TypeRoot } from "../../nodes/node.ts"
import { intersection } from "../../nodes/node.ts"
import type { Dict, mutable, NonEmptyList } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { TupleExpressionParser } from "./tuple.ts"
import type { distributable } from "./utils.ts"
import { entriesOfDistributableFunction } from "./utils.ts"

export const parsePipeTuple: TupleExpressionParser<"|>"> = (def, scope) => {
    const inputNode = parseDefinition(def[0], scope)
    const distributedValidatorEntries = entriesOfDistributableFunction(
        def[2] as distributable<Pipe>,
        inputNode,
        scope
    )
    const distributedValidatorNode: mutable<TypeRoot> = {}
    for (const [domain, refinement] of distributedValidatorEntries) {
        distributedValidatorNode[domain] = { refinement }
    }
    return intersection(inputNode, distributedValidatorNode, scope)
}

export type validatePipeTuple<pipedDef, $> = [
    validateDefinition<pipedDef, $>,
    "|>",
    ...NonEmptyList<distributable<Pipe<inferDefinition<pipedDef, $>>>>
]

// TODO: Pipe would only maintain the domains/subdomains. Other rules like bounds/regex would go away
export type Pipe<T = any> = (In: T) => T

export type PipeBuilder<scope extends Dict = {}> = <
    def,
    pipes extends NonEmptyList<
        distributable<Pipe<inferDefinition<def, { scope: scope }>>>
    >
>(
    def: validateDefinition<def, { scope: scope }>,
    ...pipes: pipes
) => [def, "|>", ...pipes]

export const pipe: PipeBuilder = (def, ...pipes) => [def as any, "|>", ...pipes]
