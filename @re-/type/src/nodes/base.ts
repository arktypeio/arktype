import type { parseContext, ParseOptions } from "../parser/common.js"
import type { Space } from "../space.js"
import type { Allows } from "./allows.js"
import type { Generate } from "./generate.js"
import { References } from "./references.js"

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

        abstract check(args: Allows.Args): void
        abstract generate(args: Generate.Args): unknown
        /** Mutates collected by adding references as keys */
        abstract collectReferences(
            opts: References.Options,
            collected: References.Collection
        ): void

        references(opts: References.Options<string, boolean>) {
            return References.collect(this, opts)
        }

        definitionIsKeyOf<Obj extends Record<string, unknown>>(
            obj: Obj
        ): this is node<Extract<keyof Obj, string>> {
            return this.definition in obj
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
