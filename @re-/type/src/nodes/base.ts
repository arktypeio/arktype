import type { ParseOptions } from "../parser/common.js"
import type { Space } from "../space.js"
import { Allows } from "./allows.js"
import { Create } from "./create.js"
import { References } from "./references.js"

export namespace Base {
    export abstract class node {
        abstract check(args: Allows.Args): void
        abstract create(args: Create.Args): unknown
        /** Mutates collected by adding references as keys */
        abstract collectReferences(
            opts: References.Options,
            collected: References.Collection
        ): void
        abstract get tree(): unknown
        abstract toString(): string

        references(
            opts: References.Options<string, boolean>
        ): string[] | References.StructuredReferences {
            const collected = {}
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
