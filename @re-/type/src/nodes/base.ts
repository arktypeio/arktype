import type { KeySet } from "@re-/tools"
import type { parserContext } from "../parser/common.js"
import type { Check, References } from "./traverse/exports.js"
import type { TraversalState } from "./traverse/traverse.js"

export namespace Base {
    export type context = parserContext

    export type Input = [node: node, mapper: (data: unknown) => unknown]

    export type UnknownDefinition = string | object

    export type UnknownAst = string | number | object

    export abstract class node {
        input?: Input

        abstract check(state: Check.CheckState): void
        abstract generate(state: TraversalState): unknown
        /** Mutates collected by adding references as keys */
        abstract collectReferences(
            opts: References.ReferencesOptions,
            collected: KeySet
        ): void

        abstract toAst(): UnknownAst
        abstract toIsomorphicDef(): UnknownDefinition
        abstract toString(): string

        references(opts: References.ReferencesOptions): string[] {
            const collected = {}
            this.collectReferences(opts, collected)
            return Object.keys(collected)
        }
    }
}
