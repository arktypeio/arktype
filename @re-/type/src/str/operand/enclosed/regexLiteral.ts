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
            args.diagnostics.push(
                new Node.Allows.UnassignableDiagnostic(args, this)
            )
            return false
        }
        if (!this.regex.test(args.value)) {
            args.diagnostics.push(new RegexMismatchDiagnostic(args, this))
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

export class RegexMismatchDiagnostic extends Node.Allows
    .Diagnostic<"RegexMismatch"> {
    readonly code = "RegexMismatch"

    get message() {
        return `'${this.data}' does not match expression ${this.type}.`
    }
}
