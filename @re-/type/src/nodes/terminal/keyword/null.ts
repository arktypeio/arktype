import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"

export class NullNode extends Terminal.Node<"null"> {
    constructor() {
        super("null")
    }

    check(state: Check.State) {
        if (state.data !== null) {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be null",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
