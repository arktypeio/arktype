import { ElementOf } from "@re-/tools"
import { Parsing } from "../features/parsing.js"
import { References } from "../features/references.js"
import { Node } from "./node.js"

export abstract class Branch<
    DefType,
    Children extends Parsing.Node[] = Parsing.Node[]
> extends Node<DefType> {
    private cache?: Children

    constructor(def: DefType, ctx: Parsing.Context) {
        super(def, ctx)
        if (ctx.cfg.parse?.eager) {
            this.cache = this.parse()
        }
    }

    children() {
        if (!this.cache) {
            this.cache = this.parse()
        }
        return this.cache
    }

    firstChild() {
        return this.children()[0] as ElementOf<Children>
    }

    references(args: References.Args): string[] {
        const result: string[] = []
        for (const childNode of this.children()) {
            for (const reference of childNode.references(args)) {
                if (!result.includes(reference)) {
                    result.push(reference)
                }
            }
        }
        return result
    }

    abstract parse(): Children
}
