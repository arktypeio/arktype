import type { MetaDefinitions, Space, SpaceMeta } from "../space.js"
import type { TypeOptions } from "../type.js"
import { stringifyValue } from "../utils.js"
import type { Allows, Create, References } from "./traversal/index.js"

export type context = TypeOptions & {
    path: string[]
    space?: SpaceMeta
}

// Space is passed through an internal-only param, so we add
// it to the provided options to create a context.
export const initializeContext = (
    options: TypeOptions,
    space: SpaceMeta | undefined
) => {
    const context = options as context
    context.path = []
    context.space = space
    return context
}

export type parseFn<DefType = unknown> = (def: DefType, ctx: context) => base

export class parseError extends Error {}

export type ParseError<Message extends string> = `!${Message}`

export abstract class base {
    abstract allows(args: Allows.Args): boolean
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

    addUnassignable(args: Allows.Args) {
        args.errors.add(
            args.ctx.path,
            `${stringifyValue(
                args.value
            )} is not assignable to ${this.toString()}.`
        )
    }
}

export type InferenceContext = {
    Resolutions: unknown
    Meta: MetaDefinitions
    Seen: Record<string, true>
}

export namespace InferenceContext {
    export type From<Ctx extends InferenceContext> = Ctx

    export type FromSpace<S extends Space> = From<{
        Resolutions: S["Resolutions"]
        Meta: S["Meta"]
        Seen: {}
    }>
}
