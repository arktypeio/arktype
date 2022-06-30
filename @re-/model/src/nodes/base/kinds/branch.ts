import { Parsing } from "../features/parsing.js"
import { Node } from "./base.js"

export abstract class Branch<
    DefType,
    Next = Node<unknown>
> extends Node<DefType> {
    private cache?: Next

    constructor(def: DefType, ctx: Parsing.Context) {
        super(def, ctx)
        if (ctx.cfg.parse?.eager) {
            this.cache = this.parse()
        }
    }

    next() {
        if (!this.cache) {
            this.cache = this.parse()
        }
        return this.cache
    }

    abstract parse(): Next
}
