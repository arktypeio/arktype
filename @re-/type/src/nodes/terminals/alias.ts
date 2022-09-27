import type { Check, Generate } from "../traverse/exports.js"
import { TerminalNode } from "./terminal.js"

export class Alias extends TerminalNode {
    get resolution() {
        return this.ctx.space!.resolutions[this.def]
    }

    typecheck(state: Check.CheckState) {
        return this.resolution.check(state)
    }

    generate(state: Generate.GenerateState) {
        return this.resolution.generate(state)
    }
}
