import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../../traverse/check.js"
import { Terminal } from "../../terminal.js"

export class FunctionNode extends Terminal.Node<"Function"> {
    constructor() {
        super("Function")
    }

    check(state: Check.State) {
        if (typeof state.data !== "function") {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be a function",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
