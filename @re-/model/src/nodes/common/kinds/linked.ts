import { ParseContext } from "../common.js"
import { Node } from "./base.js"

export abstract class Linked<
    DefType,
    Next = Node<unknown>
> extends Node<DefType> {
    #cache?: Next

    constructor(def: DefType, ctx: ParseContext) {
        super(def, ctx)
        if (ctx.eager) {
            this.#cache = this.parse()
        }
    }

    next() {
        if (!this.#cache) {
            this.#cache = this.parse()
        }
        return this.#cache
    }

    abstract parse(): Next
}
