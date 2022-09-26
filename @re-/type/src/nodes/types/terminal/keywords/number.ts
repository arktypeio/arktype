import { StrNode } from "../../../../parser/common.js"
import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../../constraints/common.js"
import { Allows } from "../../../traversal/allows.js"
import { terminalNode } from "../terminal.js"

/**
 * Even though we are using a dedicated class for modulo constraints,
 * we should try to make it as consistent with this API is possible.
 * An "allows" method and a "description" are both relevant and should
 * be a part of the class.
 *
 * Additionally, as in "bounds", we will need equivalent functions for
 * "boundString" and "boundTree"
 */
export class moduloConstraint {
    constructor(public value: number) {}

    check(args: Allows.Args<number>) {
        if (args.data % this.value !== 0) {
            args.diagnostics.push(
                new Allows.CustomDiagnostic(
                    args,
                    `${args.data} is not divisible by ${this.value}`
                )
            )
        }
    }
}

export class numberNode extends terminalNode implements boundableNode {
    bounds: bounds | undefined = undefined
    /**
     * When parsing something like:
     *
     * type("number%10")
     *
     * The parser will first encounter "number" (or "integer") and create a
     * numberNode at the root of the tree. Then, when it encounters the
     * modulo operator and validates that the next part of the expression is
     * also numeric, we add a new modulo constraint to the number node.
     */
    modulo: moduloConstraint | undefined = undefined

    constructor(
        private definition: string,
        private numericConstraints: numericConstraint[]
    ) {
        super()
    }

    toString() {
        let result = this.definition
        if (this.modulo) {
            result = `${result}%${this.modulo.value}`
        }
        if (this.bounds) {
            result = this.bounds.boundString(result)
        }
        return result
    }

    override get tree() {
        let result: StrNode = this.definition
        if (this.modulo) {
            result = [result, [["%", this.modulo.value]]]
        }
        if (this.bounds) {
            result = this.bounds.boundTree(result)
        }
        return result
    }

    check(args: Allows.Args) {
        if (typeof args.data !== "number") {
            args.diagnostics.push(
                new Allows.UnassignableDiagnostic(this.toString(), args)
            )
            return
        }
        for (const { allows, description } of this.numericConstraints) {
            if (!allows(args.data)) {
                args.diagnostics.push(
                    new NumberSubtypeDiagnostic(args, description)
                )
            }
        }
        // Add the actual moduloConstraint check here (should look very similar)
        this.bounds?.check(args as Allows.Args<number>)
    }

    create() {
        if (this.bounds || this.modulo) {
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

// Create a "ModuloDiagnostic" that moduloConstraint's check method will
// will throw, should look almost identical to below

export class NumberSubtypeDiagnostic extends Allows.Diagnostic<"NumberSubtype"> {
    message

    constructor(args: Allows.Args, public description: string) {
        super("NumberSubtype", args)
        this.message = `'${this.data}' must ${description}.`
    }
}
