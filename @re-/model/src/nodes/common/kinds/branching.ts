import { ParseContext } from "../common.js"
import { Node } from "./base.js"

export abstract class Branching<DefType> extends Node<DefType> {
    #brancher: Generator<Node<unknown>, Node<unknown>>
    #cache: Node<unknown>[] = []
    #doneIndex: number | undefined

    constructor(def: DefType, ctx: ParseContext) {
        super(def, ctx)
        this.#brancher = this.parse()
        if (ctx.eager) {
            for (const child of this.#brancher) {
                this.#cache.push(child)
            }
        }
    }

    *branches() {
        let i = 0
        while (!this.#doneIndex || i < this.#doneIndex) {
            if (!(i in this.#cache)) {
                const next = this.#brancher.next()
                this.#cache[i] = next.value
                if (next.done) {
                    this.#doneIndex = i
                    return this.#cache[i]
                }
            }
            yield this.#cache[i]
            i++
        }
        return this.#cache[i]
    }

    branch(i: number) {
        while (!(i in this.#cache)) {
            this.#cache.push(this.#brancher.next().value)
        }
        return this.#cache[i]
    }

    abstract parse(): Generator<Node<unknown>>
}
