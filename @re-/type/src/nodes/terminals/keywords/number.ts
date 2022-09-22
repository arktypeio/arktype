import type { Allows } from "../../allows.js"
import type {
    BoundableNode,
    BoundConstraint
} from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import { TerminalNode } from "../terminal.js"

export class NumberNode extends TerminalNode implements BoundableNode {
    bounds: BoundConstraint | undefined = undefined

    check(args: Allows.Args) {
        if (typeof args.data !== "number") {
            args.diagnostics.add("keyword", args, {
                definition: "number",
                data: args.data,
                reason: "Must be a number"
            })
            return
        }
        if (this.definition === "integer" && !Number.isInteger(args.data)) {
            args.diagnostics.add("keyword", args, {
                definition: "integer",
                parentKeyword: "number",
                data: args.data,
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

export const numberKeywords = {
    number: NumberNode,
    integer: NumberNode
}

export type NumberKeyword = keyof typeof numberKeywords
