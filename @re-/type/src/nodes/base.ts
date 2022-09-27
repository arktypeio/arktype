import type { KeySet } from "@re-/tools"
import type { parserContext } from "../parser/common.js"
import type { Check, References } from "./traverse/exports.js"
import type { TraversalState } from "./traverse/traverse.js"

export namespace Base {
    export type context = parserContext

    export type Input = [node: node, mapper: (data: unknown) => unknown]

    export type ConstructorArgs<Def = unknown, Ast = unknown> = [
        def: Def,
        ast: Ast,
        ctx: context
    ]

    export type RootDefinition = string | object

    export abstract class node<
        Definition extends RootDefinition = RootDefinition,
        Ast = unknown
    > {
        input?: Input

        constructor(
            public def: Definition,
            public ast: Ast,
            public ctx: context
        ) {}

        abstract check(state: Check.CheckState): void
        abstract generate(state: TraversalState): unknown
        /** Mutates collected by adding references as keys */
        abstract collectReferences(
            opts: References.ReferencesOptions,
            collected: KeySet
        ): void

        abstract toString(): string

        // TODO: Standardize on "children" prop? (subclasses could still have convenience accessors)
        references(opts: References.ReferencesOptions): string[] {
            const collected = {}
            this.collectReferences(opts, collected)
            return Object.keys(collected)
        }
    }
}
