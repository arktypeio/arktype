import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"

export class BooleanNode extends Terminal.Node<"boolean"> {
    constructor() {
        super("boolean")
    }

    check(state: Check.State) {
        if (typeof state.data !== "boolean") {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be a boolean",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
