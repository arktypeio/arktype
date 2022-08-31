import { Node, terminalNode } from "../common.js"

export type RegexLiteralDefinition = `/${string}/`

export class RegexLiteralNode extends terminalNode<RegexLiteralDefinition> {
    private regex: RegExp

    constructor(def: RegexLiteralDefinition) {
        super(def)
        this.regex = new RegExp(def.slice(1, -1))
    }

    allows(args: Node.Allows.Args) {
        if (typeof args.value !== "string") {
            this.addUnassignable(args)
            return false
        }
        if (!this.regex.test(args.value)) {
            this.addAllowsError(args, "RegexMismatch", {
                message: `'${args.value}' does not match expression ${this.def}.`
            })
            return false
        }
        return true
    }

    create() {
        throw new Node.Create.UngeneratableError(
            this.def,
            "Regex generation is unsupported."
        )
    }
}

export type regexMismatchError = Node.Allows.ErrorData<"RegexMismatch", {}>
