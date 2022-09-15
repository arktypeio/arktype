import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { Allows } from "../../../traversal/allows.js"
import { terminalNode } from "../terminal.js"

export type NumberSubtypeKeyword = "integer"

export class numberNode extends terminalNode implements boundableNode {
    bounds: bounds | undefined = undefined

    constructor(private subtype?: NumberSubtypeKeyword) {
        super()
    }

    toString() {
        return this.subtype ?? "number"
    }

    check(args: Allows.Args) {
        if (typeof args.data !== "number") {
            return false
        }
        if (this.subtype === "integer" && !Number.isInteger(args.data)) {
            return false
        }
        return true
    }

    create() {
        return 0
    }
}

export const numberKeywords: Record<
    "number" | NumberSubtypeKeyword,
    numberNode
> = {
    number: new numberNode(),
    integer: new numberNode("integer")
}

export type NumberKeyword = keyof typeof numberKeywords
