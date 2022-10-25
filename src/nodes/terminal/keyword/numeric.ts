import type { Base } from "../../base/base.js"
import { Terminal } from "../terminal.js"

export namespace NumericKeyword {
    class IntegerNode extends Terminal.Node {
        readonly kind = "integerKeyword"
        readonly definition = "integer"
        readonly description = "an integer"

        addAttributes(attributes: Base.Attributes) {
            attributes.add("type", "number")
            attributes.add("divisor", 1)
        }
    }

    export const nodes = {
        integer: new IntegerNode()
    }
}
