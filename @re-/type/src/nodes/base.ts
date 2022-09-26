import type { parserContext } from "../parser/common.js"
import { References } from "./traverse/exports.js"
import type { Check } from "./traverse/exports.js"
import type { TraversalState } from "./traverse/traverse.js"

export namespace Base {
    export type context = parserContext

    export type Input = [node: node, mapper: (data: unknown) => unknown]

    export type ConstructorArgs<Definition = unknown, Ast = unknown> = [
        definition: Definition,
        ast: Ast,
        context: context
    ]

    export type RootDefinition = string | object

    export abstract class node<
        Definition extends RootDefinition = RootDefinition,
        Ast = unknown
    > {
        input?: Input

        constructor(
            public definition: Definition,
            public ast: Ast,
            public context: context
        ) {}

        abstract check(state: Check.CheckState): void
        abstract generate(state: TraversalState): unknown
        /** Mutates collected by adding references as keys */
        abstract collectReferences(
            opts: References.ReferencesOptions,
            collected: References.ReferenceCollection
        ): void

        references(
            opts: References.ReferencesOptions<string, boolean>
        ): string[] | References.StructuredReferences {
            const collected = References.createCollection()
            this.collectReferences(opts, collected)
            return Object.keys(collected)
        }
    }
}
