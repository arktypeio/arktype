import { Generate } from "../traverse/exports.js"
import type { Check } from "../traverse/exports.js"
import type { BranchAst, BranchConstructorArgs } from "./branch.js"
import { BranchNode } from "./branch.js"

export type IntersectionAst<Left = unknown, Right = unknown> = BranchAst<
    Left,
    Right,
    "&"
>

export class IntersectionNode extends BranchNode {
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
