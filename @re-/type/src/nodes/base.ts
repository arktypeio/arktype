import type { parseContext, ParseOptions } from "../parser/common.js"
import type { Space } from "../space.js"
import { References } from "./traverse/exports.js"
import type { Check, Generate } from "./traverse/exports.js"

export namespace Base {
    export type context = parseContext

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

        abstract check(args: Check.CheckArgs): void
        abstract generate(args: Generate.GenerateArgs): unknown
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

    export type InferenceContext = {
        Dict: unknown
        Meta: ParseOptions
        Seen: Record<string, true>
    }

    export namespace InferenceContext {
        export type From<Ctx extends InferenceContext> = Ctx

        export type FromSpace<S extends Space> = From<{
            Dict: S["Dict"]
            Meta: S["Meta"]
            Seen: {}
        }>
    }
}
