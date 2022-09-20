import type { Allows } from "../../allows.js"
import { Generate } from "../../generate.js"
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
    check(args: Allows.Args) {
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
