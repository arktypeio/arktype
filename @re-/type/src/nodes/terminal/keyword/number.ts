import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"

export class NumberNode extends Terminal.Node<"number"> {
    constructor() {
        super("number")
    }

    check(state: Check.State) {
        if (typeof state.data !== "number") {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be a number",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
