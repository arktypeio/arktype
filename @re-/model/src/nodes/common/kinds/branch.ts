import { ParseContext } from "../common.js"
import { Base } from "./base.js"

export abstract class Branch<
    DefType,
    Next = Base<unknown>
> extends Base<DefType> {
    private cache?: Next

    constructor(def: DefType, ctx: ParseContext) {
        super(def, ctx)
        if (ctx.eager) {
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
