import type { Check } from "../traverse/exports.js"
import { UnaryNode } from "./unary.js"

export class OptionalNode extends UnaryNode<"?"> {
    readonly token = "?"

    check(state: Check.CheckState) {
        if (state.data === undefined) {
            return
        }
        this.child.check(state)
    }

    generate() {
        return undefined
    }
}
