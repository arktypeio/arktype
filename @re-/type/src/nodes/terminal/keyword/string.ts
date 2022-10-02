import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"

export class StringNode extends Terminal.Node<"string"> {
    constructor() {
        super("string")
    }

    check(state: Check.State) {
        if (typeof state.data !== "string") {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be a string",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
