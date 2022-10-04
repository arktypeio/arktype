import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../../traverse/check.js"
import { Terminal } from "../../terminal.js"

export class SymbolNode extends Terminal.Node<"symbol"> {
    constructor() {
        super("symbol")
    }

    check(state: Check.State) {
        if (typeof state.data !== "symbol") {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be a symbol",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
