import type { StructuredNonTerminal } from "../obj/index.js"
import type { Create, References, Validate } from "./base.js"
import { stringifyValue } from "./utils.js"

export abstract class Node {
    abstract allows(args: Validate.Args): boolean
    abstract generate(args: Create.Args): unknown
    /** Mutates collected by adding references as keys */
    abstract collectReferences(
        opts: References.Options,
        collected: References.Collection
    ): void
    abstract toString(): string

    references(opts: References.Options<string, boolean>) {
        if (opts.preserveStructure && this.isStructured()) {
            return this.structureReferences(opts)
        }
        const collected = {}
        this.collectReferences(opts, collected)
        return Object.keys(collected)
    }

    isStructured(): this is StructuredNonTerminal {
        return "structureReferences" in this
    }

    addUnassignable(args: Validate.Args) {
        args.errors.add(
            args.ctx.path,
            `${stringifyValue(
                args.value
            )} is not assignable to ${this.toString()}.`
        )
    }
}
