import { strNode } from "../../../../../parser/common.js"
import { Allows } from "../../../../traversal/allows.js"
import { Create } from "../../../../traversal/create.js"
import { Branch, branch } from "./branch.js"

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

    allows(args: Allows.Args) {
        for (const branch of this.children) {
            if (!branch.allows(args)) {
                return false
            }
        }
        return true
    }

    create() {
        throw new Create.UngeneratableError(
            this.toString(),
            "Intersection generation is unsupported."
        )
    }
}
