import type { Check } from "../traverse/exports.js"
import { Terminal } from "./terminal.js"

export class Alias extends Terminal.Node {
    get resolution() {
        return this.ctx.space!.resolutions[this.toIsomorphicDef]
    }

    check(state: Check.CheckState) {
        return this.resolution.check(state)
    }
}
