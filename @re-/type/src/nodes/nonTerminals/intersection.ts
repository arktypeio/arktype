import { Generate } from "../traverse/exports.js"
import type { Check } from "../traverse/exports.js"
import { BranchingNode } from "./branching.js"

export class IntersectionNode extends BranchingNode<"&"> {
    readonly token = "&"

    typecheck(state: Check.CheckState) {
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
