import type { Base } from "../base.js"
import type { Check, Generate } from "../traverse/exports.js"
import { TerminalNode } from "./terminal.js"

export class Alias extends TerminalNode {
    static matches(def: string, context: Base.context) {
        return !!context.space && def in context.space.definitions
    }

    toString() {
        return this.definition
    }

    get resolution() {
        return this.context.space!.resolutions[this.definition]
    }

    check(state: Check.CheckState) {
        return this.resolution.check(state)
    }

    generate(state: Generate.GenerateState) {
        return this.resolution.generate(state)
    }
}
