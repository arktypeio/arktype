import type { BoundableNode, BoundConstraint } from "../constraints/bounds.js"
import { ConstraintGenerationError } from "../constraints/constraint.js"
import { checkObjectRoot } from "../structs/struct.js"
import type { Check } from "../traverse/exports.js"
import type { UnaryConstructorArgs } from "./unary.js"
import { UnaryNode } from "./unary.js"

export class ArrayNode extends UnaryNode implements BoundableNode {
    bounds: BoundConstraint | null = null

    constructor(...args: UnaryConstructorArgs) {
        super("[]", ...args)
    }

    check(state: Check.CheckState) {
        if (!checkObjectRoot(this.definition, "array", state)) {
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
        this.bounds?.check(state)
    }

    generate() {
        if (this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return []
    }
}
