import { TerminalNode } from "../../../../node/terminal.js"
import { Node } from "../../../common.js"

export type RegexLiteralDefinition = `/${string}/`

export class RegexLiteralNode extends TerminalNode<RegexLiteralDefinition> {
    private regex: RegExp

    constructor(def: RegexLiteralDefinition) {
        super(def)
        this.regex = new RegExp(def.slice(1, -1))
    }

    allows(args: Node.Allows.Args) {
        if (typeof args.value !== "string") {
            args.errors.add(
                "",
                `Non-string value ${Node.Utils.stringifyValue(
                    args.value
                )} cannot satisfy regex definitions.`
            )
            return false
        }
        if (!this.regex.test(args.value)) {
            args.errors.add(
                "",
                `${Node.Utils.stringifyValue(
                    args.value
                )} does not match expression ${this.def}.`
            )
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
