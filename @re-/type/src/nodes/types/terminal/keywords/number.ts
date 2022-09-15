import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { Allows } from "../../../traversal/allows.js"
import { terminalNode } from "../terminal.js"

export type NumberSubtypeKeyword = "integer"

export class numberNode extends terminalNode implements boundableNode {
    bounds: bounds | undefined = undefined

    constructor(private subtype?: NumberSubtypeKeyword) {
        super()
    }

    private baseToString() {
        return this.subtype ?? "number"
    }

    toString() {
        return this.bounds
            ? this.bounds.boundString(this.baseToString())
            : this.baseToString()
    }

    override get tree() {
        return this.bounds
            ? this.bounds.boundTree(this.baseToString())
            : this.baseToString()
    }

    check(args: Allows.Args) {
        if (typeof args.data !== "number") {
            args.diagnostics.push(
                new Allows.UnassignableDiagnostic(this.toString(), args)
            )
            return false
        }
        if (this.subtype === "integer" && !Number.isInteger(args.data)) {
            // TODO: real error
            return false
        }
        this.bounds?.check(args as Allows.Args<number>)
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
