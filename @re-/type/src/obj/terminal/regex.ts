import { Base } from "../../base/index.js"
import { TerminalNode } from "../node.js"

export class RegexNode extends TerminalNode<RegExp> {
    static matches(def: unknown): def is RegExp {
        return def instanceof RegExp
    }

    allows(args: Base.Validation.Args) {
        if (typeof args.value !== "string") {
            args.errors.add(
                "",
                `Non-string value ${Base.stringifyValue(
                    args.value
                )} cannot satisfy regex definitions.`
            )
            return false
        }
        if (!this.def.test(args.value)) {
            args.errors.add(
                "",
                `${Base.stringifyValue(
                    args.value
                )} does not match expression ${this.toString()}.`
            )
            return false
        }
        return true
    }

    generate() {
        throw new Base.Create.UngeneratableError(
            `/${this.def.source}/`,
            "Regex generation is unsupported."
        )
    }
}
