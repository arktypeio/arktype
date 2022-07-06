import { Parsing } from "../features/parsing.js"
import { Node } from "./node.js"

export abstract class NonTerminal<DefType, ParseResult> extends Node<DefType> {
    private cache?: ParseResult

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

    abstract parse(): ParseResult
}
