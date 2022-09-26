import { Generate } from "../traverse/exports.js"
import type { Check } from "../traverse/exports.js"
import type { BranchConstructorArgs } from "./branch.js"
import { NaryNode } from "./branch.js"

export class IntersectionNode extends NaryNode {
    constructor(...args: BranchConstructorArgs) {
        super("&", ...args)
    }
    check(state: Check.CheckState) {
        for (const branch of this.children) {
            branch.check(state)
        }
    }

    generate() {
        throw new Generate.UngeneratableError(
            this.toString(),
            "Intersection generation is unsupported."
        )
    }
}
