import type { parseContext, ParseOptions } from "../parser/common.js"
import type { Space } from "../space.js"
import type { Allows } from "./allows.js"
import type { Generate } from "./generate.js"
import type { References } from "./references.js"

export namespace Base {
    export type context = parseContext

    export type Input = [node: node, mapper: (data: unknown) => unknown]

    export abstract class node {
        input?: Input

        abstract check(args: Allows.Args): void
        abstract generate(args: Generate.Args): unknown
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
