import type { Space, SpaceMeta } from "../space.js"
import type { TypeOptions } from "../type.js"
import { stringifyValue } from "../utils.js"
import type { Allows, Create, References } from "./traversal/index.js"

export type context = TypeOptions & {
    space?: SpaceMeta
}

// Space is passed through an internal-only param, so we add
// it to the provided options to create a context.
export const initializeContext = (
    options: context,
    space: SpaceMeta | undefined
) => {
    options.space = space
    return options
}

export type parseFn<DefType = unknown> = (def: DefType, ctx: context) => base

export class parseError extends Error {}

export type ParseError<Message extends string> = `!${Message}`

export type ParseTree = string | ParseTree[] | { [K in string]: ParseTree }

export abstract class base {
    abstract allows(args: Allows.Args): boolean
    abstract create(args: Create.Args): unknown
    /** Mutates collected by adding references as keys */
    abstract collectReferences(
        opts: References.Options,
        collected: References.Collection
    ): void
    abstract get tree(): ParseTree
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
    Space: Space
    Seen: Record<string, true>
}

export namespace InferenceContext {
    export type From<Ctx extends InferenceContext> = Ctx
}
