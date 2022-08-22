import type { ObjNode } from "../base/obj/index.js"
import type { MetaDefinitions, Space, SpaceMeta } from "../space.js"
import type { Type, TypeOptions } from "../type.js"
import type { Allows, Create, References } from "./methods/index.js"
import { stringifyValue } from "./utils.js"

export abstract class Base {
    abstract allows(args: Allows.Args): boolean
    abstract create(args: Create.Args): unknown
    /** Mutates collected by adding references as keys */
    abstract collectReferences(
        opts: References.Options,
        collected: References.Collection
    ): void
    abstract toString(): string

    references(opts: References.Options<string, boolean>) {
        if (opts.preserveStructure && this.isObj()) {
            return this.structureReferences(opts)
        }
        const collected = {}
        this.collectReferences(opts, collected)
        return Object.keys(collected)
    }

    isObj(): this is ObjNode {
        return "structureReferences" in this
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

export type ParseFn<DefType = unknown> = (def: DefType, ctx: Context) => Base

export class ParseError extends Error {}

export type Throw<Message extends string> = `!${Message}`

export type { Throw as Catch }

export type Context = TypeOptions & {
    space?: SpaceMeta
}

// Space is passed through an internal-only param, so we add
// it to the provided options to create a context.
export const initializeContext = (
    options: Context,
    space: SpaceMeta | undefined
) => {
    options.space = space
    return options
}
