import { Allows } from "../../../allows.js"
import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../../constraints/common.js"
import { terminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class numberNode extends terminalNode implements boundableNode {
    bounds: bounds | undefined = undefined

    constructor(
        private definition: string,
        private numericConstraints: numericConstraint[]
    ) {
        super()
    }

    toString() {
        return this.bounds
            ? this.bounds.boundString(this.definition)
            : this.definition
    }

    override get tree() {
        return this.bounds
            ? this.bounds.boundTree(this.definition)
            : this.definition
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

    create() {
        if (this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return 0
    }
}

export class numberKeywordNode extends numberNode {
    constructor() {
        super("number", [])
    }
}

export class integerKeywordNode extends numberNode {
    constructor() {
        super("integer", [
            {
                allows: (data) => Number.isInteger(data),
                description: "must be an integer"
            }
        ])
    }
}

export type numericConstraint = {
    allows: (data: number) => boolean
    description: string
}

export const numberKeywords = {
    number: numberKeywordNode,
    integer: integerKeywordNode
}

export type NumberKeyword = keyof typeof numberKeywords

export class NumberSubtypeDiagnostic extends Allows.Diagnostic<"NumberSubtype"> {
    message

    constructor(args: Allows.Args, public description: string) {
        super("NumberSubtype", args)
        this.message = `'${this.data}' must ${description}.`
    }
}
