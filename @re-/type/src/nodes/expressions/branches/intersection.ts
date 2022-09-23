import { Generate } from "../../traverse/exports.js"
import type { Check } from "../../traverse/exports.js"
import type { Branch, BranchConstructorArgs } from "./branch.js"
import { branch } from "./branch.js"

export type Intersection<Left = unknown, Right = unknown> = Branch<
    Left,
    Right,
    "&"
>

export class intersection extends branch {
    constructor(...args: BranchConstructorArgs) {
        super("&", ...args)
    }
    check(args: Check.CheckArgs) {
        for (const branch of this.children) {
            branch.check(args)
        }
    }

    generate() {
        throw new Generate.UngeneratableError(
            this.toString(),
            "Intersection generation is unsupported."
        )
    }
}
