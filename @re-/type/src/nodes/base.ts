import type { MetaDefinitions, Space, SpaceMeta } from "../space.js"
import type { TypeOptions } from "../type.js"
import { Allows } from "./traversal/allows.js"
import { Create } from "./traversal/create.js"
import { References } from "./traversal/references.js"

export namespace Base {
    export type context = TypeOptions & {
        path: string[]
        space?: SpaceMeta
    }

    // Space is passed through an internal-only param, so we add
    // it to the provided options to create a context.
    export const initializeContext = (
        options: TypeOptions,
        space: SpaceMeta | undefined
    ) => ({
        ...options,
        space,
        path: []
    })

    export type parseFn<DefType = unknown> = (
        def: DefType,
        ctx: context
    ) => node

    export class parseError extends Error {}

    export const throwParseError = (message: string) => {
        throw new parseError(message)
    }

    export const ctxToString = (ctx: context) =>
        ctx.path.length ? ` at path ${ctx.path.join("/")}` : ""

    export type ParseError<Message extends string> = `!${Message}`

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
        Meta: MetaDefinitions
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
