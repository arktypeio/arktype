import type { Allows } from "../../allows.js"
import type {
    BoundableNode,
    BoundsConstraint
} from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import { TerminalNode } from "../terminal.js"

export class NumberNode extends TerminalNode implements BoundableNode {
    bounds: BoundsConstraint | undefined = undefined

    check(args: Allows.Args) {
        if (typeof args.data !== "number") {
            args.diagnostics.add("keyword", "number", args, {
                reason: "Must be a number"
            })
            return
        }
        if (this.definition === "integer" && Number.isInteger(args.data)) {
            args.diagnostics.add("keyword", "integer", args, {
                base: "number",
                reason: "Must be an integer"
            })
        }
        this.bounds?.check(args as Allows.Args<number>)
    }

    generate() {
        if (this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return 0
    }
}

export type numericConstraint = {
    allows: (data: number) => boolean
    description: string
}

export const numberKeywords = {
    number: NumberNode,
    integer: NumberNode
}

export type NumberKeyword = keyof typeof numberKeywords
