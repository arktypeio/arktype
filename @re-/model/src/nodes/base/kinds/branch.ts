import { ElementOf } from "@re-/tools"
import { Parsing } from "../features/parsing.js"
import { References } from "../features/references.js"
import { Node } from "./node.js"

export type ChildList = Parsing.Node[]

export abstract class Branch<
    DefType,
    Children extends ChildList = ChildList
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

    references(args: References.Options) {
        const result: string[] = []
        for (const valueNode of Object.values(this.children())) {
            result.push(...valueNode.references(args))
        }
        return result
    }

    abstract parse(): Children
}
