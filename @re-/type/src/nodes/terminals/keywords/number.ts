import { Allows } from "../../allows.js"
import type {
    BoundableNode,
    BoundsConstraint
} from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import type { TerminalConstructorArgs } from "../terminal.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class NumberNode extends TerminalNode implements BoundableNode {
    bounds: BoundsConstraint | undefined = undefined

    constructor(
        private numericConstraints: numericConstraint[],
        ...args: TerminalConstructorArgs
    ) {
        super(...args)
    }

    check(args: Allows.Args) {
        if (typeof args.data !== "number") {
            args.diagnostics.push(new KeywordDiagnostic("number", args))
            return
        }
        for (const { allows, description } of this.numericConstraints) {
            if (!allows(args.data)) {
                args.diagnostics.push(
                    new NumberSubtypeDiagnostic(args, description)
                )
            }
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

export class NumberSubtypeDiagnostic extends Allows.Diagnostic<"NumberSubtype"> {
    message

    constructor(args: Allows.Args, public description: string) {
        super("NumberSubtype", args)
        this.message = `'${this.data}' must ${description}.`
    }
}
