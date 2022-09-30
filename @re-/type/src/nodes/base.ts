import type { KeySet } from "@re-/tools"
import type { parserContext } from "../parser/common.js"
import type { Check, References } from "./traverse/exports.js"

export namespace Base {
    export type context = parserContext

    export type Input = [node: node, mapper: (data: unknown) => unknown]

    export abstract class node {
        input?: Input

        abstract check(state: Check.CheckState): void
        /** Mutates collected by adding references as keys */
        abstract collectReferences(
            opts: References.ReferencesOptions,
            collected: KeySet
        ): void

        abstract toAst(): unknown
        abstract toIsomorphicDef(): unknown
        abstract toString(): string

        references(opts: References.ReferencesOptions): string[] {
            const collected = {}
            this.collectReferences(opts, collected)
            return Object.keys(collected)
        }
    }
}
