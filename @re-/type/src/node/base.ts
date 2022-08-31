import type { MetaDefinitions, Space, SpaceMeta } from "../space.js"
import type { TypeOptions } from "../type.js"
import { Allows, Create, References } from "./traversal/index.js"

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

export const throwParseError = (message: string) => {
    throw new parseError(message)
}

export const ctxToString = (ctx: context) =>
    ctx.path.length ? ` at path ${ctx.path.join("/")}` : ""

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

    addAllowsError<Code extends Allows.ErrorCode>(
        args: Allows.Args,
        code: Code,
        context: Allows.SupplementalErrorContext<Code>
    ) {
        args.errors.push({
            code,
            path: args.ctx.path,
            type: this.toString(),
            tree: this.tree,
            value: args.value,
            ...context
        })
    }

    addUnassignable(args: Allows.Args) {
        this.addAllowsError(args, "Unassignable", {
            message: `${Allows.stringifyValue(
                args.value
            )} is not assignable to ${this.toString()}.`
        })
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
