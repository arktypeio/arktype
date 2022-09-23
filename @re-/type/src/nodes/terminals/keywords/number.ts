import { Allows } from "../../allows.js"
import type {
    BoundableNode,
    BoundConstraint
} from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NumberNode extends TerminalNode implements BoundableNode {
    bounds: BoundConstraint | undefined = undefined

    check(args: Allows.Args) {
        if (!Allows.dataIsOfType(args, "number")) {
            if (this.definition === "number") {
                addTypeKeywordDiagnostic(args, "number", "Must be a number")
            } else {
                addTypeKeywordDiagnostic(
                    args,
                    "integer",
                    "Must be a number",
                    "number"
                )
            }

            return
        }
        if (this.definition === "integer" && !Number.isInteger(args.data)) {
            args.diagnostics.add("numberSubtype", args, {
                definition: "integer",
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

export type NumberSubtypeKeyword = Exclude<NumberKeyword, "number">

export type NumberSubtypeDiagnostic = Allows.DefineDiagnostic<
    "numberSubtype",
    {
        definition: NumberSubtypeKeyword
        data: number
    }
>
