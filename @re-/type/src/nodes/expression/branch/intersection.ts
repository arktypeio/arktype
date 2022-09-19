import type { Allows } from "../../allows.js"
import type { strNode } from "../../common.js"
import { Create } from "../../create.js"
import type { Branch } from "./branch.js"
import { branch } from "./branch.js"

export type Intersection<Left = unknown, Right = unknown> = Branch<
    Left,
    Right,
    "&"
>

export class intersection extends branch {
    addMember(node: strNode) {
        this.children.push(node)
    }

    token = "&" as const

    check(args: Allows.Args) {
        for (const branch of this.children) {
            branch.check(args)
        }
    }

    create() {
        throw new Create.UngeneratableError(
            this.toString(),
            "Intersection generation is unsupported."
        )
    }
}
