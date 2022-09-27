import { checkObjectRoot } from "../structs/struct.js"
import type { Check } from "../traverse/exports.js"
import { UnaryNode } from "./unary.js"

export class ArrayNode extends UnaryNode<"[]", "bounds"> {
    readonly token = "[]"

    protected typecheck(state: Check.CheckState) {
        if (!checkObjectRoot(this.typeStr(), "array", state)) {
            return
        }
        const rootData = state.data
        for (let i = 0; i < rootData.length; i++) {
            state.path.push(i)
            state.data = rootData[i] as any
            this.child.check(state)
            state.path.pop()
        }
        state.data = rootData
    }

    generate() {
        return []
    }
}
